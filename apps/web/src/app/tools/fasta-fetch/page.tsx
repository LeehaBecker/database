import Link from "next/link";
import { PageShell } from "@/components/site-breadcrumbs";
import { FastaFetchTool } from "@/components/fasta-fetch-tool";

export default function FastaFetchPage() {
  return (
    <PageShell className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Multi-FASTA Fetch</h1>
        <p className="mt-2 text-slate-600">Paste snoRNA IDs to retrieve sequences. Also available via <Link href="/tools/blast" className="text-cyan-700 underline">Quick BLAST</Link>.</p>
      </div>
      <FastaFetchTool />
    </PageShell>
  );
}
