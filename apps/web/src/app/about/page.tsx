import Link from "next/link";
import { PageShell } from "@/components/site-breadcrumbs";

export default function AboutPage() {
  return (
    <PageShell className="max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold">About snoRNA-BIU</h1>
      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
        <p>
          snoRNA-BIU is a specialized database for small nucleolar RNAs (snoRNAs) and ribosomal RNA (rRNA)
          modification data in kinetoplastid parasites, developed at Bar-Ilan University.
        </p>
        <p>
          The database integrates curated snoRNA catalogs, rRNA modification sites, genomic locations,
          cross-species homolog relationships, gene clusters, and experimental chimera data for comparative
          RNA biology research.
        </p>
      </section>
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Organisms covered</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li><strong>Trypanosoma brucei</strong> — African trypanosomiasis (sleeping sickness)</li>
          <li><strong>Leishmania major</strong> — cutaneous leishmaniasis</li>
          <li><em>Leishmania donovani</em> homolog references (organism page planned)</li>
        </ul>
      </section>
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Data sources</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li><a className="text-cyan-700 underline" href="https://tritrypdb.org" target="_blank" rel="noreferrer">TriTrypDB</a> (genome release TriTrypDB-68, TREU927)</li>
          <li><a className="text-cyan-700 underline" href="https://www.ncbi.nlm.nih.gov" target="_blank" rel="noreferrer">NCBI</a> — PubMed references and structure data</li>
          <li>Lab-curated snoRNA/rRNA annotation tables and experimental datasets</li>
        </ul>
      </section>
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Citation</h2>
        <p className="mt-2">Please cite this resource when using data in publications. See the <Link href="/cite" className="text-cyan-700 underline">Cite</Link> page for BibTeX and recommended text.</p>
      </section>
    </PageShell>
  );
}
