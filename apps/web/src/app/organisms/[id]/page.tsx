import Link from "next/link";

const prettyName = (slug: string) =>
  slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export default async function OrganismLandingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="mx-auto min-h-screen max-w-6xl space-y-6 px-6 py-8">
      <Link href="/" className="inline-block text-sm text-cyan-700 underline">
        Back to homepage
      </Link>

      <section className="rounded-3xl border border-cyan-200 bg-gradient-to-r from-cyan-100 to-indigo-100 p-6">
        <h1 className="text-3xl font-bold text-slate-900">{prettyName(id)}</h1>
        <p className="mt-2 text-slate-700">Choose a data type to explore organism-specific records.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link
          href={`/organisms/${id}/snorna`}
          className="rounded-2xl border border-cyan-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:bg-cyan-50"
        >
          <h2 className="text-xl font-semibold text-cyan-900">snoRNA Data</h2>
          <p className="mt-2 text-sm text-slate-600">
            Browse snoRNAs, filter by columns, and export selected rows.
          </p>
        </Link>

        <Link
          href={`/organisms/${id}/rrna`}
          className="rounded-2xl border border-violet-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:bg-violet-50"
        >
          <h2 className="text-xl font-semibold text-violet-900">rRNA Data</h2>
          <p className="mt-2 text-sm text-slate-600">
            Explore sequence maps, modification sites, and related structure assets.
          </p>
        </Link>

        <Link
          href={`/organisms/${id}/chimera`}
          className="rounded-2xl border border-sky-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50"
        >
          <h2 className="text-xl font-semibold text-sky-900">Chimera Data</h2>
          <p className="mt-2 text-sm text-slate-600">
            Browse Chimera, filter by columns, and export selected rows.
          </p>
        </Link>

        <Link
          href={`/organisms/${id}/snorna-clusters`}
          className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-50"
        >
          <h2 className="text-xl font-semibold text-emerald-900">snoRNA Clusters</h2>
          <p className="mt-2 text-sm text-slate-600">
            Explore snoRNA cluster diagrams with clickable labels linked to snoRNA entries.
          </p>
        </Link>
      </section>
    </main>
  );
}
