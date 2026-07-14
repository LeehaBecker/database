"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ModRow = {
  rrnaSubunit: string;
  count: number;
  modType: string | null;
  bp: string | null;
  snoRna: { snornaId: string } | null;
};

type SortKey = "rrnaSubunit" | "count" | "snoRNA" | "modType" | "base";

const includes = (value: string | number | null | undefined, query: string) =>
  String(value ?? "").toLowerCase().includes(query.trim().toLowerCase());

export function RrnaModificationsTableClient({ rows, organismId }: { rows: ModRow[]; organismId?: string }) {
  const [filters, setFilters] = useState({ rrnaSubunit: "", position: "", snoRNA: "", modType: "", base: "" });
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [sortKey, setSortKey] = useState<SortKey>("rrnaSubunit");
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          includes(row.rrnaSubunit, filters.rrnaSubunit) &&
          includes(row.count, filters.position) &&
          includes(row.snoRna?.snornaId ?? "Not Known", filters.snoRNA) &&
          includes(row.modType ?? "Not Known", filters.modType) &&
          includes(row.bp ?? "Not Known", filters.base),
      ),
    [rows, filters],
  );

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let left: string | number = "";
      let right: string | number = "";
      if (sortKey === "count") { left = a.count; right = b.count; }
      else if (sortKey === "snoRNA") { left = a.snoRna?.snornaId ?? ""; right = b.snoRna?.snornaId ?? ""; }
      else if (sortKey === "modType") { left = a.modType ?? ""; right = b.modType ?? ""; }
      else if (sortKey === "base") { left = a.bp ?? ""; right = b.bp ?? ""; }
      else { left = a.rrnaSubunit; right = b.rrnaSubunit; }
      const cmp = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right));
      return sortAsc ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortAsc]);

  const keyOf = (row: ModRow, index: number) =>
    `${row.rrnaSubunit}|${row.count}|${row.snoRna?.snornaId ?? "Not Known"}|${row.modType ?? "Not Known"}|${index}`;

  const selectedRows = sorted.filter((row, index) => selected[keyOf(row, index)]);

  const csvHref = useMemo(() => {
    if (!selectedRows.length) return "";
    const header = ["rRNA unit", "Position", "snoRNA", "Modification Type", "Base"];
    const lines = selectedRows.map((row) =>
      [row.rrnaSubunit, String(row.count), row.snoRna?.snornaId ?? "Not Known", row.modType ?? "Not Known", row.bp ?? "Not Known"].join(","),
    );
    return `data:text/csv;charset=utf-8,${encodeURIComponent([header.join(","), ...lines].join("\n"))}`;
  }, [selectedRows]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sortIndicator = (key: SortKey) => (sortKey === key ? (sortAsc ? " ↑" : " ↓") : "");

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-5">
        <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Filter rRNA unit" value={filters.rrnaSubunit} onChange={(e) => setFilters((p) => ({ ...p, rrnaSubunit: e.target.value }))} />
        <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Filter position" value={filters.position} onChange={(e) => setFilters((p) => ({ ...p, position: e.target.value }))} />
        <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Filter snoRNA" value={filters.snoRNA} onChange={(e) => setFilters((p) => ({ ...p, snoRNA: e.target.value }))} />
        <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Filter type" value={filters.modType} onChange={(e) => setFilters((p) => ({ ...p, modType: e.target.value }))} />
        <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Filter base" value={filters.base} onChange={(e) => setFilters((p) => ({ ...p, base: e.target.value }))} />
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span>Selected rows: {selectedRows.length}</span>
        <a href={csvHref || undefined} download="rrna-modification-sites-selection.csv" className={`rounded-lg px-3 py-1.5 ${selectedRows.length ? "bg-violet-600 text-white" : "pointer-events-none bg-slate-200 text-slate-500"}`}>
          Download CSV
        </a>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-[1000px] w-full text-sm">
          <thead>
            <tr className="bg-slate-100 text-slate-700">
              <th className="p-3 text-left"><input type="checkbox" checked={sorted.length > 0 && sorted.every((row, i) => selected[keyOf(row, i)])} onChange={(e) => {
                const checked = e.target.checked;
                setSelected((prev) => { const next = { ...prev }; sorted.forEach((row, i) => { next[keyOf(row, i)] = checked; }); return next; });
              }} /></th>
              <th className="cursor-pointer p-3 text-left" onClick={() => toggleSort("rrnaSubunit")}>rRNA unit{sortIndicator("rrnaSubunit")}</th>
              <th className="cursor-pointer p-3 text-left" onClick={() => toggleSort("count")}>Position{sortIndicator("count")}</th>
              <th className="cursor-pointer p-3 text-left" onClick={() => toggleSort("snoRNA")}>snoRNA{sortIndicator("snoRNA")}</th>
              <th className="cursor-pointer p-3 text-left" onClick={() => toggleSort("modType")}>Type{sortIndicator("modType")}</th>
              <th className="cursor-pointer p-3 text-left" onClick={() => toggleSort("base")}>Base{sortIndicator("base")}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, index) => {
              const key = keyOf(row, index);
              return (
                <tr key={key} className="border-t">
                  <td className="p-3"><input type="checkbox" checked={!!selected[key]} onChange={(e) => setSelected((p) => ({ ...p, [key]: e.target.checked }))} /></td>
                  <td className="p-3">{row.rrnaSubunit}</td>
                  <td className="p-3">
                    {organismId ? (
                      <Link href={`/tools/interactions?subunit=${encodeURIComponent(row.rrnaSubunit)}&position=${row.count}`} className="text-blue-700 underline">{row.count}</Link>
                    ) : row.count}
                  </td>
                  <td className="p-3">
                    {row.snoRna?.snornaId ? (
                      <Link className="text-blue-700 underline" href={`/snorna/${row.snoRna.snornaId}`}>{row.snoRna.snornaId}</Link>
                    ) : "Not Known"}
                  </td>
                  <td className="p-3">{row.modType ?? "Not Known"}</td>
                  <td className="p-3">{row.bp ?? "Not Known"}</td>
                </tr>
              );
            })}
            {!sorted.length && <tr><td className="p-4 text-slate-500" colSpan={6}>No rows match the current filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
