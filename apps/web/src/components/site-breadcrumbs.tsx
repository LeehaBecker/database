"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { prettyOrganismName } from "@/lib/site-config";

const LABELS: Record<string, string> = {
  organisms: "Organisms",
  snorna: "snoRNA",
  rrna: "rRNA",
  chimera: "Chimera",
  "snorna-clusters": "snoRNA Clusters",
  "genome-reference": "Genome Reference",
  "secondary-structure": "Secondary Structure",
  "3d-structure": "3D Structure",
  modifications: "Modifications",
  sequence: "Sequence",
  "snorna-mrna": "snoRNA–mRNA",
  "snorna-rrna": "snoRNA–rRNA",
  tools: "Tools",
  blast: "BLAST",
  "genome-browser": "Genome Browser",
  interactions: "Interactions",
  homologs: "Homolog Explorer",
  "fasta-fetch": "FASTA Fetch",
  "motif-search": "Motif Search",
  "coordinate-converter": "Coordinate Converter",
  about: "About",
  help: "Help",
  cite: "Cite",
  downloads: "Downloads",
  "api-docs": "API Docs",
  articles: "Articles",
  libraries: "Libraries",
  search: "Search",
};

export function SiteBreadcrumbs() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Array<{ href: string; label: string }> = [{ href: "/", label: "Home" }];

  let path = "";
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    path += `/${segment}`;

    if (segment === "organisms" && segments[i + 1]) continue;

    let label = LABELS[segment] ?? segment;
    if (segments[i - 1] === "organisms") {
      label = prettyOrganismName(segment);
    } else if (segments[i - 1] === "snorna" && segment !== "snorna") {
      label = segment;
    }

    crumbs.push({ href: path, label });
  }

  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-4 pt-4 text-sm text-slate-600 lg:px-6">
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex items-center gap-1">
            {index > 0 && <span className="text-slate-400">/</span>}
            {index === crumbs.length - 1 ? (
              <span className="font-medium text-slate-900">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="hover:text-cyan-700 hover:underline">
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mx-auto max-w-7xl px-4 py-6 lg:px-6 ${className}`}>
      {children}
    </div>
  );
}
