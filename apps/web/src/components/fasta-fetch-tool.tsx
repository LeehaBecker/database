"use client";

import { useState } from "react";
import { PUBLIC_API_BASE } from "@/lib/api";
import { CopyButton } from "@/components/copy-button";

export function FastaFetchTool() {
  const [ids, setIds] = useState("");
  const [fasta, setFasta] = useState("");
  const [missing, setMissing] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFasta = async () => {
    setLoading(true);
    const res = await fetch(`${PUBLIC_API_BASE}/tools/sequence/fasta-fetch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: ids.split(/[\s,]+/).filter(Boolean) }),
    });
    const data = await res.json();
    setFasta(data.fasta ?? "");
    setMissing(data.missing ?? []);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <textarea className="w-full rounded-xl border p-3 text-sm" rows={4} placeholder="Enter snoRNA IDs, one per line or comma-separated" value={ids} onChange={(e) => setIds(e.target.value)} />
      <button type="button" onClick={fetchFasta} disabled={loading || !ids.trim()} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm text-white disabled:opacity-50">
        {loading ? "Fetching…" : "Fetch FASTA"}
      </button>
      {missing.length > 0 && <p className="text-sm text-amber-700">Not found: {missing.join(", ")}</p>}
      {fasta && (
        <div>
          <div className="mb-2 flex gap-2">
            <CopyButton text={fasta} label="Copy FASTA" />
            <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(fasta)}`} download="snornas.fasta" className="rounded border px-2 py-1 text-xs">Download</a>
          </div>
          <pre className="max-h-80 overflow-auto rounded-xl bg-slate-100 p-4 text-xs whitespace-pre-wrap">{fasta}</pre>
        </div>
      )}
    </div>
  );
}
