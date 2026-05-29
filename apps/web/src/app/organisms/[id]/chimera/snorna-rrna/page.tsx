import Link from "next/link";

export default async function OrganismSnornaRrnaChimerasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <Link href={`/organisms/${id}/chimera`} className="inline-block text-sm text-cyan-700 underline">
        Back to Chimera cards
      </Link>
      <section className="rounded-2xl border border-cyan-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">snoRNA - rRNA Chimeras</h1>
        <p className="mt-2 text-slate-600">
          This table is a placeholder and will be populated as soon as the snoRNA-rRNA chimera source file is added.
        </p>
      </section>
    </main>
  );
}
