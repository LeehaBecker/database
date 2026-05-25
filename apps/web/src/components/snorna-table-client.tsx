"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type SnoRow = {
  id: string;
  snoRNAId: string;
  boxType: string;
  targetType: string;
  targetCount: number;
};

const matches = (value: string | number, filter: string) =>
  String(value).toLowerCase().includes(filter.trim().toLowerCase());

export function SnornaTableClient({ rows, organismId, total }: { rows: SnoRow[]; organismId: string; total: number }) {
  const [filters, setFilters] = useState({
    snoRNAId: "",
    boxType: "",
    targetType: "",
    targetCount: "",
  });
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  const filteredRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          matches(row.snoRNAId, filters.snoRNAId) &&
          matches(row.boxType, filters.boxType) &&
          matches(row.targetType, filters.targetType) &&
          matches(row.targetCount, filters.targetCount),
      ),
    [rows, filters],
  );

  const selectedRows = filteredRows.filter((row) => selectedIds[row.id]);

  const csvHref = useMemo(() => {
    if (!selectedRows.length) return "";
    const header = ["snoRNA ID", "Box Type", "Target Type", "Target Count"];
    const csv = [
      header.join(","),
      ...selectedRows.map((row) => [row.snoRNAId, row.boxType, row.targetType, String(row.targetCount)].join(",")),
    ].join("\n");
    return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  }, [selectedRows]);

  return (
    <main className="mx-auto max-w-[95rem] space-y-4 px-4 py-8 lg:px-8">
      <div className="space-y-2">
        <Link href={`/organisms/${organismId}`} className="text-sm text-cyan-700 underline">
          Back to Organism
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">snoRNA Data</h1>
        <p className="text-sm text-slate-600">Showing {rows.length} of {total} snoRNAs</p>
      </div>

      <section className="rounded-2xl border border-cyan-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Filter snoRNA ID"
            value={filters.snoRNAId}
            onChange={(event) => setFilters((prev) => ({ ...prev, snoRNAId: event.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Filter Box Type"
            value={filters.boxType}
            onChange={(event) => setFilters((prev) => ({ ...prev, boxType: event.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Filter Target Type"
            value={filters.targetType}
            onChange={(event) => setFilters((prev) => ({ ...prev, targetType: event.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Filter Target Count"
            value={filters.targetCount}
            onChange={(event) => setFilters((prev) => ({ ...prev, targetCount: event.target.value }))}
          />
        </div>
        <div className="mt-3 flex items-center gap-3 text-sm">
          <span>Selected rows: {selectedRows.length}</span>
          <a
            href={csvHref || undefined}
            download={`${organismId}-snorna-selection.csv`}
            className={`rounded-lg px-3 py-1.5 ${selectedRows.length ? "bg-cyan-600 text-white" : "bg-slate-200 text-slate-500 pointer-events-none"}`}
          >
            Download CSV
          </a>
        </div>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[1100px] w-full text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="p-3 text-left">
                <input
                  type="checkbox"
                  aria-label="Select all filtered rows"
                  checked={filteredRows.length > 0 && filteredRows.every((row) => selectedIds[row.id])}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setSelectedIds((prev) => {
                      const next = { ...prev };
                      for (const row of filteredRows) next[row.id] = checked;
                      return next;
                    });
                  }}
                />
              </th>
              <th className="p-3 text-left">snoRNA ID</th>
              <th className="p-3 text-left">Box Type</th>
              <th className="p-3 text-left">Target Type</th>
              <th className="p-3 text-left">Target Count</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${item.snoRNAId}`}
                    checked={!!selectedIds[item.id]}
                    onChange={(event) =>
                      setSelectedIds((prev) => ({
                        ...prev,
                        [item.id]: event.target.checked,
                      }))
                    }
                  />
                </td>
                <td className="p-3">
                  <Link className="text-blue-700 underline" href={`/snorna/${item.snoRNAId}`}>
                    {item.snoRNAId}
                  </Link>
                </td>
                <td className="p-3">{item.boxType}</td>
                <td className="p-3">{item.targetType}</td>
                <td className="p-3">{item.targetCount}</td>
              </tr>
            ))}
            {!filteredRows.length && (
              <tr>
                <td className="p-4 text-slate-500" colSpan={5}>
                  No rows match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
