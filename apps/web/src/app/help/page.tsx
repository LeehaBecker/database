import Link from "next/link";
import { PageShell } from "@/components/site-breadcrumbs";

const faqs = [
  {
    q: "What are C/D and H/ACA snoRNAs?",
    a: "C/D box snoRNAs guide 2'-O-methylation (Nm) of rRNA. H/ACA box snoRNAs guide pseudouridylation (Psi). Box motifs and target regions are color-highlighted on snoRNA detail pages.",
  },
  {
    q: "How do I search for a snoRNA?",
    a: "Use the search bar in the header or home page with a snoRNA ID (e.g. TB10Cs1C1). You can also browse organism-specific tables under Organisms.",
  },
  {
    q: "How is the BLAST database built?",
    a: "BLAST searches all FASTA files in the data directory, including snoRNA sequences, rRNA, genome, transcript, and CDS datasets for T. brucei.",
  },
  {
    q: "What coordinates does the genome browser use?",
    a: "The local genome browser uses TriTrypDB-68 T. brucei TREU927 GTF and genome FASTA coordinates (Tb927_* chromosomes).",
  },
  {
    q: "How do homolog pairs work?",
    a: "TB and LM snoRNAs are linked via curated homolog ID fields. Use the Homolog Explorer to filter and compare pairs. LD homolog IDs are listed but not yet linked to a dedicated organism page.",
  },
  {
    q: "How do I download bulk data?",
    a: "Visit the Downloads page for per-organism FASTA, CSV, and combined bundle exports. API endpoints are documented on the API Docs page.",
  },
];

export default function HelpPage() {
  return (
    <PageShell className="max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold">Help & FAQ</h1>
      <div className="space-y-4">
        {faqs.map((item) => (
          <article key={item.q} className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">{item.q}</h2>
            <p className="mt-2 text-sm text-slate-700">{item.a}</p>
          </article>
        ))}
      </div>
      <p className="text-sm text-slate-600">
        More questions? Browse <Link href="/articles" className="text-cyan-700 underline">publications</Link> or use the Snopy assistant (when enabled).
      </p>
    </PageShell>
  );
}
