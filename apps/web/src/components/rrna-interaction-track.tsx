"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { PUBLIC_API_BASE } from "@/lib/api";
import type { InteractionDuplex, PairKind } from "@/components/snorna-rrna-duplex";

type MapGuide = {
  snornaId: string;
  type: string;
  modType: string | null;
  duplex: InteractionDuplex | null;
  note: string | null;
};

type MapSite = {
  position: number;
  base: string | null;
  modType: string | null;
  guides: MapGuide[];
};

type SubunitMap = {
  subunit: string;
  subunits: string[];
  siteCounts: Record<string, number>;
  sequence: string;
  sites: MapSite[];
};

type SegmentColumn = {
  rrnaPosition: number;
  snoBase: string;
  pair: PairKind;
  isModification: boolean;
};

type Segment = {
  key: string;
  snornaId: string;
  sitePosition: number;
  start: number;
  end: number;
  lane: number;
  title: string;
  columns: SegmentColumn[];
};

export type TrackFocus = { subunit: string; position: number; key: number };

const CELL = 16;
const PAD = 24;
const RULER_HEIGHT = 22;
const RRNA_HEIGHT = 24;
const LANE_HEIGHT = 46;
const LABEL_CHAR_WIDTH = 6;
const POPOVER_WIDTH = 288;
const CLOSE_DELAY = 150;

const PAIR_MARK: Record<PairKind, string> = {
  wc: "|",
  wobble: ":",
  mismatch: "·",
  unpaired: " ",
};

const PAIR_CLASS: Record<PairKind, string> = {
  wc: "text-slate-400",
  wobble: "text-amber-600",
  mismatch: "text-rose-600",
  unpaired: "text-slate-300",
};

function isPsi(modType: string | null): boolean {
  return (modType ?? "").toLowerCase() === "psi";
}

function siteGlyph(site: MapSite): string {
  if (isPsi(site.modType)) return "Ψ";
  return site.base ?? "N";
}

function siteLabel(site: MapSite, subunit: string): string {
  const fromDuplex = site.guides.find((guide) => guide.duplex)?.duplex?.modificationLabel;
  if (fromDuplex) return fromDuplex;
  if (isPsi(site.modType)) return `${subunit}-Ψ${site.position}`;
  if ((site.modType ?? "").toLowerCase() === "nm") return `${subunit}-${site.base ?? "N"}m${site.position}`;
  return `${subunit}-${site.base ?? "N"}${site.position}${site.modType ? ` (${site.modType})` : ""}`;
}

function xOf(position: number): number {
  return PAD + (position - 1) * CELL;
}

function buildSegments(sites: MapSite[]): { segments: Segment[]; laneCount: number } {
  const raw: Omit<Segment, "lane">[] = [];
  for (const site of sites) {
    for (const guide of site.guides) {
      if (!guide.duplex) continue;
      const columns: SegmentColumn[] = guide.duplex.columns
        .filter((column) => column.snoBase && column.rrnaPosition != null)
        .map((column) => ({
          rrnaPosition: column.rrnaPosition as number,
          snoBase: column.snoBase as string,
          pair: column.pair,
          isModification: column.isModification,
        }));
      if (!columns.length) continue;
      const positions = columns.map((column) => column.rrnaPosition);
      raw.push({
        key: `${guide.snornaId}:${site.position}`,
        snornaId: guide.snornaId,
        sitePosition: site.position,
        start: Math.min(...positions),
        end: Math.max(...positions),
        title: `${guide.snornaId} · ${guide.duplex.guideLabel} → ${guide.duplex.modificationLabel}`,
        columns,
      });
    }
  }

  raw.sort((a, b) => a.start - b.start || a.end - b.end);
  const laneEnds: number[] = [];
  const segments = raw.map((segment) => {
    const labelCells = Math.ceil((segment.snornaId.length * LABEL_CHAR_WIDTH + 4) / CELL);
    const occupiedEnd = Math.max(segment.end, segment.start + labelCells - 1);
    let lane = laneEnds.findIndex((end) => end < segment.start - 1);
    if (lane < 0) {
      lane = laneEnds.length;
      laneEnds.push(occupiedEnd);
    } else {
      laneEnds[lane] = occupiedEnd;
    }
    return { ...segment, lane };
  });
  return { segments, laneCount: laneEnds.length };
}

const RrnaBases = memo(function RrnaBases({ sequence, sitePositions }: { sequence: string; sitePositions: Set<number> }) {
  return (
    <div className="absolute flex" style={{ left: PAD, top: RULER_HEIGHT, height: RRNA_HEIGHT }}>
      {[...sequence].map((base, index) => (
        <span
          key={index}
          className={`text-center leading-6 ${sitePositions.has(index + 1) ? "invisible" : "text-slate-700"}`}
          style={{ width: CELL }}
        >
          {base}
        </span>
      ))}
    </div>
  );
});

const Ruler = memo(function Ruler({ length }: { length: number }) {
  const ticks: number[] = [1];
  for (let position = 10; position <= length; position += 10) ticks.push(position);
  return (
    <div className="absolute inset-x-0 top-0" style={{ height: RULER_HEIGHT }}>
      {ticks.map((position) => (
        <span
          key={position}
          className="absolute top-0 flex flex-col items-center text-[10px] leading-3 text-slate-400"
          style={{ left: xOf(position), width: CELL }}
        >
          <span className="whitespace-nowrap">{position}</span>
          <span className="h-2 w-px bg-slate-300" />
        </span>
      ))}
    </div>
  );
});

const LaneSegment = memo(function LaneSegment({
  segment,
  active,
  dimmed,
}: {
  segment: Segment;
  active: boolean;
  dimmed: boolean;
}) {
  return (
    <div
      className={`absolute rounded-sm border transition-opacity ${
        active ? "border-cyan-500 bg-cyan-50" : "border-sky-100 bg-sky-50/60"
      } ${dimmed ? "opacity-25" : ""}`}
      style={{
        left: xOf(segment.start),
        top: RULER_HEIGHT + RRNA_HEIGHT + segment.lane * LANE_HEIGHT + 2,
        width: (segment.end - segment.start + 1) * CELL,
        height: LANE_HEIGHT - 4,
      }}
      title={segment.title}
    >
      <span className="absolute left-0.5 top-0 whitespace-nowrap text-[10px] leading-3 text-sky-800">{segment.snornaId}</span>
      {segment.columns.map((column) => (
        <span
          key={column.rrnaPosition}
          className="absolute flex flex-col items-center leading-4"
          style={{ left: (column.rrnaPosition - segment.start) * CELL, top: 10, width: CELL }}
        >
          <span className={PAIR_CLASS[column.pair]}>{PAIR_MARK[column.pair]}</span>
          <span className={`${column.pair === "mismatch" ? "text-rose-600" : "text-sky-900"} ${column.isModification ? "font-bold" : ""}`}>
            {column.snoBase}
          </span>
        </span>
      ))}
    </div>
  );
});

export function RrnaInteractionTrack({
  species,
  subunit,
  focus,
  highlightSnornaId,
  onSubunitChange,
  onSelectSite,
}: {
  species: string;
  subunit: string;
  focus: TrackFocus | null;
  highlightSnornaId: string | null;
  onSubunitChange: (subunit: string) => void;
  onSelectSite?: (subunit: string, position: number) => void;
}) {
  const [data, setData] = useState<SubunitMap | null>(null);
  const [subunitOptions, setSubunitOptions] = useState<string[]>([]);
  const [siteCounts, setSiteCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hoverSite, setHoverSite] = useState<number | null>(null);
  const [pinnedSite, setPinnedSite] = useState<number | null>(null);
  const [popover, setPopover] = useState<{ position: number; left: number; top: number } | null>(null);
  const [flashPosition, setFlashPosition] = useState<number | null>(null);
  const [goTo, setGoTo] = useState("");

  const wrapperRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownRef = useRef<number | null>(null);
  const pinnedRef = useRef<number | null>(null);

  useEffect(() => {
    pinnedRef.current = pinnedSite;
  }, [pinnedSite]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError("");
      setHoverSite(null);
      setPinnedSite(null);
      setPopover(null);
      shownRef.current = null;
      try {
        const params = new URLSearchParams({ species });
        if (subunit) params.set("subunit", subunit);
        const res = await fetch(`${PUBLIC_API_BASE}/tools/interactions/map?${params}`, { signal: controller.signal });
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          setData(null);
          if (Array.isArray(body?.subunits)) setSubunitOptions(body.subunits);
          if (body?.siteCounts) setSiteCounts(body.siteCounts);
          throw new Error(body?.error ?? `Request failed (${res.status})`);
        }
        const map = body as SubunitMap;
        setData(map);
        setSubunitOptions(map.subunits);
        setSiteCounts(map.siteCounts);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Could not load the rRNA track");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [species, subunit]);

  const siteByPosition = useMemo(() => new Map((data?.sites ?? []).map((site) => [site.position, site])), [data]);
  const sitePositions = useMemo(() => new Set(siteByPosition.keys()), [siteByPosition]);
  const { segments, laneCount } = useMemo(() => buildSegments(data?.sites ?? []), [data]);
  const highlightedSites = useMemo(() => {
    if (!highlightSnornaId || !data) return new Set<number>();
    return new Set(
      data.sites.filter((site) => site.guides.some((guide) => guide.snornaId === highlightSnornaId)).map((site) => site.position),
    );
  }, [data, highlightSnornaId]);

  const shownSite = hoverSite ?? pinnedSite;
  const length = data?.sequence.length ?? 0;
  const canvasWidth = PAD * 2 + length * CELL;
  const canvasHeight = RULER_HEIGHT + RRNA_HEIGHT + Math.max(laneCount, 1) * LANE_HEIGHT + 8;

  const placePopover = useCallback((position: number | null) => {
    shownRef.current = position;
    const wrapper = wrapperRef.current;
    const scroller = scrollRef.current;
    if (position == null || !wrapper || !scroller) {
      setPopover(null);
      return;
    }
    const element = scroller.querySelector<HTMLElement>(`[data-site="${position}"]`);
    if (!element) {
      setPopover(null);
      return;
    }
    const rect = element.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    const scrollRect = scroller.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    if (center < scrollRect.left || center > scrollRect.right) {
      setPopover(null);
      return;
    }
    const half = POPOVER_WIDTH / 2;
    const left = Math.min(Math.max(center - wrapperRect.left, half), Math.max(wrapperRect.width - half, half));
    setPopover({ position, left, top: rect.top - wrapperRect.top - 6 });
  }, []);

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };

  const openHover = (position: number) => {
    cancelClose();
    setHoverSite(position);
    placePopover(position);
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      setHoverSite(null);
      placePopover(pinnedRef.current);
    }, CLOSE_DELAY);
  };

  const flash = (position: number) => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlashPosition(position);
    flashTimer.current = setTimeout(() => setFlashPosition(null), 1500);
  };

  const scrollToPosition = useCallback((position: number, smooth = true) => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const left = xOf(position) + CELL / 2 - scroller.clientWidth / 2;
    scroller.scrollTo({ left: Math.max(left, 0), behavior: smooth ? "smooth" : "auto" });
  }, []);

  const pinSite = (position: number) => {
    cancelClose();
    setHoverSite(null);
    setPinnedSite(position);
    scrollToPosition(position);
    requestAnimationFrame(() => placePopover(position));
  };

  useEffect(() => {
    if (!focus || !data || focus.subunit !== data.subunit) return;
    const position = Math.min(Math.max(focus.position, 1), data.sequence.length);
    const frame = requestAnimationFrame(() => {
      scrollToPosition(position, false);
      setHoverSite(null);
      flash(position);
      if (siteByPosition.has(position)) {
        setPinnedSite(position);
        requestAnimationFrame(() => placePopover(position));
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [focus, data, siteByPosition, scrollToPosition, placePopover]);

  useEffect(() => {
    const reposition = () => placePopover(shownRef.current);
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
  }, [placePopover]);

  useEffect(() => {
    if (pinnedSite == null) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (popoverRef.current?.contains(target)) return;
      if (target?.closest("[data-site]") || target?.closest("[data-site-chip]")) return;
      setPinnedSite(null);
      if (hoverSite == null) placePopover(null);
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPinnedSite(null);
      setHoverSite(null);
      placePopover(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [pinnedSite, hoverSite, placePopover]);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  const scrollByPage = (direction: -1 | 1) => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    scroller.scrollBy({ left: direction * scroller.clientWidth * 0.8, behavior: "smooth" });
  };

  const centerPosition = () => {
    const scroller = scrollRef.current;
    if (!scroller) return 1;
    return (scroller.scrollLeft + scroller.clientWidth / 2 - PAD) / CELL + 1;
  };

  const stepSite = (direction: -1 | 1) => {
    if (!data?.sites.length) return;
    const reference = pinnedSite ?? centerPosition();
    const target = direction > 0
      ? data.sites.find((site) => site.position > reference + 0.5)
      : [...data.sites].reverse().find((site) => site.position < reference - 0.5);
    if (target) pinSite(target.position);
  };

  const submitGoTo = () => {
    if (!data) return;
    const value = Number(goTo);
    if (!Number.isFinite(value)) return;
    const position = Math.min(Math.max(Math.round(value), 1), data.sequence.length);
    scrollToPosition(position);
    flash(position);
    if (siteByPosition.has(position)) pinSite(position);
  };

  const onTrackKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const step = event.shiftKey ? scroller.clientWidth * 0.8 : CELL * 10;
      scroller.scrollBy({ left: event.key === "ArrowLeft" ? -step : step });
    } else if (event.key === "Home") {
      event.preventDefault();
      scroller.scrollTo({ left: 0 });
    } else if (event.key === "End") {
      event.preventDefault();
      scroller.scrollTo({ left: scroller.scrollWidth });
    }
  };

  const shown = shownSite != null ? siteByPosition.get(shownSite) ?? null : null;
  const currentSubunit = data?.subunit ?? subunit;

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-semibold">rRNA sequence with snoRNA guides</h2>
          <p className="text-sm text-slate-500">
            {data
              ? `${data.subunit} · ${data.sequence.length.toLocaleString()} nt · ${data.sites.length} modification site${data.sites.length === 1 ? "" : "s"}`
              : "Pick an rRNA subunit to see its modification sites."}
          </p>
        </div>
        <label className="text-sm">
          <span className="mr-2 font-medium">Subunit</span>
          <select
            className="rounded-lg border px-3 py-2 text-sm"
            value={currentSubunit}
            onChange={(event) => onSubunitChange(event.target.value)}
            disabled={!subunitOptions.length}
          >
            {!subunitOptions.includes(currentSubunit) && currentSubunit ? <option value={currentSubunit}>{currentSubunit}</option> : null}
            {subunitOptions.map((option) => (
              <option key={option} value={option}>
                {option}{siteCounts[option] ? ` (${siteCounts[option]} sites)` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <button type="button" onClick={() => scrollByPage(-1)} disabled={!data} className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 hover:bg-slate-50 disabled:opacity-50" aria-label="Scroll left">
          <ChevronLeft className="h-4 w-4" /> Left
        </button>
        <button type="button" onClick={() => scrollByPage(1)} disabled={!data} className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 hover:bg-slate-50 disabled:opacity-50" aria-label="Scroll right">
          Right <ChevronRight className="h-4 w-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <button type="button" onClick={() => stepSite(-1)} disabled={!data?.sites.length} className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 hover:bg-slate-50 disabled:opacity-50">
          <ChevronsLeft className="h-4 w-4" /> Previous modification
        </button>
        <button type="button" onClick={() => stepSite(1)} disabled={!data?.sites.length} className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 hover:bg-slate-50 disabled:opacity-50">
          Next modification <ChevronsRight className="h-4 w-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <form
          className="flex items-center gap-1"
          onSubmit={(event) => {
            event.preventDefault();
            submitGoTo();
          }}
        >
          <input
            type="number"
            min={1}
            max={length || undefined}
            value={goTo}
            onChange={(event) => setGoTo(event.target.value)}
            placeholder="Position"
            className="w-24 rounded-lg border px-2 py-1"
            aria-label="Go to position"
          />
          <button type="submit" disabled={!data} className="rounded-lg border px-2 py-1 hover:bg-slate-50 disabled:opacity-50">Go</button>
        </form>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {loading && !data ? <p className="mt-3 text-sm text-slate-500">Loading rRNA track…</p> : null}

      {data ? (
        <div ref={wrapperRef} className={`relative mt-3 ${loading ? "opacity-60" : ""}`}>
          <div
            ref={scrollRef}
            tabIndex={0}
            onKeyDown={onTrackKeyDown}
            onScroll={() => placePopover(shownRef.current)}
            className="overflow-x-auto overflow-y-hidden rounded-xl bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-600"
            aria-label={`${data.subunit} rRNA sequence. Use arrow keys to scroll.`}
          >
            <div className="relative font-mono text-sm" style={{ width: canvasWidth, height: canvasHeight }}>
              <Ruler length={length} />
              <span className="absolute text-[10px] leading-6 text-slate-400" style={{ left: 4, top: RULER_HEIGHT }}>5′</span>
              <span className="absolute text-[10px] leading-6 text-slate-400" style={{ left: xOf(length + 1) + 4, top: RULER_HEIGHT }}>3′</span>
              <RrnaBases sequence={data.sequence} sitePositions={sitePositions} />
              {flashPosition != null && !sitePositions.has(flashPosition) ? (
                <span
                  className="pointer-events-none absolute rounded-sm ring-2 ring-cyan-500"
                  style={{ left: xOf(flashPosition), top: RULER_HEIGHT, width: CELL, height: RRNA_HEIGHT }}
                />
              ) : null}
              {data.sites.map((site) => {
                const isShown = shownSite === site.position;
                const isFlash = flashPosition === site.position;
                const inHighlight = highlightedSites.has(site.position);
                const dimmed = highlightSnornaId != null && !inHighlight;
                return (
                  <button
                    key={site.position}
                    type="button"
                    data-site={site.position}
                    className={`absolute rounded-sm text-center font-extrabold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-600 ${
                      dimmed ? "bg-red-50 text-red-400" : "bg-red-100 text-red-600"
                    } ${isShown || isFlash ? "ring-2 ring-red-500" : inHighlight ? "ring-2 ring-cyan-500" : ""}`}
                    style={{ left: xOf(site.position), top: RULER_HEIGHT, width: CELL, height: RRNA_HEIGHT }}
                    aria-label={`${siteLabel(site, data.subunit)}, guided by ${site.guides.map((guide) => guide.snornaId).join(", ") || "unknown snoRNA"}`}
                    onMouseEnter={() => openHover(site.position)}
                    onMouseLeave={scheduleClose}
                    onFocus={() => openHover(site.position)}
                    onBlur={scheduleClose}
                    onClick={() => {
                      pinSite(site.position);
                      onSelectSite?.(data.subunit, site.position);
                    }}
                  >
                    {siteGlyph(site)}
                  </button>
                );
              })}
              {segments.map((segment) => (
                <LaneSegment
                  key={segment.key}
                  segment={segment}
                  active={shownSite === segment.sitePosition}
                  dimmed={highlightSnornaId != null && segment.snornaId !== highlightSnornaId}
                />
              ))}
              {!segments.length ? (
                <span className="absolute text-xs text-slate-400" style={{ left: PAD, top: RULER_HEIGHT + RRNA_HEIGHT + 12 }}>
                  No snoRNA guide pairing could be drawn for this subunit.
                </span>
              ) : null}
            </div>
          </div>

          {shown && popover && popover.position === shown.position ? (
            <div
              ref={popoverRef}
              role="dialog"
              aria-label={`Guides for ${siteLabel(shown, data.subunit)}`}
              className="absolute z-20 rounded-xl border bg-white p-3 text-sm shadow-lg"
              style={{ left: popover.left, top: popover.top, width: POPOVER_WIDTH, transform: "translate(-50%, -100%)" }}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            >
              <p className="font-semibold text-red-600">{siteLabel(shown, data.subunit)}</p>
              <p className="text-xs text-slate-500">
                Guided by {shown.guides.length} snoRNA{shown.guides.length === 1 ? "" : "s"}
              </p>
              <ul className="mt-2 space-y-2">
                {shown.guides.map((guide) => (
                  <li key={guide.snornaId} className={`rounded-lg border px-2 py-1 ${guide.snornaId === highlightSnornaId ? "border-cyan-400 bg-cyan-50" : ""}`}>
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/snorna/${guide.snornaId}`} className="font-medium text-blue-700 underline">{guide.snornaId}</Link>
                      <span className="text-xs text-slate-500">{guide.type}{guide.modType ? ` · ${guide.modType}` : ""}</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      {guide.duplex ? `${guide.duplex.guideLabel}${guide.duplex.note ? ` · ${guide.duplex.note}` : ""}` : guide.note ?? "Pairing not drawn."}
                    </p>
                  </li>
                ))}
              </ul>
              {onSelectSite ? (
                <button
                  type="button"
                  className="mt-2 w-full rounded-lg bg-cyan-600 px-2 py-1 text-xs text-white hover:bg-cyan-700"
                  onClick={() => onSelectSite(data.subunit, shown.position)}
                >
                  Show base pairing below
                </button>
              ) : null}
            </div>
          ) : null}

          <p className="mt-2 text-[11px] text-slate-500">
            Top: rRNA, 5′ to 3′. Below: snoRNA guides, read 3′ to 5′ because the strands are antiparallel. Scroll with the buttons, the scrollbar, Shift + mouse wheel, or the arrow keys.
          </p>
        </div>
      ) : null}

      {data?.sites.length ? (
        <div className="mt-3">
          <p className="text-xs font-medium text-slate-600">All modification sites</p>
          <div className="mt-1 flex max-h-28 flex-wrap gap-1 overflow-y-auto">
            {data.sites.map((site) => (
              <button
                key={site.position}
                type="button"
                data-site-chip
                onClick={() => pinSite(site.position)}
                className={`rounded px-1.5 py-0.5 font-mono text-xs ${
                  shownSite === site.position
                    ? "bg-red-600 text-white"
                    : highlightedSites.has(site.position)
                      ? "bg-cyan-100 text-cyan-900 hover:bg-cyan-200"
                      : "bg-red-50 text-red-700 hover:bg-red-100"
                }`}
                title={site.guides.map((guide) => guide.snornaId).join(", ")}
              >
                {siteGlyph(site)}{site.position}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        <li><span className="rounded bg-red-100 px-1 font-mono font-extrabold text-red-600">N</span> modification site (hover for guiding snoRNAs)</li>
        <li><span className="font-mono text-slate-400">|</span> Watson–Crick</li>
        <li><span className="font-mono text-amber-600">:</span> G–U wobble</li>
        <li><span className="font-mono text-rose-600">·</span> mismatch</li>
      </ul>
    </section>
  );
}
