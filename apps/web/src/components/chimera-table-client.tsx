"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type ChimeraRow = Record<string, string>;

const includes = (value: string | undefined, query: string) =>
  String(value ?? "").toLowerCase().includes(query.trim().toLowerCase());

export function ChimeraTableClient({
  columns,
  rows,
  organismId,
  datasetLabel,
  page,
  pageSize,
  total,
  search,
}: {
  columns: string[];
  rows: ChimeraRow[];
  organismId: string;
  datasetLabel: string;
  page: number;
  pageSize: number;
  total: number;
  search: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [globalSearch, setGlobalSearch] = useState(search);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(
    Object.fromEntries(columns.map((column) => [column, ""])),
  );
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const updateParams = (next: { page?: number; search?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.page && next.page > 1) params.set("page", String(next.page));
    else params.delete("page");
    params.set("pageSize", String(pageSize));
    const nextSearch = next.search ?? globalSearch;
    if (nextSearch.trim()) params.set("search", nextSearch.trim());
    else params.delete("search");
    router.push(`${pathname}?${params.toString()}`);
  };

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const passesColumnFilters = columns.every((column) => includes(row[column], columnFilters[column] ?? ""));
      if (!passesColumnFilters) return false;
      if (!globalSearch.trim()) return true;
      return columns.some((column) => includes(row[column], globalSearch));
    });
  }, [rows, columns, columnFilters, globalSearch]);

  const keyOf = (row: ChimeraRow, index: number) => `${row.snoRNA_ID ?? "row"}-${index}`;
  const selectedRows = filteredRows.filter((row, index) => selected[keyOf(row, index)]);

  const csvHref = useMemo(() => {
    if (!selectedRows.length || !columns.length) return "";
    const lines = selectedRows.map((row) =>
      columns.map((column) => `"${String(row[column] ?? "").replaceAll('"', '""')}"`).join(","),
    );
    return `data:text/csv;charset=utf-8,${encodeURIComponent([columns.join(","), ...lines].join("\n"))}`;
  }, [selectedRows, columns]);

  return (
    <main className="mx-auto max-w-[95rem] space-y-4 px-4 py-8 lg:px-8">
      <div className="space-y-2">
        <Link href={`/organisms/${organismId}/chimera`} className="text-sm text-cyan-700 underline">
          Back to Chimera cards
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">{datasetLabel}</h1>
        <p className="text-sm text-slate-600">
          Showing {filteredRows.length} of {rows.length} rows on page {page} ({total} total)
        </p>
        <p className="max-w-5xl pt-2 text-base text-slate-700">
        Each column represents an experimental condition. The table contains raw read counts of snoRNA-mRNA chimeras. 
        The Sum_plus_ligation column displays the total sum of the plus-ligation libraries 
        (specifically: LIGM_REP1, LIGP_REP1, MINUS_UV1, MINUS_UV2, PLUS_UV1, and PLUS_V2).
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Reference</h2>
        <p className="mt-2 text-sm text-slate-600">Reference will be added here.</p>
      </section>

      <section className="rounded-2xl border border-cyan-200 bg-white p-4 shadow-sm">
        <div className="mb-3 mt-5 md:w-[36rem]">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              updateParams({ page: 1, search: globalSearch });
            }}
          >
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm md:w-[28rem]"
              placeholder="Search all columns"
              value={globalSearch}
              onChange={(event) => setGlobalSearch(event.target.value)}
            />
            <button type="submit" className="rounded-lg bg-cyan-600 px-4 py-2 text-sm text-white">
              Search
            </button>
          </form>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {columns.map((column) => (
            <input
              key={column}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder={`Filter ${column}`}
              value={columnFilters[column] ?? ""}
              onChange={(event) =>
                setColumnFilters((prev) => ({
                  ...prev,
                  [column]: event.target.value,
                }))
              }
            />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3 text-sm">
          <span>Selected rows: {selectedRows.length}</span>
          <a
            href={csvHref || undefined}
            download={`${organismId}-${datasetLabel.toLowerCase().replaceAll(/\s+/g, "-")}.csv`}
            className={`rounded-lg px-3 py-1.5 ${selectedRows.length ? "bg-cyan-600 text-white" : "pointer-events-none bg-slate-200 text-slate-500"}`}
          >
            Download CSV
          </a>
        </div>
      </section>

      <section className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => updateParams({ page: page - 1 })}
          >
            Previous
          </button>
          <button
            className="rounded-md border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => updateParams({ page: page + 1 })}
          >
            Next
          </button>
        </div>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[1200px] w-full text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="p-3 text-left">
                <input
                  type="checkbox"
                  aria-label="Select all filtered rows"
                  checked={filteredRows.length > 0 && filteredRows.every((row, index) => selected[keyOf(row, index)])}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setSelected((prev) => {
                      const next = { ...prev };
                      filteredRows.forEach((row, index) => {
                        next[keyOf(row, index)] = checked;
                      });
                      return next;
                    });
                  }}
                />
              </th>
              {columns.map((column) => (
                <th key={column} className="p-3 text-left">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, index) => {
              const key = keyOf(row, index);
              return (
                <tr key={key} className="border-t">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      aria-label={`Select row ${index + 1}`}
                      checked={!!selected[key]}
                      onChange={(event) => setSelected((prev) => ({ ...prev, [key]: event.target.checked }))}
                    />
                  </td>
                  {columns.map((column) => (
                    <td key={`${key}-${column}`} className="p-3 align-top">
                      {column === "snoRNA_ID" && row[column] ? (
                        <Link href={`/snorna/${row[column]}`} className="text-blue-700 underline">
                          {row[column]}
                        </Link>
                      ) : (
                        row[column] ?? ""
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
            {!filteredRows.length && (
              <tr>
                <td className="p-4 text-slate-500" colSpan={Math.max(columns.length + 1, 2)}>
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
