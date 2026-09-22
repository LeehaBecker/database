"use client";

import Link from "next/link";
import { AlignmentSegment, type BlastAlignmentSegment } from "@/components/blast-alignment-view";

export type HomologCompareResult = {
  tb: {
    snornaId: string;
    sequence: string;
    type: string;
    length: number;
    organism: string;
  };
  lm: {
    snornaId: string;
    sequence: string;
    type: string;
    length: number;
    organism: string;
  };
  identity: number;
  identities: number;
  alignmentLength: number;
  gapColumns: number;
  segments: BlastAlignmentSegment[];
};

export function HomologCompareView({ data }: { data: HomologCompareResult }) {
  const gapPct = data.alignmentLength > 0 ? ((data.gapColumns / data.alignmentLength) * 100).toFixed(0) : "0";

  return (
    <article className="rounded-xl border bg-white p-4">
      <header className="mb-3 space-y-1 font-mono text-sm">
        <p className="font-semibold text-slate-900">
          <Link href={`/snorna/${data.tb.snornaId}`} className="text-cyan-800 underline">
            {data.tb.snornaId}
          </Link>
          {" vs "}
          <Link href={`/snorna/${data.lm.snornaId}`} className="text-emerald-800 underline">
            {data.lm.snornaId}
          </Link>
        </p>
        <p className="text-slate-600">
          Length={data.tb.length.toLocaleString()} (Query), {data.lm.length.toLocaleString()} (Sbjct)
        </p>
        <p>
          Identities = {data.identities}/{data.alignmentLength} ({data.identity}%), Gaps = {data.gapColumns}/
          {data.alignmentLength} ({gapPct}%)
        </p>
        <p className="text-slate-600">Strand = Plus/Plus</p>
        <p className="font-sans text-xs text-slate-500">Needleman–Wunsch global alignment (EMBOSS needle defaults)</p>
      </header>

      <div className="space-y-4 overflow-x-auto rounded bg-slate-50 p-3">
        {data.segments.map((segment, index) => (
          <AlignmentSegment
            key={index}
            segment={segment}
            queryLabel={data.tb.snornaId}
            subjectLabel={data.lm.snornaId}
          />
        ))}
      </div>
    </article>
  );
}
