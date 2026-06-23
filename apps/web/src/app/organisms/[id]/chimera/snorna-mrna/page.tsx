import Link from "next/link";

export default async function OrganismSnornaMrnaChimerasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-[95rem] space-y-4 px-4 py-8 lg:px-8">
      <div className="space-y-2">
        <Link href={`/organisms/${id}/chimera`} className="text-sm text-cyan-700 underline">
          Back to Chimera cards
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">snoRNA - mRNA Chimeras</h1>
        <p className="max-w-5xl pt-2 text-base text-slate-700">
          Each column represents an experimental condition. The table contains raw read counts of snoRNA-mRNA chimeras.
          The Sum_plus_ligation column displays the total sum of the plus-ligation libraries (specifically: LIGM_REP1,
          LIGP_REP1, MINUS_UV1, MINUS_UV2, PLUS_UV1, and PLUS_V2).
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Reference</h2>
        <p className="mt-2 text-sm text-slate-600">Reference will be added here.</p>
      </section>
    </main>
  );
}
