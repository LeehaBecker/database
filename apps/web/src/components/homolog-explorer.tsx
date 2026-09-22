"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PUBLIC_API_BASE } from "@/lib/api";
import { NeedlePairwise } from "@/components/needle-pairwise";

type Pair = {
  tbId: string;
  lmId: string | null;
  ldIds: string[];
  boxType: string;
  tbLength: number;
  lmLength: number | null;
  identity: number | null;
  tbSingleCopy: string | null;
};

export function HomologExplorer() {
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [boxType, setBoxType] = useState("");
  const [search, setSearch] = useState("");
  const [singleCopyOnly, setSingleCopyOnly] = useState(false);
  const [hasLmHomolog, setHasLmHomolog] = useState(true);
  const [selectedPair, setSelectedPair] = useState<{ tb: string; lm: string; identity: number } | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (boxType) params.set("boxType", boxType);
      if (search) params.set("search", search);
      if (singleCopyOnly) params.set("singleCopyOnly", "true");
      if (hasLmHomolog) params.set("hasLmHomolog", "true");
      const res = await fetch(`${PUBLIC_API_BASE}/tools/homologs?${params}`);
      const data = await res.json();
      setPairs(data.pairs ?? []);
      setTotal(data.total ?? 0);
      setLoading(false);
    };
    load();
  }, [boxType, search, singleCopyOnly, hasLmHomolog]);

  const comparePair = async (tbId: string, lmId: string) => {
    const res = await fetch(`${PUBLIC_API_BASE}/tools/homologs/compare?tbId=${encodeURIComponent(tbId)}&lmId=${encodeURIComponent(lmId)}`);
    const data = await res.json();
    setSelectedPair({
      tb: typeof data.alignedTb === "string" ? data.alignedTb : data.tb.sequence,
      lm: typeof data.alignedLm === "string" ? data.alignedLm : data.lm.sequence,
      identity: data.identity,
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Search IDs" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="rounded-lg border px-3 py-2 text-sm" value={boxType} onChange={(e) => setBoxType(e.target.value)}>
            <option value="">All box types</option>
            <option value="C/D">C/D</option>
            <option value="H/ACA">H/ACA</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={singleCopyOnly} onChange={(e) => setSingleCopyOnly(e.target.checked)} />
            Single copy only
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={hasLmHomolog} onChange={(e) => setHasLmHomolog(e.target.checked)} />
            Has LM homolog
          </label>
        </div>
        <p className="mt-3 text-sm text-slate-600">{total} homolog pairs · LD IDs shown as text (organism page coming soon)</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading homolog pairs…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-left">TB snoRNA</th>
                <th className="p-3 text-left">LM snoRNA</th>
                <th className="p-3 text-left">LD refs</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Identity</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pairs.map((pair) => (
                <tr key={`${pair.tbId}-${pair.lmId}`} className="border-t">
                  <td className="p-3"><Link href={`/snorna/${pair.tbId}`} className="text-blue-700 underline">{pair.tbId}</Link></td>
                  <td className="p-3">{pair.lmId ? <Link href={`/snorna/${pair.lmId}`} className="text-blue-700 underline">{pair.lmId}</Link> : "—"}</td>
                  <td className="p-3 text-xs">{pair.ldIds.length ? pair.ldIds.join(", ") : "—"}</td>
                  <td className="p-3">{pair.boxType}</td>
                  <td className="p-3">{pair.identity != null ? `${pair.identity}%` : "—"}</td>
                  <td className="p-3">
                    {pair.lmId && (
                      <button type="button" className="text-xs text-cyan-700 underline" onClick={() => comparePair(pair.tbId, pair.lmId!)}>
                        Compare
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedPair && (
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Needle alignment ({selectedPair.identity}% identity)</h2>
          <p className="mt-1 text-xs text-slate-500">EMBOSS needle (Needleman–Wunsch) global alignment</p>
          <div className="mt-3">
            <NeedlePairwise tb={selectedPair.tb} lm={selectedPair.lm} />
          </div>
        </section>
      )}
    </div>
  );
}
