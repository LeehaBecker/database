"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PUBLIC_API_BASE } from "@/lib/api";
import { ORGANISMS } from "@/lib/site-config";

type ByPositionResult = {
  subunit: string;
  position: number;
  guidingSnornas: Array<{ snornaId: string; type: string; modType: string | null; bp: string | null }>;
};

type BySnornaResult = {
  snorna: { snornaId: string; type: string };
  targets: Array<{ rrnaSubunit: string; position: number; modType: string | null; bp: string | null }>;
};

export function InteractionsTool() {
  const searchParams = useSearchParams();
  const [species, setSpecies] = useState(searchParams.get("species") ?? "trypanosoma-brucei");
  const [mode, setMode] = useState<"byPosition" | "bySnorna">(
    searchParams.get("snornaId") ? "bySnorna" : "byPosition",
  );
  const [subunit, setSubunit] = useState(searchParams.get("subunit") ?? "");
  const [position, setPosition] = useState(searchParams.get("position") ?? "");
  const [snornaId, setSnornaId] = useState(searchParams.get("snornaId") ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [positionResult, setPositionResult] = useState<ByPositionResult | null>(null);
  const [snornaResult, setSnornaResult] = useState<BySnornaResult | null>(null);

  useEffect(() => {
    const autoQuery = async () => {
      if (!searchParams.get("subunit") && !searchParams.get("position") && !searchParams.get("snornaId")) return;
      setLoading(true);
      setError("");
      try {
        const currentMode = searchParams.get("snornaId") ? "bySnorna" : "byPosition";
        if (currentMode === "byPosition") {
          const params = new URLSearchParams({
            mode: "byPosition",
            species,
            subunit: searchParams.get("subunit") ?? "",
            position: searchParams.get("position") ?? "",
          });
          const res = await fetch(`${PUBLIC_API_BASE}/tools/interactions?${params}`);
          if (!res.ok) throw new Error(await res.text());
          setPositionResult(await res.json());
        } else {
          const params = new URLSearchParams({
            mode: "bySnorna",
            species,
            snornaId: searchParams.get("snornaId") ?? "",
          });
          const res = await fetch(`${PUBLIC_API_BASE}/tools/interactions?${params}`);
          if (!res.ok) throw new Error(await res.text());
          setSnornaResult(await res.json());
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Query failed");
      } finally {
        setLoading(false);
      }
    };
    void autoQuery();
  }, [searchParams, species]);

  const runQuery = async () => {
    setLoading(true);
    setError("");
    setPositionResult(null);
    setSnornaResult(null);
    try {
      if (mode === "byPosition") {
        const params = new URLSearchParams({ mode, species, subunit, position });
        const res = await fetch(`${PUBLIC_API_BASE}/tools/interactions?${params}`);
        if (!res.ok) throw new Error(await res.text());
        setPositionResult(await res.json());
      } else {
        const params = new URLSearchParams({ mode, species, snornaId });
        const res = await fetch(`${PUBLIC_API_BASE}/tools/interactions?${params}`);
        if (!res.ok) throw new Error(await res.text());
        setSnornaResult(await res.json());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setMode("byPosition")} className={`rounded-lg px-4 py-2 text-sm ${mode === "byPosition" ? "bg-cyan-600 text-white" : "border bg-white"}`}>
          By rRNA position
        </button>
        <button type="button" onClick={() => setMode("bySnorna")} className={`rounded-lg px-4 py-2 text-sm ${mode === "bySnorna" ? "bg-cyan-600 text-white" : "border bg-white"}`}>
          By snoRNA
        </button>
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <label className="block text-sm font-medium">Organism</label>
        <select className="mt-1 rounded-lg border px-3 py-2 text-sm" value={species} onChange={(e) => setSpecies(e.target.value)}>
          {ORGANISMS.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
        </select>

        {mode === "byPosition" ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input className="rounded-lg border px-3 py-2 text-sm" placeholder="rRNA subunit (e.g. SSU)" value={subunit} onChange={(e) => setSubunit(e.target.value)} />
            <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Position" value={position} onChange={(e) => setPosition(e.target.value)} />
          </div>
        ) : (
          <input className="mt-4 w-full rounded-lg border px-3 py-2 text-sm" placeholder="snoRNA ID" value={snornaId} onChange={(e) => setSnornaId(e.target.value)} />
        )}

        <button type="button" onClick={runQuery} disabled={loading} className="mt-4 rounded-lg bg-cyan-600 px-4 py-2 text-sm text-white disabled:opacity-50">
          {loading ? "Searching…" : "Search"}
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {positionResult && (
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Guiding snoRNAs for {positionResult.subunit} position {positionResult.position}</h2>
          {!positionResult.guidingSnornas.length ? (
            <p className="mt-2 text-sm text-slate-500">No guiding snoRNAs found.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead><tr className="bg-slate-100"><th className="p-2 text-left">snoRNA</th><th className="p-2 text-left">Type</th><th className="p-2 text-left">Mod</th><th className="p-2 text-left">Base</th></tr></thead>
              <tbody>
                {positionResult.guidingSnornas.map((row) => (
                  <tr key={row.snornaId} className="border-t">
                    <td className="p-2"><Link href={`/snorna/${row.snornaId}`} className="text-blue-700 underline">{row.snornaId}</Link></td>
                    <td className="p-2">{row.type}</td>
                    <td className="p-2">{row.modType ?? "—"}</td>
                    <td className="p-2">{row.bp ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {snornaResult && (
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="font-semibold">rRNA targets for {snornaResult.snorna.snornaId} ({snornaResult.snorna.type})</h2>
          {!snornaResult.targets.length ? (
            <p className="mt-2 text-sm text-slate-500">No modification targets found.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead><tr className="bg-slate-100"><th className="p-2 text-left">Subunit</th><th className="p-2 text-left">Position</th><th className="p-2 text-left">Mod</th><th className="p-2 text-left">Base</th></tr></thead>
              <tbody>
                {snornaResult.targets.map((row, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{row.rrnaSubunit}</td>
                    <td className="p-2">
                      <Link href={`/tools/interactions?subunit=${encodeURIComponent(row.rrnaSubunit)}&position=${row.position}`} className="text-blue-700 underline">
                        {row.position}
                      </Link>
                    </td>
                    <td className="p-2">{row.modType ?? "—"}</td>
                    <td className="p-2">{row.bp ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
