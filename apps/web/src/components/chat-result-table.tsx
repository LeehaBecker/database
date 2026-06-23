"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Download } from "lucide-react";

export type ChatTableData = {
  title: string;
  columns: string[];
  rows: (string | number)[][];
  linkColumns?: number[];
};

function escapeCsvCell(value: string | number): string {
  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function ChatResultTable({ table }: { table: ChatTableData }) {
  const linkColumnSet = useMemo(() => new Set(table.linkColumns ?? []), [table.linkColumns]);

  const csvHref = useMemo(() => {
    if (!table.rows.length) return "";
    const csv = [
      table.columns.map(escapeCsvCell).join(","),
      ...table.rows.map((row) => row.map(escapeCsvCell).join(",")),
    ].join("\n");
    return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  }, [table]);

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-600">{table.title}</p>
        {csvHref && (
          <a
            href={csvHref}
            download="snopy-results.csv"
            className="inline-flex items-center gap-1 rounded-md bg-cyan-600 px-2 py-1 text-xs text-white hover:bg-cyan-700"
          >
            <Download className="h-3 w-3" />
            CSV
          </a>
        )}
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[480px] text-xs">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              {table.columns.map((col) => (
                <th key={col} className="whitespace-nowrap p-2 text-left font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-slate-100">
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="whitespace-nowrap p-2 text-slate-800">
                    {linkColumnSet.has(colIndex) ? (
                      <Link className="text-blue-700 underline hover:text-blue-900" href={`/snorna/${cell}`}>
                        {cell}
                      </Link>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {!table.rows.length && (
              <tr>
                <td className="p-3 text-slate-500" colSpan={table.columns.length}>
                  No matching records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
