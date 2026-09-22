"use client";

import Link from "next/link";

function compareHref(tbId: string, lmId: string) {
  return `/tools/homologs/compare?tbId=${encodeURIComponent(tbId)}&lmId=${encodeURIComponent(lmId)}`;
}

export function SnornaHomologComparison({
  tbIds,
  lmIds,
  ldIds,
}: {
  tbIds: string[];
  lmIds: string[];
  ldIds: string[];
}) {
  const tbId = tbIds[0];
  const lmId = lmIds[0];

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

      {tbId && lmId && (
        <div className="border-t pt-4">
          <Link href={compareHref(tbId, lmId)} className="text-sm text-cyan-700 underline">
            Compare {tbId} ↔ {lmId} alignment
          </Link>
          <Link href="/tools/homologs" className="mt-2 block text-xs text-cyan-700 underline">
            Open Homolog Explorer
          </Link>
        </div>
      )}
    </section>
  );
}
