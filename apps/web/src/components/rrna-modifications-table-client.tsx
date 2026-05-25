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

const includes = (value: string | number | null | undefined, query: string) =>
  String(value ?? "").toLowerCase().includes(query.trim().toLowerCase());

export function RrnaModificationsTableClient({ rows }: { rows: ModRow[] }) {
  const [filters, setFilters] = useState({
    rrnaSubunit: "",
    position: "",
    snoRNA: "",
    modType: "",
    base: "",
  });
  const [selected, setSelected] = useState<Record<string, boolean>>({});

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

  const keyOf = (row: ModRow, index: number) =>
    `${row.rrnaSubunit}|${row.count}|${row.snoRna?.snornaId ?? "Not Known"}|${row.modType ?? "Not Known"}|${index}`;

  const selectedRows = filtered.filter((row, index) => selected[keyOf(row, index)]);

  const csvHref = useMemo(() => {
    if (!selectedRows.length) return "";
    const header = ["rRNA unit", "Position", "snoRNA", "Modification Type", "Base"];
    const lines = selectedRows.map((row) =>
      [row.rrnaSubunit, String(row.count), row.snoRna?.snornaId ?? "Not Known", row.modType ?? "Not Known", row.bp ?? "Not Known"].join(","),
    );
    return `data:text/csv;charset=utf-8,${encodeURIComponent([header.join(","), ...lines].join("\n"))}`;
  }, [selectedRows]);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-5">
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Filter rRNA unit"
          value={filters.rrnaSubunit}
          onChange={(event) => setFilters((prev) => ({ ...prev, rrnaSubunit: event.target.value }))}
        />
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Filter position"
          value={filters.position}
          onChange={(event) => setFilters((prev) => ({ ...prev, position: event.target.value }))}
        />
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Filter snoRNA"
          value={filters.snoRNA}
          onChange={(event) => setFilters((prev) => ({ ...prev, snoRNA: event.target.value }))}
        />
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Filter type"
          value={filters.modType}
          onChange={(event) => setFilters((prev) => ({ ...prev, modType: event.target.value }))}
        />
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Filter base"
          value={filters.base}
          onChange={(event) => setFilters((prev) => ({ ...prev, base: event.target.value }))}
        />
      </div>

      <div className="flex items-center gap-3 text-sm">
        <span>Selected rows: {selectedRows.length}</span>
        <a
          href={csvHref || undefined}
          download="rrna-modification-sites-selection.csv"
          className={`rounded-lg px-3 py-1.5 ${selectedRows.length ? "bg-violet-600 text-white" : "pointer-events-none bg-slate-200 text-slate-500"}`}
        >
          Download CSV
        </a>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-[1000px] w-full text-sm">
          <thead>
            <tr className="bg-slate-100 text-slate-700">
              <th className="p-3 text-left">
                <input
                  type="checkbox"
                  aria-label="Select all filtered rows"
                  checked={filtered.length > 0 && filtered.every((row, index) => selected[keyOf(row, index)])}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setSelected((prev) => {
                      const next = { ...prev };
                      filtered.forEach((row, index) => {
                        next[keyOf(row, index)] = checked;
                      });
                      return next;
                    });
                  }}
                />
              </th>
              <th className="p-3 text-left">rRNA unit</th>
              <th className="p-3 text-left">Position</th>
              <th className="p-3 text-left">snoRNA</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Base</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, index) => {
              const key = keyOf(row, index);
              return (
                <tr key={key} className="border-t">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={!!selected[key]}
                      onChange={(event) => {
                        setSelected((prev) => ({ ...prev, [key]: event.target.checked }));
                      }}
                    />
                  </td>
                  <td className="p-3">{row.rrnaSubunit}</td>
                  <td className="p-3">{row.count}</td>
                  <td className="p-3">
                    {row.snoRna?.snornaId ? (
                      <Link className="text-blue-700 underline" href={`/snorna/${row.snoRna.snornaId}`}>
                        {row.snoRna.snornaId}
                      </Link>
                    ) : (
                      "Not Known"
                    )}
                  </td>
                  <td className="p-3">{row.modType ?? "Not Known"}</td>
                  <td className="p-3">{row.bp ?? "Not Known"}</td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr>
                <td className="p-4 text-slate-500" colSpan={6}>
                  No rows match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
