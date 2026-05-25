import Link from "next/link";

export default async function OrganismRrnaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <Link href={`/organisms/${id}`} className="inline-block text-sm text-cyan-700 underline">
        Back to Organism
      </Link>
      <section className="rounded-3xl border border-violet-200 bg-gradient-to-r from-cyan-100 to-violet-100 p-6">
        <h1 className="text-3xl font-bold text-slate-900">rRNA Data</h1>
        <p className="mt-2 text-slate-700">Choose a section to open on a dedicated page.</p>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <Link href={`/organisms/${id}/rrna/sequence`} className="rounded-2xl border border-cyan-200 bg-white p-5 shadow-sm transition hover:bg-cyan-50">
          <h2 className="text-xl font-semibold text-cyan-900">Sequence</h2>
          <p className="mt-2 text-sm text-slate-600">Subunit map, coordinate table, colored sequence, and FASTA download.</p>
        </Link>
        <Link
          href={`/organisms/${id}/rrna/modifications`}
          className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm transition hover:bg-blue-50"
        >
          <h2 className="text-xl font-semibold text-blue-900">Modification Sites</h2>
          <p className="mt-2 text-sm text-slate-600">Filterable table with row selection and CSV export.</p>
        </Link>
        <Link
          href={`/organisms/${id}/rrna/secondary-structure`}
          className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm transition hover:bg-emerald-50"
        >
          <h2 className="text-xl font-semibold text-emerald-900">Secondary Structure</h2>
          <p className="mt-2 text-sm text-slate-600">View embedded PDF structures directly in the page.</p>
        </Link>
        <Link
          href={`/organisms/${id}/rrna/3d-structure`}
          className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm transition hover:bg-amber-50"
        >
          <h2 className="text-xl font-semibold text-amber-900">3D Structure</h2>
          <p className="mt-2 text-sm text-slate-600">Interactive Mol* viewer loaded from local 8ova.cif.</p>
        </Link>
      </section>
    </main>
  );
}
