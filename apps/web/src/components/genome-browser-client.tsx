"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";

type Chromosome = { name: string; length: number };
type Feature = {
  seqid: string;
  type: string;
  start: number;
  end: number;
  strand: string;
  attributes: Record<string, string>;
};
type SearchHit = {
  chrom: string;
  start: number;
  end: number;
  type: string;
  geneId: string | null;
  transcriptId: string | null;
  geneName: string | null;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const TRACK_OPTIONS = [
  { label: "Gene", type: "gene" },
  { label: "mRNA", type: "transcript" },
  { label: "Exon", type: "exon" },
  { label: "CDS", type: "CDS" },
  { label: "snoRNA", type: "snoRNA" },
] as const;

const DEFAULT_TYPES = TRACK_OPTIONS.map((option) => option.type);
const MIN_WINDOW = 30;
const SEQUENCE_FETCH_MAX = 2000;
const FEATURE_SEQUENCE_MAX = 20000;
const BASE_PX = 8;

const BASE_CLASS: Record<string, string> = {
  A: "text-green-700",
  C: "text-blue-700",
  G: "text-amber-700",
  T: "text-red-700",
  U: "text-red-700",
};

export default function GenomeBrowserClient() {
  const searchParams = useSearchParams();
  const [chromosomes, setChromosomes] = useState<Chromosome[]>([]);
  const [chrom, setChrom] = useState("");
  const [start, setStart] = useState(1);
  const [end, setEnd] = useState(10000);
  const [search, setSearch] = useState("");
  const [features, setFeatures] = useState<Feature[]>([]);
  const [sequence, setSequence] = useState("");
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [selected, setSelected] = useState<Feature | null>(null);
  const [featureSequence, setFeatureSequence] = useState("");
  const [featureSequenceNote, setFeatureSequenceNote] = useState("");
  const [visibleTypes, setVisibleTypes] = useState<string[]>([...DEFAULT_TYPES]);
  const [trackWidth, setTrackWidth] = useState(800);
  const [selection, setSelection] = useState<{ left: number; width: number } | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number } | null>(null);

  const loadWindow = async (nextChrom: string, nextStart: number, nextEnd: number, searchTerm = search, types = visibleTypes) => {
    const span = Math.max(nextEnd - nextStart + 1, 1);
    const featuresPromise = fetch(
      `${API_BASE}/tools/genome-browser/features?chrom=${encodeURIComponent(nextChrom)}&start=${nextStart}&end=${nextEnd}&search=${encodeURIComponent(searchTerm)}&types=${encodeURIComponent(types.join(","))}`,
    );
    const sequencePromise =
      span <= SEQUENCE_FETCH_MAX
        ? fetch(`${API_BASE}/tools/genome-browser/sequence?chrom=${encodeURIComponent(nextChrom)}&start=${nextStart}&end=${nextEnd}`)
        : null;
    const [featuresRes, sequenceRes] = await Promise.all([featuresPromise, sequencePromise]);
    const featuresPayload = await featuresRes.json();
    setFeatures(featuresPayload.items ?? []);
    if (!sequenceRes) {
      setSequence("");
      return;
    }
    const sequencePayload = await sequenceRes.json();
    setSequence(sequencePayload.sequence ?? "");
  };

  useEffect(() => {
    const init = async () => {
      const response = await fetch(`${API_BASE}/tools/genome-browser/chromosomes`);
      const payload = await response.json();
      const items = (payload.items ?? []) as Chromosome[];
      setChromosomes(items);
      if (items.length === 0) return;

      const paramChrom = searchParams.get("chrom");
      const paramStart = Number(searchParams.get("start") ?? 0);
      const paramEnd = Number(searchParams.get("end") ?? 0);

      const targetChrom = (paramChrom ? items.find((item) => item.name === paramChrom) : undefined) ?? items[0];
      const nextStart = paramStart > 0 ? paramStart : 1;
      const defaultEnd = Math.min(10000, targetChrom.length);
      const nextEnd = paramEnd > 0 ? Math.min(paramEnd, targetChrom.length) : defaultEnd;

      setChrom(targetChrom.name);
      setStart(nextStart);
      setEnd(nextEnd);
      await loadWindow(targetChrom.name, nextStart, nextEnd, "");
    };
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const windowSize = Math.max(end - start + 1, 1);
  const rulerTicks = useMemo(
    () =>
      Array.from({ length: 11 }, (_, i) => {
        const value = start + Math.floor((windowSize * i) / 10);
        return { left: i * 10, value };
      }),
    [start, windowSize],
  );
  const tracks = useMemo(() => {
    const laneOrder = TRACK_OPTIONS.map((option) => option.type).filter((type) => visibleTypes.includes(type));
    const lanes = laneOrder.length > 0 ? laneOrder : ["gene"];
    const placed: Array<Feature & { left: number; width: number; lane: number }> = [];
    for (const feature of features) {
      const lane = lanes.indexOf(feature.type as (typeof lanes)[number]);
      if (lane < 0) continue;
      const left = ((feature.start - start) / windowSize) * 100;
      const width = ((feature.end - feature.start + 1) / windowSize) * 100;
      placed.push({
        ...feature,
        left: Math.max(0, Math.min(left, 100)),
        width: Math.max(0.5, Math.min(width, 100)),
        lane,
      });
    }
    return { placed, laneCount: lanes.length };
  }, [features, start, windowSize, visibleTypes]);

  const selectFeature = async (feature: Feature) => {
    setSelected(feature);
    const length = feature.end - feature.start + 1;
    const fetchEnd = feature.start + Math.min(length, FEATURE_SEQUENCE_MAX) - 1;
    const response = await fetch(
      `${API_BASE}/tools/genome-browser/sequence?chrom=${encodeURIComponent(feature.seqid)}&start=${feature.start}&end=${fetchEnd}`,
    );
    const payload = await response.json();
    setFeatureSequence(payload.sequence ?? "");
    setFeatureSequenceNote(
      length > FEATURE_SEQUENCE_MAX
        ? `Showing the first ${FEATURE_SEQUENCE_MAX.toLocaleString()} nt of ${length.toLocaleString()}.`
        : "",
    );
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setTrackWidth(el.clientWidth));
    observer.observe(el);
    setTrackWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  const showBases = sequence.length > 0 && trackWidth / windowSize >= BASE_PX;

  const applyWindow = async (nextStart: number, nextEnd: number, nextChrom = chrom) => {
    const selectedChrom = chromosomes.find((item) => item.name === nextChrom);
    if (!selectedChrom) return;
    let startPos = Math.max(1, nextStart);
    let endPos = Math.min(selectedChrom.length, nextEnd);
    if (endPos < startPos) endPos = startPos;
    let size = endPos - startPos + 1;
    if (size < MIN_WINDOW) {
      const center = Math.floor((startPos + endPos) / 2);
      startPos = Math.max(1, center - Math.floor(MIN_WINDOW / 2));
      endPos = Math.min(selectedChrom.length, startPos + MIN_WINDOW - 1);
      startPos = Math.max(1, endPos - MIN_WINDOW + 1);
    }
    setChrom(nextChrom);
    setStart(startPos);
    setEnd(endPos);
    await loadWindow(nextChrom, startPos, endPos);
  };

  const onSearch = async (event: FormEvent) => {
    event.preventDefault();
    if (!search.trim()) {
      setSearchHits([]);
      await loadWindow(chrom, start, end, "");
      return;
    }
    const response = await fetch(`${API_BASE}/tools/genome-browser/search?q=${encodeURIComponent(search)}`);
    const payload = await response.json();
    setSearchHits(payload.items ?? []);
    await loadWindow(chrom, start, end, search);
  };

  const jumpTo = async (nextChrom: string, center: number) => {
    const selectedChrom = chromosomes.find((item) => item.name === nextChrom);
    if (!selectedChrom) return;
    const half = Math.floor(windowSize / 2);
    const nextStart = Math.max(1, center - half);
    const nextEnd = Math.min(selectedChrom.length, nextStart + windowSize - 1);
    setChrom(nextChrom);
    setStart(nextStart);
    setEnd(nextEnd);
    await loadWindow(nextChrom, nextStart, nextEnd);
  };

  const zoom = async (factor: number) => {
    const selectedChrom = chromosomes.find((item) => item.name === chrom);
    if (!selectedChrom) return;
    const center = Math.floor((start + end) / 2);
    const nextSize = Math.max(MIN_WINDOW, Math.min(selectedChrom.length, Math.floor(windowSize * factor)));
    const nextStart = Math.max(1, center - Math.floor(nextSize / 2));
    const nextEnd = Math.min(selectedChrom.length, nextStart + nextSize - 1);
    await applyWindow(nextStart, nextEnd);
  };

  const pointerX = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(event.clientX - rect.left, rect.width));
  };

  const featureIndexAt = (clientX: number, clientY: number) => {
    const hit = document.elementFromPoint(clientX, clientY)?.closest("[data-feature-index]");
    if (!hit) return null;
    const index = Number(hit.getAttribute("data-feature-index"));
    return Number.isInteger(index) ? index : null;
  };

  const onTrackPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (featureIndexAt(event.clientX, event.clientY) != null) return;
    dragRef.current = { x: pointerX(event) };
    setSelection({ left: dragRef.current.x, width: 0 });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onTrackPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const x = pointerX(event);
    const left = Math.min(dragRef.current.x, x);
    setSelection({ left, width: Math.abs(x - dragRef.current.x) });
  };

  const onTrackPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const origin = dragRef.current;
    dragRef.current = null;
    setSelection(null);
    const index = featureIndexAt(event.clientX, event.clientY);
    if (!origin) {
      const feature = index == null ? undefined : tracks.placed[index];
      if (feature) void selectFeature(feature);
      return;
    }
    const widthPx = Math.abs(pointerX(event) - origin.x);
    if (widthPx < 6) {
      const feature = index == null ? undefined : tracks.placed[index];
      if (feature) void selectFeature(feature);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const left = Math.min(origin.x, pointerX(event));
    const right = left + widthPx;
    const gStart = start + Math.floor((left / rect.width) * windowSize);
    const gEnd = start + Math.ceil((right / rect.width) * windowSize) - 1;
    void applyWindow(gStart, gEnd);
  };

  return (
    <main className="mx-auto max-w-[96rem] space-y-4 p-6">
      <Link href="/" className="text-sm underline">
        Back to tools
      </Link>
      <h1 className="text-3xl font-bold">Genome Browser</h1>
      <p className="text-slate-600">UCSC-style genomic tracks from local GTF/FASTA annotations.</p>

      <form className="space-y-3" onSubmit={onSearch}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded border p-3"
          placeholder="Search by gene, transcript, or snoRNA id"
        />
        <div className="grid gap-3 md:grid-cols-4">
          <select
            className="rounded border p-2"
            value={chrom}
            onChange={async (event) => {
              const value = event.target.value;
              const selectedChrom = chromosomes.find((item) => item.name === value);
              if (!selectedChrom) return;
              const nextEnd = Math.min(selectedChrom.length, 10000);
              setChrom(value);
              setStart(1);
              setEnd(nextEnd);
              await loadWindow(value, 1, nextEnd);
            }}
          >
            {chromosomes.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
          <input type="number" className="rounded border p-2" value={start} onChange={(event) => setStart(Number(event.target.value))} />
          <input type="number" className="rounded border p-2" value={end} onChange={(event) => setEnd(Number(event.target.value))} />
          <button className="rounded bg-slate-900 px-3 py-2 text-white">Apply / Search</button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => void zoom(0.5)} className="rounded border px-3 py-1.5 text-sm">
          Zoom in 2×
        </button>
        <button onClick={() => void zoom(0.1)} className="rounded border px-3 py-1.5 text-sm">
          Zoom in 10×
        </button>
        <button onClick={() => void zoom(2)} className="rounded border px-3 py-1.5 text-sm">
          Zoom out 2×
        </button>
        <button onClick={() => void zoom(10)} className="rounded border px-3 py-1.5 text-sm">
          Zoom out 10×
        </button>
        <button
          onClick={() => {
            const selectedChrom = chromosomes.find((item) => item.name === chrom);
            if (!selectedChrom) return;
            void applyWindow(1, selectedChrom.length);
          }}
          className="rounded border px-3 py-1.5 text-sm"
        >
          Full chromosome
        </button>
        <button
          onClick={() => {
            void loadWindow(chrom, start, end);
          }}
          className="rounded border px-3 py-1.5 text-sm"
        >
          Refresh Window
        </button>
      </div>

      <section className="rounded-xl border bg-white p-4">
        <div className="mb-2 flex flex-wrap items-center gap-3 text-xs">
          {TRACK_OPTIONS.map((option) => (
            <label key={option.type} className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                checked={visibleTypes.includes(option.type)}
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...visibleTypes, option.type]
                    : visibleTypes.filter((type) => type !== option.type);
                  setVisibleTypes(next);
                  if (chrom) void loadWindow(chrom, start, end, search, next);
                }}
              />
              <i
                className={`h-2.5 w-2.5 rounded ${
                  option.type === "gene"
                    ? "bg-cyan-600"
                    : option.type === "transcript"
                      ? "bg-blue-600"
                      : option.type === "exon"
                        ? "bg-emerald-600"
                        : option.type === "CDS"
                          ? "bg-violet-600"
                          : "bg-amber-600"
                }`}
              />
              {option.label}
            </label>
          ))}
        </div>
        <p className="mb-1 text-sm text-slate-600">
          Coordinates: {chrom}:{start}-{end} ({windowSize.toLocaleString()} nt)
        </p>
        <p className="mb-2 text-xs text-slate-500">Drag across the tracks to zoom to that region.</p>
        <div className="relative mb-2 h-8 rounded border bg-slate-50">
          {rulerTicks.map((tick) => (
            <div key={tick.left} className="absolute top-0 h-full" style={{ left: `${tick.left}%` }}>
              <div className="h-3 border-l border-slate-400" />
              <span className="-translate-x-1/2 whitespace-nowrap text-[10px] text-slate-600">{tick.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
        {showBases ? (
          <div className="relative mb-2 h-6 overflow-hidden rounded border bg-white font-mono text-[11px] leading-6">
            {sequence.split("").map((base, index) => (
              <span
                key={`${start}-${index}`}
                className={`absolute top-0 text-center font-semibold ${BASE_CLASS[base.toUpperCase()] ?? "text-slate-600"}`}
                style={{ left: `${(index / windowSize) * 100}%`, width: `${(1 / windowSize) * 100}%` }}
              >
                {base.toUpperCase()}
              </span>
            ))}
          </div>
        ) : null}
        <div className="relative h-72 cursor-crosshair select-none overflow-hidden rounded border bg-slate-50">
        <div
          ref={trackRef}
          className="relative h-full"
          onPointerDown={onTrackPointerDown}
          onPointerMove={onTrackPointerMove}
          onPointerUp={onTrackPointerUp}
        >
          {Array.from({ length: tracks.laneCount }, (_, lane) => (
            <div
              key={lane}
              className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-slate-200"
              style={{ top: `${(lane / tracks.laneCount) * 100}%` }}
            />
          ))}
          {tracks.placed.map((feature, index) => (
            <button
              key={`${feature.seqid}-${feature.type}-${feature.start}-${feature.end}-${index}`}
              className={`absolute h-6 rounded px-1 text-[10px] text-white ${
                feature.type === "gene"
                  ? "bg-cyan-600"
                  : feature.type === "transcript"
                    ? "bg-blue-600"
                    : feature.type === "exon"
                      ? "bg-emerald-600"
                      : feature.type === "CDS"
                        ? "bg-violet-600"
                        : feature.type === "snoRNA"
                          ? "bg-amber-600"
                          : "bg-slate-600"
              }`}
              style={{
                left: `${feature.left}%`,
                width: `${feature.width}%`,
                top: `calc(${(feature.lane / tracks.laneCount) * 100}% + 6px)`,
              }}
              data-feature-index={index}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => {
                void selectFeature(feature);
              }}
              title={`${feature.type}: ${feature.attributes.gene_id ?? feature.attributes.transcript_id ?? ""} (${feature.strand})`}
            >
              {feature.width > 5
                ? `${feature.strand === "-" ? "\u2190" : "\u2192"} ${feature.attributes.gene_id ?? feature.attributes.transcript_id ?? feature.type}`
                : ""}
            </button>
          ))}
          {selection && selection.width > 0 ? (
            <div
              className="pointer-events-none absolute top-0 h-full bg-sky-400/30"
              style={{ left: selection.left, width: selection.width }}
            />
          ) : null}
        </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border bg-white p-4">
          <h2 className="mb-2 font-semibold">Feature details</h2>
          {selected ? (
            <div className="space-y-1 text-sm">
              <p>
                <b>Type:</b> {selected.type}
              </p>
              <p>
                <b>Location:</b> {selected.seqid}:{selected.start}-{selected.end} ({selected.strand})
              </p>
              <p>
                <b>Gene ID:</b> {selected.attributes.gene_id ?? "Not Known"}
              </p>
              <p>
                <b>Transcript ID:</b> {selected.attributes.transcript_id ?? "Not Known"}
              </p>
              <p>
                <b>Name:</b> {selected.attributes.gene_name ?? "Not Known"}
              </p>
              {selected.type === "snoRNA" ? (
                <p>
                  <b>Class:</b> {selected.attributes.snorna_class ?? "Not Known"}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Click a feature in tracks to inspect annotations.</p>
          )}
        </article>

        <article className="rounded-xl border bg-white p-4">
          <h2 className="mb-2 font-semibold">
            {selected
              ? `Sequence of ${selected.type} ${selected.seqid}:${selected.start}-${selected.end}`
              : "Sequence in current window"}
          </h2>
          {featureSequenceNote ? <p className="mb-2 text-xs text-slate-500">{featureSequenceNote}</p> : null}
          <pre className="max-h-72 overflow-auto rounded bg-slate-100 p-3 text-xs whitespace-pre-wrap break-all">
            {selected
              ? featureSequence || "No sequence loaded"
              : sequence ||
                (windowSize > SEQUENCE_FETCH_MAX
                  ? "Window is too wide to show bases. Zoom in to 2,000 nt or less, or click an annotation."
                  : "No sequence loaded")}
          </pre>
        </article>
      </section>

      {!!searchHits.length && (
        <section className="rounded-xl border bg-white p-4">
          <h2 className="mb-2 font-semibold">Search hits</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-left">Gene ID</th>
                  <th className="p-2 text-left">Transcript ID</th>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Location</th>
                </tr>
              </thead>
              <tbody>
                {searchHits.map((hit, index) => (
                  <tr key={`${hit.chrom}-${hit.start}-${hit.end}-${index}`} className="border-t">
                    <td className="p-2">{hit.type}</td>
                    <td className="p-2">{hit.geneId ?? "-"}</td>
                    <td className="p-2">{hit.transcriptId ?? "-"}</td>
                    <td className="p-2">{hit.geneName ?? "-"}</td>
                    <td className="p-2">
                      <button className="text-blue-700 underline" onClick={() => void jumpTo(hit.chrom, Math.floor((hit.start + hit.end) / 2))}>
                        {hit.chrom}:{hit.start}-{hit.end}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
