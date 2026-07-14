"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/site-breadcrumbs";
import { genomeBrowserUrl } from "@/lib/site-config";

type GenomicLocation = { chr: string; start: number; end: number; strand: string };

type SnoRow = {
  id: string;
  snoRNAId: string;
  boxType: string;
  targetType: string;
  targetCount: number;
  hasHomolog: boolean;
  singleCopyGene: string | null;
  genomicLocations?: GenomicLocation[];
};

type SortKey = keyof Pick<SnoRow, "snoRNAId" | "boxType" | "targetType" | "targetCount" | "singleCopyGene">;

const matches = (value: string | number, filter: string) =>
  String(value).toLowerCase().includes(filter.trim().toLowerCase());

const formatHasHomolog = (hasHomolog: boolean) => (hasHomolog ? "Yes" : "No");
const formatSingleCopyGene = (value: string | null) => value?.trim() || "No";

export function SnornaTableClient({ rows, organismId, total }: { rows: SnoRow[]; organismId: string; total: number }) {
  const [filters, setFilters] = useState({
    snoRNAId: "",
    boxType: "",
    targetType: "",
    targetCount: "",
    hasHomolog: "",
    singleCopyGene: "",
  });
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [sortKey, setSortKey] = useState<SortKey>("snoRNAId");
  const [sortAsc, setSortAsc] = useState(true);

  const filteredRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          matches(row.snoRNAId, filters.snoRNAId) &&
          matches(row.boxType, filters.boxType) &&
          matches(row.targetType, filters.targetType) &&
          matches(row.targetCount, filters.targetCount) &&
          matches(formatHasHomolog(row.hasHomolog), filters.hasHomolog) &&
          matches(formatSingleCopyGene(row.singleCopyGene), filters.singleCopyGene),
      ),
    [rows, filters],
  );

  const sortedRows = useMemo(() => {
    const copy = [...filteredRows];
    copy.sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
      const cmp = typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right));
      return sortAsc ? cmp : -cmp;
    });
    return copy;
  }, [filteredRows, sortKey, sortAsc]);

  const selectedRows = sortedRows.filter((row) => selectedIds[row.id]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const csvHref = useMemo(() => {
    if (!selectedRows.length) return "";
    const header = ["snoRNA ID", "Box Type", "Target Type", "Target Count", "Has a homolog", "Single copy gene"];
    const csv = [
      header.join(","),
      ...selectedRows.map((row) =>
        [row.snoRNAId, row.boxType, row.targetType, String(row.targetCount), formatHasHomolog(row.hasHomolog), formatSingleCopyGene(row.singleCopyGene)].join(","),
      ),
    ].join("\n");
    return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  }, [selectedRows]);

  const bedHref = useMemo(() => {
    if (!selectedRows.length) return "";
    const lines = selectedRows.flatMap((row) =>
      (row.genomicLocations ?? []).map(
        (loc) => `${loc.chr}\t${loc.start}\t${loc.end}\t${row.snoRNAId}\t0\t${loc.strand || "."}`,
      ),
    );
    if (!lines.length) return "";
    return `data:text/plain;charset=utf-8,${encodeURIComponent(lines.join("\n"))}`;
  }, [selectedRows]);

  const sortIndicator = (key: SortKey) => (sortKey === key ? (sortAsc ? " ↑" : " ↓") : "");

  return (
    <PageShell className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">snoRNA Data</h1>
        <p className="text-sm text-slate-600">Showing {rows.length} of {total} snoRNAs</p>
      </div>

      <section className="rounded-2xl border border-cyan-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          {(["snoRNAId", "boxType", "targetType", "targetCount", "hasHomolog", "singleCopyGene"] as const).map((key) => (
            <input
              key={key}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder={`Filter ${key}`}
              value={filters[key]}
              onChange={(event) => setFilters((prev) => ({ ...prev, [key]: event.target.value }))}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span>Selected rows: {selectedRows.length}</span>
          <a href={csvHref || undefined} download={`${organismId}-snorna-selection.csv`} className={`rounded-lg px-3 py-1.5 ${selectedRows.length ? "bg-cyan-600 text-white" : "bg-slate-200 text-slate-500 pointer-events-none"}`}>
            Download CSV
          </a>
          <a href={bedHref || undefined} download={`${organismId}-snorna-selection.bed`} className={`rounded-lg px-3 py-1.5 ${bedHref ? "border border-cyan-600 text-cyan-700" : "bg-slate-200 text-slate-500 pointer-events-none"}`}>
            Export BED
          </a>
        </div>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[1300px] w-full text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="p-3 text-left">
                <input
                  type="checkbox"
                  aria-label="Select all filtered rows"
                  checked={sortedRows.length > 0 && sortedRows.every((row) => selectedIds[row.id])}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setSelectedIds((prev) => {
                      const next = { ...prev };
                      for (const row of sortedRows) next[row.id] = checked;
                      return next;
                    });
                  }}
                />
              </th>
              {([
                ["snoRNAId", "snoRNA ID"],
                ["boxType", "Box Type"],
                ["targetType", "Target Type"],
                ["targetCount", "Target Count"],
              ] as const).map(([key, label]) => (
                <th key={key} className="cursor-pointer p-3 text-left hover:bg-slate-200" onClick={() => toggleSort(key)}>
                  {label}{sortIndicator(key)}
                </th>
              ))}
              <th className="p-3 text-left">Has a homolog</th>
              <th className="cursor-pointer p-3 text-left hover:bg-slate-200" onClick={() => toggleSort("singleCopyGene")}>
                Single copy gene{sortIndicator("singleCopyGene")}
              </th>
              <th className="p-3 text-left">Genomic locus</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-3">
                  <input type="checkbox" checked={!!selectedIds[item.id]} onChange={(e) => setSelectedIds((prev) => ({ ...prev, [item.id]: e.target.checked }))} />
                </td>
                <td className="p-3">
                  <Link className="text-blue-700 underline" href={`/snorna/${item.snoRNAId}`}>{item.snoRNAId}</Link>
                </td>
                <td className="p-3">{item.boxType}</td>
                <td className="p-3">{item.targetType}</td>
                <td className="p-3">{item.targetCount}</td>
                <td className="p-3">{formatHasHomolog(item.hasHomolog)}</td>
                <td className="p-3">{formatSingleCopyGene(item.singleCopyGene)}</td>
                <td className="p-3 text-xs">
                  {(item.genomicLocations ?? []).length ? (
                    item.genomicLocations!.map((loc, i) => (
                      <Link key={i} href={genomeBrowserUrl(loc.chr, loc.start, loc.end)} className="block text-cyan-700 underline">
                        {loc.chr}:{loc.start}-{loc.end}
                      </Link>
                    ))
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {!sortedRows.length && (
              <tr><td className="p-4 text-slate-500" colSpan={8}>No rows match the current filters.</td></tr>
            )}
          </tbody>
        </table>
      </section>
      <p className="text-xs text-slate-500">Dataset: TriTrypDB-68 · Click column headers to sort</p>
    </PageShell>
  );
}
