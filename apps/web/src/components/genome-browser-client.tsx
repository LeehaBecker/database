"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

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

  const loadWindow = async (nextChrom: string, nextStart: number, nextEnd: number, searchTerm = search) => {
    const [featuresRes, sequenceRes] = await Promise.all([
      fetch(
        `${API_BASE}/tools/genome-browser/features?chrom=${encodeURIComponent(nextChrom)}&start=${nextStart}&end=${nextEnd}&search=${encodeURIComponent(searchTerm)}`,
      ),
      fetch(`${API_BASE}/tools/genome-browser/sequence?chrom=${encodeURIComponent(nextChrom)}&start=${nextStart}&end=${nextEnd}`),
    ]);
    const featuresPayload = await featuresRes.json();
    const sequencePayload = await sequenceRes.json();
    setFeatures(featuresPayload.items ?? []);
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
    const base = { gene: 0, transcript: 1, exon: 2, CDS: 3 } as Record<string, number>;
    return features.map((feature) => {
      const left = ((feature.start - start) / windowSize) * 100;
      const width = ((feature.end - feature.start + 1) / windowSize) * 100;
      return {
        ...feature,
        left: Math.max(0, Math.min(left, 100)),
        width: Math.max(0.5, Math.min(width, 100)),
        lane: base[feature.type] ?? 4,
      };
    });
  }, [features, start, windowSize]);

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
    const nextSize = Math.max(200, Math.min(selectedChrom.length, Math.floor(windowSize * factor)));
    const nextStart = Math.max(1, center - Math.floor(nextSize / 2));
    const nextEnd = Math.min(selectedChrom.length, nextStart + nextSize - 1);
    setStart(nextStart);
    setEnd(nextEnd);
    await loadWindow(chrom, nextStart, nextEnd);
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
          placeholder="Search by gene/transcript ID, name, feature type"
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
          Zoom In
        </button>
        <button onClick={() => void zoom(2)} className="rounded border px-3 py-1.5 text-sm">
          Zoom Out
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
          <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded bg-cyan-600" /> Gene</span>
          <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded bg-blue-600" /> Transcript</span>
          <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded bg-emerald-600" /> Exon</span>
          <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded bg-violet-600" /> CDS</span>
          <span className="text-slate-500">Lane order: gene → transcript → exon → CDS</span>
        </div>
        <p className="mb-2 text-sm text-slate-600">
          Coordinates: {chrom}:{start}-{end} ({windowSize.toLocaleString()} nt)
        </p>
        <div className="relative mb-2 h-8 rounded border bg-slate-50">
          {rulerTicks.map((tick) => (
            <div key={tick.left} className="absolute top-0 h-full" style={{ left: `${tick.left}%` }}>
              <div className="h-3 border-l border-slate-400" />
              <span className="-translate-x-1/2 whitespace-nowrap text-[10px] text-slate-600">{tick.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="relative h-64 overflow-hidden rounded border bg-slate-50">
          {[0, 1, 2, 3, 4].map((lane) => (
            <div key={lane} className="absolute left-0 right-0 border-t border-dashed border-slate-200" style={{ top: `${lane * 20 + 16}%` }} />
          ))}
          {tracks.map((feature, index) => (
            <button
              key={`${feature.seqid}-${feature.start}-${feature.end}-${index}`}
              className={`absolute h-6 rounded px-1 text-[10px] text-white ${
                feature.type === "gene"
                  ? "bg-cyan-600"
                  : feature.type === "transcript"
                    ? "bg-blue-600"
                    : feature.type === "exon"
                      ? "bg-emerald-600"
                      : feature.type === "CDS"
                        ? "bg-violet-600"
                        : "bg-slate-600"
              }`}
              style={{ left: `${feature.left}%`, width: `${feature.width}%`, top: `${feature.lane * 20 + 12}%` }}
              onClick={() => setSelected(feature)}
              title={`${feature.type}: ${feature.attributes.gene_id ?? feature.attributes.transcript_id ?? ""} (${feature.strand})`}
            >
              {feature.width > 5
                ? `${feature.strand === "-" ? "\u2190" : "\u2192"} ${feature.attributes.gene_id ?? feature.attributes.transcript_id ?? feature.type}`
                : ""}
            </button>
          ))}
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
            </div>
          ) : (
            <p className="text-sm text-slate-500">Click a feature in tracks to inspect annotations.</p>
          )}
        </article>

        <article className="rounded-xl border bg-white p-4">
          <h2 className="mb-2 font-semibold">Sequence in current window</h2>
          <pre className="max-h-72 overflow-auto rounded bg-slate-100 p-3 text-xs whitespace-pre-wrap break-all">
            {sequence || "No sequence loaded"}
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
