"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    molstar?: {
      Viewer: {
        new (container: HTMLElement, options?: Record<string, unknown>): {
          loadStructureFromUrl: (url: string, format: string, isBinary: boolean) => Promise<void>;
        };
      } | ((container: HTMLElement, options?: Record<string, unknown>) => {
        loadStructureFromUrl: (url: string, format: string, isBinary: boolean) => Promise<void>;
      });
    };
  }
}

const MOLSTAR_JS = "https://unpkg.com/molstar/build/viewer/molstar.js";
const MOLSTAR_CSS = "https://unpkg.com/molstar/build/viewer/molstar.css";

const ensureStylesheet = () => {
  if (document.querySelector(`link[data-molstar="true"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = MOLSTAR_CSS;
  link.setAttribute("data-molstar", "true");
  document.head.appendChild(link);
};

const ensureScript = async () => {
  if (window.molstar?.Viewer) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[data-molstar="true"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Mol* script")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = MOLSTAR_JS;
    script.async = true;
    script.setAttribute("data-molstar", "true");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Mol* script"));
    document.body.appendChild(script);
  });
};

type ViewerOptions = {
  layoutIsExpanded: boolean;
  layoutShowControls: boolean;
  layoutShowLeftPanel: boolean;
  viewportShowExpand: boolean;
};

type ViewerInstance = {
  loadStructureFromUrl: (url: string, format: string, isBinary: boolean) => Promise<void>;
};

export function Rrna3DMolstar({ cifUrl }: { cifUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [useFallbackViewer, setUseFallbackViewer] = useState(false);

  useEffect(() => {
    let disposed = false;
    let mountedContainer: HTMLDivElement | null = null;

    const run = async () => {
      try {
        ensureStylesheet();
        await ensureScript();
        if (!window.molstar?.Viewer) {
          throw new Error("Mol* viewer is not available");
        }
        const container = containerRef.current;
        if (!container || disposed) return;
        mountedContainer = container;
        container.innerHTML = "";
        const viewerCtor = window.molstar.Viewer as unknown;
        const options: ViewerOptions = {
          layoutIsExpanded: true,
          layoutShowControls: true,
          layoutShowLeftPanel: true,
          viewportShowExpand: false,
        };
        const viewerConstructor = viewerCtor as unknown as new (container: HTMLElement, options?: ViewerOptions) => ViewerInstance;
        const viewerFactory = viewerCtor as unknown as (container: HTMLElement, options?: ViewerOptions) => ViewerInstance;
        let viewer: ViewerInstance;
        try {
          viewer = new viewerConstructor(container, options);
        } catch {
          viewer = viewerFactory(container, options);
        }
        if (!viewer || typeof viewer.loadStructureFromUrl !== "function") {
          throw new Error("Mol* viewer API unavailable");
        }
        try {
          await viewer.loadStructureFromUrl(cifUrl, "mmcif", false);
        } catch {
          await viewer.loadStructureFromUrl(cifUrl, "cif", false);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load 3D viewer");
        setUseFallbackViewer(true);
      }
    };

    void run();

    return () => {
      disposed = true;
      const container = mountedContainer;
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [cifUrl]);

  if (error) {
    return (
      <div className="space-y-1">
        <p className="text-sm text-red-700">3D viewer failed to load: {error}</p>
        {useFallbackViewer && (
          <iframe
            title="RCSB 8OVA 3D fallback"
            src="https://www.rcsb.org/3d-view/8OVA/1"
            className="h-[calc(100vh-96px)] min-h-[860px] w-full"
          />
        )}
      </div>
    );
  }

  return <div ref={containerRef} className="h-[calc(100vh-96px)] min-h-[860px] w-full overflow-hidden" />;
}
