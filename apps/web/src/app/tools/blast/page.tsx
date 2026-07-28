"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { BlastAlignmentView, BlastSummaryTable, type BlastHit } from "@/components/blast-alignment-view";

function toErrorMessage(payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object") return "BLAST request failed";
  const candidate = payload as {
    error?: unknown;
    message?: unknown;
  };
  if (typeof candidate.error === "string") return candidate.error;
  if (candidate.error && typeof candidate.error === "object") {
    return JSON.stringify(candidate.error);
  }
  if (typeof candidate.message === "string") return candidate.message;
  return JSON.stringify(payload);
}

export default function BlastPage() {
  const [sequence, setSequence] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ mode: string; databaseRecordCount: number; hits: BlastHit[] } | null>(null);

  const runBlast = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/tools/blast/run`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sequence }),
      });
      const payload = (await response.json()) as unknown;
      if (!response.ok) {
        throw new Error(toErrorMessage(payload));
      }
      if (!payload || typeof payload !== "object" || !("hits" in payload)) {
        throw new Error("BLAST response format is invalid");
      }
      setResult(payload as { mode: string; databaseRecordCount: number; hits: BlastHit[] });
    } catch (blastError) {
      setError(blastError instanceof Error ? blastError.message : "Unknown BLAST error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-6">
      <Link href="/" className="text-sm underline">
        Back to tools
      </Link>
      <h1 className="text-3xl font-bold">BLAST</h1>
      <p className="text-slate-600">
        Run local BLAST against all FASTA sequences available to the site. Results include NCBI-style pairwise
        alignments with coordinates on each subject.
      </p>
      <form className="space-y-3" onSubmit={runBlast}>
        <textarea
          value={sequence}
          onChange={(event) => setSequence(event.target.value)}
          className="h-56 w-full rounded-xl border p-3 font-mono text-sm"
          placeholder="Paste sequence..."
        />
        <div className="flex gap-3">
          <button disabled={loading} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60">
            {loading ? "Running..." : "Run local BLAST search"}
          </button>
          <a
            className="rounded border px-4 py-2"
            target="_blank"
            rel="noreferrer"
            href="https://blast.ncbi.nlm.nih.gov/Blast.cgi?PROGRAM=blastn&PAGE_TYPE=BlastSearch&LINK_LOC=blasthome"
          >
            Run on NCBI BLAST
          </a>
        </div>
      </form>

      {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {result && (
        <div className="space-y-4">
          <section className="rounded-xl border bg-white p-4">
            <p className="mb-2 text-sm text-slate-600">
              Mode: <span className="font-medium">{result.mode}</span> | FASTA records scanned:{" "}
              <span className="font-medium">{result.databaseRecordCount}</span>
            </p>
            <BlastSummaryTable hits={result.hits} />
          </section>
          <BlastAlignmentView hits={result.hits} mode={result.mode} />
        </div>
      )}
    </main>
  );
}
