"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { HomologCompareView, type HomologCompareResult } from "@/components/homolog-compare-view";
import { PUBLIC_API_BASE } from "@/lib/api";

export function HomologCompareClient() {
  const searchParams = useSearchParams();
  const tbId = searchParams.get("tbId")?.trim() ?? "";
  const lmId = searchParams.get("lmId")?.trim() ?? "";
  const [data, setData] = useState<HomologCompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tbId || !lmId) {
      setLoading(false);
      setError("tbId and lmId are required.");
      setData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    fetch(`${PUBLIC_API_BASE}/tools/homologs/compare?tbId=${encodeURIComponent(tbId)}&lmId=${encodeURIComponent(lmId)}`)
      .then(async (res) => {
        const payload = (await res.json()) as HomologCompareResult & { error?: string };
        if (!res.ok) {
          throw new Error(payload.error ?? `Compare failed (${res.status})`);
        }
        if (!payload.tb || !payload.lm || !Array.isArray(payload.segments)) {
          throw new Error("Compare response is missing alignment data.");
        }
        return payload;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load homolog comparison.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tbId, lmId]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Homolog comparison</h1>
        <p className="mt-2 text-slate-600">
          Pairwise Needle alignment of T. brucei and L. major snoRNA homologs, shown in NCBI BLAST format.
        </p>
        <Link href="/tools/homologs" className="mt-2 inline-block text-sm text-cyan-700 underline">
          Back to Homolog Explorer
        </Link>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading alignment…</p>}
      {error && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</section>
      )}
      {data && <HomologCompareView data={data} />}
    </div>
  );
}
