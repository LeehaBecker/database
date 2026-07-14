"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PUBLIC_API_BASE } from "@/lib/api";

export function SnornaHomologComparison({
  tbIds,
  lmIds,
  ldIds,
}: {
  tbIds: string[];
  lmIds: string[];
  ldIds: string[];
}) {
  const [comparison, setComparison] = useState<{
    tbId: string;
    lmId: string;
    tbSeq: string;
    lmSeq: string;
    identity: number;
  } | null>(null);

  useEffect(() => {
    const tbId = tbIds[0];
    const lmId = lmIds[0];
    if (!tbId || !lmId) return;

    fetch(`${PUBLIC_API_BASE}/tools/homologs/compare?tbId=${encodeURIComponent(tbId)}&lmId=${encodeURIComponent(lmId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.tb && data.lm) {
          setComparison({
            tbId: data.tb.snornaId,
            lmId: data.lm.snornaId,
            tbSeq: data.tb.sequence.replaceAll("T", "U"),
            lmSeq: data.lm.sequence.replaceAll("T", "U"),
            identity: data.identity,
          });
        }
      })
      .catch(() => undefined);
  }, [tbIds, lmIds]);

  return (
    <section className="rounded-xl border bg-white p-4 space-y-4">
      <h2 className="font-semibold">Homolog links</h2>

      {!!lmIds.length && (
        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">LM homologs</p>
          <div className="flex flex-wrap gap-2">
            {lmIds.map((homologId) => (
              <Link key={homologId} href={`/snorna/${homologId}`} className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-900 underline">
                {homologId}
              </Link>
            ))}
          </div>
        </div>
      )}

      {!!tbIds.length && (
        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">TB homologs</p>
          <div className="flex flex-wrap gap-2">
            {tbIds.map((homologId) => (
              <Link key={homologId} href={`/snorna/${homologId}`} className="rounded border border-cyan-200 bg-cyan-50 px-2 py-1 text-xs text-cyan-900 underline">
                {homologId}
              </Link>
            ))}
          </div>
        </div>
      )}

      {!!ldIds.length && (
        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">LD homologs (coming soon)</p>
          <div className="flex flex-wrap gap-2">
            {ldIds.map((homologId) => (
              <span key={homologId} className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
                {homologId}
              </span>
            ))}
          </div>
        </div>
      )}

      {!lmIds.length && !tbIds.length && !ldIds.length && (
        <p className="text-sm text-slate-500">No homolog available</p>
      )}

      {comparison && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold">
            Side-by-side comparison: {comparison.tbId} ↔ {comparison.lmId} ({comparison.identity}% identity)
          </h3>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-cyan-800">TB</p>
              <pre className="mt-1 max-h-32 overflow-auto rounded bg-cyan-50 p-2 text-xs break-all">{comparison.tbSeq}</pre>
            </div>
            <div>
              <p className="text-xs font-medium text-emerald-800">LM</p>
              <pre className="mt-1 max-h-32 overflow-auto rounded bg-emerald-50 p-2 text-xs break-all">{comparison.lmSeq}</pre>
            </div>
          </div>
          <Link href="/tools/homologs" className="mt-2 inline-block text-xs text-cyan-700 underline">
            Open Homolog Explorer
          </Link>
        </div>
      )}
    </section>
  );
}
