import Link from "next/link";
import {
  getOrganismNcbiGenomeReferenceUrl,
  tritrypdbDownloadsUrl,
} from "@/lib/organism-genome-references";

export default async function OrganismGenomeReferencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ncbiUrl = getOrganismNcbiGenomeReferenceUrl(id);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <Link href={`/organisms/${id}`} className="inline-block text-sm text-cyan-700 underline">
        Back to Organism
      </Link>

      <section className="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-100 to-orange-100 p-6">
        <h1 className="text-3xl font-bold text-slate-900">Genome reference</h1>
        <p className="mt-2 text-slate-700">Choose TriTrypDB or NCBI genome resources.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <a
          href={tritrypdbDownloadsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-50"
        >
          <h2 className="text-xl font-semibold text-amber-900">TriTrypDB</h2>
          <p className="mt-2 text-sm text-slate-600">Download genome data from TriTrypDB.</p>
        </a>

        {ncbiUrl ? (
          <a
            href={ncbiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl border border-orange-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-50"
          >
            <h2 className="text-xl font-semibold text-orange-900">NCBI</h2>
            <p className="mt-2 text-sm text-slate-600">View the NCBI genome assembly for this organism.</p>
          </a>
        ) : null}
      </section>
    </main>
  );
}
