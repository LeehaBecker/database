import Link from "next/link";

export default async function OrganismChimeraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <Link href={`/organisms/${id}`} className="inline-block text-sm text-cyan-700 underline">
        Back to Organism
      </Link>

      <section className="rounded-3xl border border-cyan-200 bg-gradient-to-r from-cyan-100 to-indigo-100 p-6">
        <h1 className="text-3xl font-bold text-slate-900">Chimera Data</h1>
        <p className="mt-2 text-slate-700">Choose a data type to explore organism-specific records.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link
          href={`/organisms/${id}/chimera/snorna-rrna`}
          className="rounded-2xl border border-cyan-200 bg-white p-5 shadow-sm transition hover:bg-cyan-50"
        >
          <h2 className="text-xl font-semibold text-cyan-900">snoRNA - rRNA Chimeras</h2>
          <p className="mt-2 text-sm text-slate-600">Browse snoRNAs, filter by columns, and export selected rows.</p>
        </Link>
        <Link
          href={`/organisms/${id}/chimera/snorna-mrna`}
          className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm transition hover:bg-violet-50"
        >
          <h2 className="text-xl font-semibold text-violet-900">snoRNA - mRNA Chimeras</h2>
          <p className="mt-2 text-sm text-slate-600">
            Scan for chimera raw reads, filter and export selected rows.
          </p>
        </Link>
      </section>
    </main>
  );
}
