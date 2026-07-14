"use client";

import Link from "next/link";
import { useState } from "react";
import { PUBLIC_API_BASE } from "@/lib/api";
import { ORGANISMS } from "@/lib/site-config";

export function MotifSearchTool() {
  const [type, setType] = useState("cd-box");
  const [customQuery, setCustomQuery] = useState("");
  const [species, setSpecies] = useState("");
  const [results, setResults] = useState<Array<{ snornaId: string; organism: string; type: string; matches: string[] }>>([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    setLoading(true);
    const params = new URLSearchParams({ type });
    if (species) params.set("species", species);
    if (type === "custom" && customQuery) params.set("q", customQuery);
    const res = await fetch(`${PUBLIC_API_BASE}/tools/sequence/motif-search?${params}`);
    const data = await res.json();
    setResults(data.results ?? []);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <select className="rounded-lg border px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="cd-box">C/D box (RUGAUGA-like)</option>
          <option value="aca">ACA motif</option>
          <option value="custom">Custom motif</option>
        </select>
        <select className="rounded-lg border px-3 py-2 text-sm" value={species} onChange={(e) => setSpecies(e.target.value)}>
          <option value="">All organisms</option>
          {ORGANISMS.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
        </select>
        {type === "custom" && (
          <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Custom motif" value={customQuery} onChange={(e) => setCustomQuery(e.target.value)} />
        )}
      </div>
      <button type="button" onClick={search} disabled={loading} className="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white disabled:opacity-50">
        {loading ? "Searching…" : "Search motifs"}
      </button>
      {results.length > 0 && (
        <table className="w-full text-sm rounded-xl border bg-white">
          <thead className="bg-slate-100"><tr><th className="p-2 text-left">snoRNA</th><th className="p-2 text-left">Organism</th><th className="p-2 text-left">Type</th><th className="p-2 text-left">Matches</th></tr></thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.snornaId} className="border-t">
                <td className="p-2"><Link href={`/snorna/${r.snornaId}`} className="text-blue-700 underline">{r.snornaId}</Link></td>
                <td className="p-2">{r.organism}</td>
                <td className="p-2">{r.type}</td>
                <td className="p-2">{r.matches.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
