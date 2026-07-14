import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { ORGANISM_INFO, prettyOrganismName } from "@/lib/site-config";
import { PageShell } from "@/components/site-breadcrumbs";

export default async function OrganismLandingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stats = await apiFetch<{ organisms: Array<{ slug: string; snornaTotal: number; modificationNm: number; modificationPsi: number; clusterItems: number }> }>("/stats");
  const orgStats = stats.organisms.find((o) => o.slug === id);
  const info = ORGANISM_INFO[id];

  return (
    <PageShell className="space-y-6">
      <section className="rounded-3xl border border-cyan-200 bg-gradient-to-r from-cyan-100 to-indigo-100 p-6">
        <h1 className="text-3xl font-bold text-slate-900">{prettyOrganismName(id)}</h1>
        {info && (
          <>
            <p className="mt-2 text-slate-700">{info.description}</p>
            <p className="mt-1 text-sm text-slate-600">Disease: {info.disease}</p>
          </>
        )}
        {orgStats && (
          <dl className="mt-4 flex flex-wrap gap-4 text-sm">
            <div><dt className="text-slate-500">snoRNAs</dt><dd className="text-lg font-semibold">{orgStats.snornaTotal}</dd></div>
            <div><dt className="text-slate-500">Nm sites</dt><dd className="text-lg font-semibold">{orgStats.modificationNm}</dd></div>
            <div><dt className="text-slate-500">Psi sites</dt><dd className="text-lg font-semibold">{orgStats.modificationPsi}</dd></div>
            {orgStats.clusterItems > 0 && (
              <div><dt className="text-slate-500">Cluster items</dt><dd className="text-lg font-semibold">{orgStats.clusterItems}</dd></div>
            )}
          </dl>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link href={`/organisms/${id}/snorna`} className="rounded-2xl border border-cyan-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:bg-cyan-50">
          <h2 className="text-xl font-semibold text-cyan-900">snoRNA Data</h2>
          <p className="mt-2 text-sm text-slate-600">Browse, filter, sort, and export snoRNA records.</p>
        </Link>
        <Link href={`/organisms/${id}/rrna`} className="rounded-2xl border border-violet-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:bg-violet-50">
          <h2 className="text-xl font-semibold text-violet-900">rRNA Data</h2>
          <p className="mt-2 text-sm text-slate-600">Sequence maps, modification sites, and structure assets.</p>
        </Link>
        <Link href={`/organisms/${id}/chimera`} className="rounded-2xl border border-sky-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50">
          <h2 className="text-xl font-semibold text-sky-900">Chimera Data</h2>
          <p className="mt-2 text-sm text-slate-600">Experimental snoRNA chimera datasets.</p>
        </Link>
        <Link href={`/organisms/${id}/snorna-clusters`} className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-50">
          <h2 className="text-xl font-semibold text-emerald-900">snoRNA Clusters</h2>
          <p className="mt-2 text-sm text-slate-600">Genomic cluster diagrams with linked snoRNA IDs.</p>
        </Link>
        {id === "trypanosoma-brucei" && (
          <Link href={`/organisms/${id}/genome-reference`} className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-50">
            <h2 className="text-xl font-semibold text-amber-900">Genome reference</h2>
            <p className="mt-2 text-sm text-slate-600">TriTrypDB and NCBI genome resources.</p>
          </Link>
        )}
        <Link href={`/tools/interactions?species=${id}`} className="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-50">
          <h2 className="text-xl font-semibold text-rose-900">Interaction viewer</h2>
          <p className="mt-2 text-sm text-slate-600">Explore snoRNA–rRNA modification relationships.</p>
        </Link>
      </section>
    </PageShell>
  );
}
