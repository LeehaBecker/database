"use client";

import Link from "next/link";

type ModSite = { rrnaSubunit: string; count: number; snoRna: { snornaId: string } | null };

export function RrnaSequenceInteractive({
  organismId,
  units,
  modifications,
}: {
  organismId: string;
  units: Array<{ id: string; subunit: string; start: number; end: number; sequence?: string | null }>;
  modifications: ModSite[];
}) {
  const modMap = new Map<string, ModSite[]>();
  for (const mod of modifications) {
    const key = `${mod.rrnaSubunit}:${mod.count}`;
    if (!modMap.has(key)) modMap.set(key, []);
    modMap.get(key)!.push(mod);
  }

  return (
    <section className="rounded-xl border bg-white p-4">
      <h2 className="font-semibold">Interactive modification map</h2>
      <p className="mt-1 text-xs text-slate-500">Highlighted positions link to the interaction viewer.</p>
      <div className="mt-3 flex h-10 overflow-hidden rounded">
        {units.map((unit) => (
          <div key={unit.id} className="flex-1 text-center text-xs leading-10 bg-cyan-100 even:bg-violet-100">
            {unit.subunit}
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-1">
        {modifications.slice(0, 100).map((mod, i) => (
          <Link
            key={`${mod.rrnaSubunit}-${mod.count}-${i}`}
            href={`/tools/interactions?subunit=${encodeURIComponent(mod.rrnaSubunit)}&position=${mod.count}`}
            className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900 hover:bg-amber-200"
            title={mod.snoRna?.snornaId ?? "Unknown snoRNA"}
          >
            {mod.rrnaSubunit}:{mod.count}
          </Link>
        ))}
        {modifications.length > 100 && (
          <span className="text-xs text-slate-500">+{modifications.length - 100} more (see modifications table)</span>
        )}
      </div>
      <Link href={`/organisms/${organismId}/rrna/modifications`} className="mt-3 inline-block text-sm text-cyan-700 underline">
        Full modifications table
      </Link>
    </section>
  );
}
