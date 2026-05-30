"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ClusterItem = {
  snornaId: string;
  linkedSnornaId: string | null;
  isAvailable: boolean;
  boxType: string | null;
  geneLengthNt: number | null;
  intergenicLengthNt: string | null;
};

type ClusterRow = {
  clusterId: number;
  coordinates: string | null;
  repeatedInGenome: number | null;
  referenceUrl: string | null;
  items: ClusterItem[];
};

export function SnornaClusterViewer({ clusters }: { clusters: ClusterRow[] }) {
  const [search, setSearch] = useState("");
  const [clusterFilter, setClusterFilter] = useState("");

  const filteredClusters = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    const clusterId = Number(clusterFilter);
    return clusters.filter((cluster) => {
      if (clusterFilter.trim() && (!Number.isFinite(clusterId) || cluster.clusterId !== clusterId)) {
        return false;
      }
      if (!searchValue) return true;
      return cluster.items.some((item) => item.snornaId.toLowerCase().includes(searchValue));
    });
  }, [clusterFilter, clusters, search]);

  return (
    <section className="rounded-xl border bg-white p-4">
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <label className="text-sm text-slate-700">
          Search snoRNA ID
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="e.g. TB9Cs4C1"
            className="mt-1 block w-full rounded border px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-slate-700">
          Filter by cluster ID
          <input
            value={clusterFilter}
            onChange={(event) => setClusterFilter(event.target.value)}
            placeholder="e.g. 31"
            className="mt-1 block w-full rounded border px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="space-y-4">
        {filteredClusters.map((cluster) => (
          <article key={cluster.clusterId} className="rounded border p-3">
            <header className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <strong>Cluster {cluster.clusterId}</strong>
              <span>Coordinates: {cluster.coordinates ?? "N/A"}</span>
              <span>Repeats: {cluster.repeatedInGenome ?? "N/A"}</span>
              {cluster.referenceUrl ? (
                <a href={cluster.referenceUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                  Reference
                </a>
              ) : null}
            </header>

            <div className="overflow-x-auto">
              <div className="inline-flex min-w-max items-center gap-2 pb-1">
                {cluster.items.map((item, index) => (
                  <div key={`${cluster.clusterId}-${index}-${item.snornaId}`} className="inline-flex items-center gap-2">
                    {item.isAvailable && item.linkedSnornaId ? (
                      <Link href={`/snorna/${encodeURIComponent(item.linkedSnornaId)}`} className="rounded border bg-white px-2 py-1 text-xs font-semibold hover:bg-cyan-50">
                        {item.snornaId}
                      </Link>
                    ) : (
                      <span
                        title="No matching snoRNA entry found"
                        className="rounded border border-dashed bg-slate-100 px-2 py-1 text-xs text-slate-500"
                      >
                        {item.snornaId}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-500">{item.boxType ?? "N/A"}</span>
                    {index < cluster.items.length - 1 ? <span className="text-slate-400">-</span> : null}
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>

      {!filteredClusters.length ? <p className="mt-4 text-sm text-slate-500">No clusters match your filters.</p> : null}
    </section>
  );
}
