import { PageShell } from "@/components/site-breadcrumbs";

const endpoints = [
  { method: "GET", path: "/health", description: "API health check" },
  { method: "GET", path: "/stats", description: "Database statistics (snoRNA counts, modifications, homolog pairs)" },
  { method: "GET", path: "/organisms", description: "List organisms" },
  { method: "GET", path: "/snorna?species=&page=&pageSize=&search=&type=", description: "List/filter snoRNAs" },
  { method: "GET", path: "/snorna/:id", description: "snoRNA detail with targets, locations, modifications" },
  { method: "GET", path: "/snorna/clusters?species=", description: "snoRNA gene clusters" },
  { method: "GET", path: "/rrna?species=", description: "rRNA units and sequence" },
  { method: "GET", path: "/rrna/modifications?species=", description: "rRNA modification sites" },
  { method: "POST", path: "/tools/blast/run", description: "Run BLASTn against local FASTA database" },
  { method: "GET", path: "/tools/genome-browser/chromosomes", description: "Chromosome list and lengths" },
  { method: "GET", path: "/tools/genome-browser/features?chr=&start=&end=", description: "GTF features in window" },
  { method: "GET", path: "/tools/genome-browser/sequence?chr=&start=&end=", description: "Genomic sequence slice" },
  { method: "GET", path: "/tools/genome-browser/search?q=", description: "Search genes/transcripts" },
  { method: "GET", path: "/tools/interactions?mode=byPosition&species=&subunit=&position=", description: "Guiding snoRNAs for rRNA position" },
  { method: "GET", path: "/tools/interactions?mode=bySnorna&species=&snornaId=", description: "rRNA targets for a snoRNA" },
  { method: "GET", path: "/tools/homologs?boxType=&search=", description: "Cross-species homolog pairs (TB↔LM)" },
  { method: "GET", path: "/tools/homologs/compare?tbId=&lmId=", description: "Compare two homolog sequences" },
  { method: "POST", path: "/tools/sequence/fasta-fetch", description: "Body: { ids: string[] } → multi-FASTA" },
  { method: "GET", path: "/tools/sequence/motif-search?type=cd-box|aca|custom&q=", description: "Motif search across snoRNAs" },
  { method: "GET", path: "/tools/sequence/coordinate-converter?species=&subunit=&position=", description: "rRNA coordinate conversion" },
  { method: "GET", path: "/downloads/snorna.fasta?organism=", description: "Download snoRNA FASTA" },
  { method: "GET", path: "/downloads/modifications.csv?organism=", description: "Download modifications CSV" },
  { method: "GET", path: "/downloads/clusters.csv?organism=", description: "Download clusters CSV" },
  { method: "GET", path: "/downloads/bundle.txt?organism=", description: "Combined text bundle" },
  { method: "GET", path: "/articles", description: "Publication list" },
];

export default function ApiDocsPage() {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  return (
    <PageShell className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">API Documentation</h1>
        <p className="mt-2 text-slate-600">Base URL: <code className="rounded bg-slate-200 px-1">{base}</code></p>
      </div>
      <div className="space-y-3">
        {endpoints.map((ep) => (
          <article key={`${ep.method}-${ep.path}`} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-xs font-mono ${ep.method === "POST" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>
                {ep.method}
              </span>
              <code className="text-sm">{ep.path}</code>
            </div>
            <p className="mt-2 text-sm text-slate-600">{ep.description}</p>
            <pre className="mt-2 overflow-x-auto rounded bg-slate-100 p-2 text-xs">
              curl &quot;{base}{ep.path.split("?")[0]}&quot;
            </pre>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
