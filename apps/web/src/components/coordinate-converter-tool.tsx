"use client";

import { useState } from "react";
import { PUBLIC_API_BASE } from "@/lib/api";
import { ORGANISMS } from "@/lib/site-config";

export function CoordinateConverterTool() {
  const [species, setSpecies] = useState("trypanosoma-brucei");
  const [subunit, setSubunit] = useState("");
  const [position, setPosition] = useState("");
  const [absolutePosition, setAbsolutePosition] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const convert = async () => {
    const params = new URLSearchParams({ species });
    if (subunit && position) {
      params.set("subunit", subunit);
      params.set("position", position);
    } else if (absolutePosition) {
      params.set("absolutePosition", absolutePosition);
    }
    const res = await fetch(`${PUBLIC_API_BASE}/tools/sequence/coordinate-converter?${params}`);
    setResult(await res.json());
  };

  return (
    <div className="space-y-4">
      <select className="rounded-lg border px-3 py-2 text-sm" value={species} onChange={(e) => setSpecies(e.target.value)}>
        {ORGANISMS.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
      </select>
      <div className="rounded-xl border bg-white p-4">
        <p className="text-sm font-medium">Subunit → absolute</p>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Subunit" value={subunit} onChange={(e) => setSubunit(e.target.value)} />
          <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Relative position" value={position} onChange={(e) => setPosition(e.target.value)} />
        </div>
      </div>
      <div className="rounded-xl border bg-white p-4">
        <p className="text-sm font-medium">Absolute → subunit</p>
        <input className="mt-2 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Absolute rRNA position" value={absolutePosition} onChange={(e) => setAbsolutePosition(e.target.value)} />
      </div>
      <button type="button" onClick={convert} className="rounded-lg bg-amber-600 px-4 py-2 text-sm text-white">Convert</button>
      {result && (
        <pre className="rounded-xl bg-slate-100 p-4 text-xs overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}
