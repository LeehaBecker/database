"use client";

import Link from "next/link";

export type BlastAlignmentSegment = {
  queryStart: number;
  queryEnd: number;
  querySeq: string;
  matchLine: string;
  subjectStart: number;
  subjectEnd: number;
  subjectSeq: string;
};

export type BlastHit = {
  subjectId: string;
  subjectTitle: string;
  subjectLength: number;
  source?: string;
  identityPct: number;
  alignmentLength: number;
  identities: number;
  gapColumns: number;
  eValue: string;
  bitScore: number;
  queryStrand: "Plus" | "Minus";
  subjectStrand: "Plus" | "Minus";
  start: number;
  end: number;
  segments: BlastAlignmentSegment[];
  genomeBrowserUrl?: string;
};

function formatEvalue(eValue: string): string {
  const value = Number(eValue);
  if (!Number.isFinite(value)) return eValue;
  if (value === 0) return "0";
  if (value < 0.001) return value.toExponential(0).replace("e", "e");
  return value.toString();
}

function padPosition(value: number, width = 12): string {
  return value.toLocaleString().padStart(width);
}

function AlignmentSegment({ segment }: { segment: BlastAlignmentSegment }) {
  const posWidth = Math.max(
    12,
    String(segment.queryStart).length,
    String(segment.queryEnd).length,
    padPosition(segment.subjectStart).trim().length,
    padPosition(segment.subjectEnd).trim().length,
  );

  return (
    <div
      className="grid items-baseline gap-x-2 font-mono text-xs leading-relaxed text-slate-900"
      style={{ gridTemplateColumns: `4.5rem ${posWidth}ch 1fr ${posWidth}ch` }}
    >
      <span>Query</span>
      <span className="text-right tabular-nums">{segment.queryStart}</span>
      <span className="break-all">{segment.querySeq}</span>
      <span className="text-right tabular-nums">{segment.queryEnd}</span>

      <span aria-hidden="true" />
      <span aria-hidden="true" />
      <span className="break-all">{segment.matchLine}</span>
      <span aria-hidden="true" />

      <span>Sbjct</span>
      <span className="text-right tabular-nums">{padPosition(segment.subjectStart, posWidth)}</span>
      <span className="break-all">{segment.subjectSeq}</span>
      <span className="text-right tabular-nums">{padPosition(segment.subjectEnd, posWidth)}</span>
    </div>
  );
}

function AlignmentBlock({ hit }: { hit: BlastHit }) {
  const gapPct = hit.alignmentLength > 0 ? ((hit.gapColumns / hit.alignmentLength) * 100).toFixed(0) : "0";

  return (
    <article className="rounded-xl border bg-white p-4">
      <header className="mb-3 space-y-1 font-mono text-sm">
        <p className="font-semibold text-slate-900">{hit.subjectTitle}</p>
        <p className="text-slate-600">Length={hit.subjectLength.toLocaleString()}</p>
        {hit.bitScore > 0 ? (
          <p>
            Score = {Math.round(hit.bitScore)} bits, Expect = {formatEvalue(hit.eValue)}
          </p>
        ) : (
          <p>Expect = {formatEvalue(hit.eValue)} (exact match)</p>
        )}
        <p>
          Identities = {hit.identities}/{hit.alignmentLength} ({hit.identityPct.toFixed(0)}%), Gaps = {hit.gapColumns}/
          {hit.alignmentLength} ({gapPct}%)
        </p>
        <div className="flex flex-wrap items-center gap-3 text-slate-700">
          {hit.genomeBrowserUrl && (
            <Link href={hit.genomeBrowserUrl} className="text-blue-700 underline">
              Link to Genome Browser
            </Link>
          )}
          <span>
            Strand = {hit.queryStrand}/{hit.subjectStrand}
          </span>
        </div>
      </header>

      <div className="space-y-4 overflow-x-auto rounded bg-slate-50 p-3">
        {hit.segments.map((segment, index) => (
          <AlignmentSegment key={index} segment={segment} />
        ))}
      </div>
    </article>
  );
}

type BlastAlignmentViewProps = {
  hits: BlastHit[];
  mode: string;
};

export function BlastAlignmentView({ hits, mode }: BlastAlignmentViewProps) {
  if (!hits.length) {
    return (
      <section className="rounded-xl border bg-white p-4">
        <p className="text-sm text-slate-500">No hits found.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Pairwise alignments</h2>
      {mode === "fallback-exact-match" && (
        <p className="text-sm text-amber-700">
          BLAST+ unavailable — showing exact substring matches only (100% identity, no mismatches).
        </p>
      )}
      {hits.map((hit, index) => (
        <AlignmentBlock key={`${hit.subjectId}-${hit.start}-${hit.end}-${index}`} hit={hit} />
      ))}
    </section>
  );
}

export function BlastSummaryTable({ hits }: { hits: BlastHit[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[900px] w-full text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="p-2 text-left">Subject</th>
            <th className="p-2 text-left">Identity %</th>
            <th className="p-2 text-left">Length</th>
            <th className="p-2 text-left">E-value</th>
            <th className="p-2 text-left">Start</th>
            <th className="p-2 text-left">End</th>
            <th className="p-2 text-left">Source</th>
          </tr>
        </thead>
        <tbody>
          {hits.map((hit, index) => (
            <tr key={`${hit.subjectId}-${index}`} className="border-t">
              <td className="p-2">{hit.subjectId}</td>
              <td className="p-2">{hit.identityPct}</td>
              <td className="p-2">{hit.alignmentLength}</td>
              <td className="p-2">{formatEvalue(hit.eValue)}</td>
              <td className="p-2">{hit.start.toLocaleString()}</td>
              <td className="p-2">{hit.end.toLocaleString()}</td>
              <td className="p-2">{hit.source ?? "-"}</td>
            </tr>
          ))}
          {!hits.length && (
            <tr>
              <td colSpan={7} className="p-3 text-slate-500">
                No hits found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
