"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PUBLIC_API_BASE } from "@/lib/api";
import { ORGANISMS } from "@/lib/site-config";
import { SnornaRrnaDuplex, type InteractionDuplex } from "@/components/snorna-rrna-duplex";
import { RrnaInteractionTrack, type TrackFocus } from "@/components/rrna-interaction-track";

type ByPositionResult = {
  subunit: string;
  position: number;
  guidingSnornas: Array<{
    snornaId: string;
    type: string;
    modType: string | null;
    bp: string | null;
    duplex: InteractionDuplex | null;
    duplexNote: string | null;
  }>;
};

type BySnornaResult = {
  snorna: { snornaId: string; type: string };
  targets: Array<{
    rrnaSubunit: string;
    position: number;
    modType: string | null;
    bp: string | null;
    duplex: InteractionDuplex | null;
    duplexNote: string | null;
  }>;
};

function PairingPanel({
  duplex,
  note,
}: {
  duplex: InteractionDuplex | null;
  note: string | null;
}) {
  if (duplex) return <SnornaRrnaDuplex duplex={duplex} />;
  return <p className="text-sm text-slate-500">{note ?? "Base pairing could not be drawn for this row."}</p>;
}

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
  const [positionIndex, setPositionIndex] = useState(0);
  const [snornaIndex, setSnornaIndex] = useState(0);
  const [trackSubunit, setTrackSubunit] = useState(searchParams.get("subunit") ?? "");
  const [trackFocus, setTrackFocus] = useState<TrackFocus | null>(null);
  const [highlightSnornaId, setHighlightSnornaId] = useState<string | null>(null);

  const focusTrack = (targetSubunit: string, targetPosition: number) => {
    setTrackSubunit(targetSubunit);
    setTrackFocus({ subunit: targetSubunit, position: targetPosition, key: Date.now() });
  };

  const applyPositionResult = (result: ByPositionResult) => {
    setPositionResult(result);
    setPositionIndex(0);
    setHighlightSnornaId(null);
    focusTrack(result.subunit, result.position);
  };

  const applySnornaResult = (result: BySnornaResult) => {
    setSnornaResult(result);
    setSnornaIndex(0);
    setHighlightSnornaId(result.snorna.snornaId);
    const first = result.targets[0];
    if (first) focusTrack(first.rrnaSubunit, first.position);
  };

  const fetchPosition = async (querySubunit: string, queryPosition: string): Promise<ByPositionResult> => {
    const params = new URLSearchParams({ mode: "byPosition", species, subunit: querySubunit, position: queryPosition });
    const res = await fetch(`${PUBLIC_API_BASE}/tools/interactions?${params}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  const fetchSnorna = async (querySnornaId: string): Promise<BySnornaResult> => {
    const params = new URLSearchParams({ mode: "bySnorna", species, snornaId: querySnornaId });
    const res = await fetch(`${PUBLIC_API_BASE}/tools/interactions?${params}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  useEffect(() => {
    const autoQuery = async () => {
      if (!searchParams.get("subunit") && !searchParams.get("position") && !searchParams.get("snornaId")) return;
      setLoading(true);
      setError("");
      try {
        const urlSnornaId = searchParams.get("snornaId");
        if (!urlSnornaId) {
          applyPositionResult(await fetchPosition(searchParams.get("subunit") ?? "", searchParams.get("position") ?? ""));
        } else {
          applySnornaResult(await fetchSnorna(urlSnornaId));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Query failed");
      } finally {
        setLoading(false);
      }
    };
    void autoQuery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, species]);

  const runPositionQuery = async (querySubunit: string, queryPosition: string) => {
    setLoading(true);
    setError("");
    setPositionResult(null);
    setSnornaResult(null);
    try {
      applyPositionResult(await fetchPosition(querySubunit, queryPosition));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setLoading(false);
    }
  };

  const runQuery = async () => {
    if (mode === "byPosition") {
      await runPositionQuery(subunit, position);
      return;
    }
    setLoading(true);
    setError("");
    setPositionResult(null);
    setSnornaResult(null);
    try {
      applySnornaResult(await fetchSnorna(snornaId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setLoading(false);
    }
  };

  const selectTrackSite = (siteSubunit: string, sitePosition: number) => {
    setMode("byPosition");
    setSubunit(siteSubunit);
    setPosition(String(sitePosition));
    void runPositionQuery(siteSubunit, String(sitePosition));
  };

  const selectSnornaRow = (index: number) => {
    setSnornaIndex(index);
    const row = snornaResult?.targets[index];
    if (row) focusTrack(row.rrnaSubunit, row.position);
  };

  const changeSpecies = (value: string) => {
    setSpecies(value);
    setTrackSubunit("");
    setTrackFocus(null);
    setHighlightSnornaId(null);
  };

  const selectedPosition = positionResult?.guidingSnornas[positionIndex] ?? null;
  const selectedSnorna = snornaResult?.targets[snornaIndex] ?? null;

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
        <select className="mt-1 rounded-lg border px-3 py-2 text-sm" value={species} onChange={(e) => changeSpecies(e.target.value)}>
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

      <RrnaInteractionTrack
        species={species}
        subunit={trackSubunit}
        focus={trackFocus}
        highlightSnornaId={highlightSnornaId}
        onSubunitChange={(value) => {
          setTrackSubunit(value);
          setTrackFocus(null);
        }}
        onSelectSite={selectTrackSite}
      />

      {positionResult && (
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Guiding snoRNAs for {positionResult.subunit} position {positionResult.position}</h2>
          {!positionResult.guidingSnornas.length ? (
            <p className="mt-2 text-sm text-slate-500">No guiding snoRNAs found.</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-slate-500">Select a row to inspect base pairing.</p>
              <table className="mt-3 w-full text-sm">
                <thead><tr className="bg-slate-100"><th className="p-2 text-left">snoRNA</th><th className="p-2 text-left">Type</th><th className="p-2 text-left">Mod</th><th className="p-2 text-left">Base</th></tr></thead>
                <tbody>
                  {positionResult.guidingSnornas.map((row, index) => (
                    <tr
                      key={row.snornaId}
                      onClick={() => setPositionIndex(index)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setPositionIndex(index);
                        }
                      }}
                      tabIndex={0}
                      aria-selected={index === positionIndex}
                      className={`cursor-pointer border-t ${index === positionIndex ? "bg-cyan-50" : "hover:bg-slate-50"}`}
                    >
                      <td className="p-2"><Link href={`/snorna/${row.snornaId}`} className="text-blue-700 underline">{row.snornaId}</Link></td>
                      <td className="p-2">{row.type}</td>
                      <td className="p-2">{row.modType ?? "—"}</td>
                      <td className="p-2">{row.bp ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selectedPosition ? (
                <div className="mt-4 border-t pt-4">
                  <PairingPanel duplex={selectedPosition.duplex} note={selectedPosition.duplexNote} />
                </div>
              ) : null}
            </>
          )}
        </section>
      )}

      {snornaResult && (
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="font-semibold">rRNA targets for {snornaResult.snorna.snornaId} ({snornaResult.snorna.type})</h2>
          {!snornaResult.targets.length ? (
            <p className="mt-2 text-sm text-slate-500">No modification targets found.</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-slate-500">Select a row to inspect base pairing.</p>
              <table className="mt-3 w-full text-sm">
                <thead><tr className="bg-slate-100"><th className="p-2 text-left">Subunit</th><th className="p-2 text-left">Position</th><th className="p-2 text-left">Mod</th><th className="p-2 text-left">Base</th></tr></thead>
                <tbody>
                  {snornaResult.targets.map((row, index) => (
                    <tr
                      key={`${row.rrnaSubunit}-${row.position}-${index}`}
                      onClick={() => selectSnornaRow(index)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          selectSnornaRow(index);
                        }
                      }}
                      tabIndex={0}
                      aria-selected={index === snornaIndex}
                      className={`cursor-pointer border-t ${index === snornaIndex ? "bg-cyan-50" : "hover:bg-slate-50"}`}
                    >
                      <td className="p-2">{row.rrnaSubunit}</td>
                      <td className="p-2">
                        <Link href={`/tools/interactions?species=${encodeURIComponent(species)}&subunit=${encodeURIComponent(row.rrnaSubunit)}&position=${row.position}`} className="text-blue-700 underline">
                          {row.position}
                        </Link>
                      </td>
                      <td className="p-2">{row.modType ?? "—"}</td>
                      <td className="p-2">{row.bp ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selectedSnorna ? (
                <div className="mt-4 border-t pt-4">
                  <PairingPanel duplex={selectedSnorna.duplex} note={selectedSnorna.duplexNote} />
                </div>
              ) : null}
            </>
          )}
        </section>
      )}
    </div>
  );
}
