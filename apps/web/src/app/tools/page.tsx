import Link from "next/link";
import { PageShell } from "@/components/site-breadcrumbs";

const tools = [
  { href: "/tools/blast", title: "BLAST", description: "Search local FASTA databases with BLASTn.", color: "violet" },
  { href: "/tools/genome-browser", title: "Genome Browser", description: "UCSC-style browser for T. brucei annotations.", color: "violet" },
  { href: "/tools/interactions", title: "snoRNA–rRNA Interactions", description: "Find guiding snoRNAs by rRNA position or vice versa.", color: "cyan" },
  { href: "/tools/homologs", title: "Homolog Explorer", description: "Browse and compare TB↔LM homolog pairs.", color: "emerald" },
  { href: "/tools/fasta-fetch", title: "FASTA Fetch", description: "Paste snoRNA IDs and download sequences.", color: "sky" },
  { href: "/tools/motif-search", title: "Motif Search", description: "Find C/D box or ACA motifs across snoRNAs.", color: "sky" },
  { href: "/tools/coordinate-converter", title: "Coordinate Converter", description: "Convert rRNA subunit positions to absolute coordinates.", color: "amber" },
];

export default function ToolsHubPage() {
  return (
    <PageShell className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analysis Tools</h1>
        <p className="mt-2 text-slate-600">Research utilities for snoRNA and rRNA exploration.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-slate-900">{tool.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{tool.description}</p>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
