import Link from "next/link";
import { PageShell } from "@/components/site-breadcrumbs";
import { CopyButton } from "@/components/copy-button";

const bibtex = `@misc{snorna_biu,
  title  = {snoRNA-BIU: Kinetoplastid snoRNA and rRNA Modification Database},
  author = {Bar-Ilan University},
  year   = {2026},
  url    = {https://snorna-biu.example.org}
}`;

export default function CitePage() {
  return (
    <PageShell className="max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold">How to Cite</h1>
      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-xl font-semibold">Recommended citation</h2>
        <p className="text-sm leading-relaxed">
          Bar-Ilan University. snoRNA-BIU: Kinetoplastid snoRNA and rRNA Modification Database.
          Available at: snoRNA-BIU web portal. Accessed {new Date().toISOString().slice(0, 10)}.
        </p>
      </section>
      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">BibTeX</h2>
          <CopyButton text={bibtex} label="Copy BibTeX" />
        </div>
        <pre className="overflow-x-auto rounded-lg bg-slate-100 p-4 text-xs">{bibtex}</pre>
      </section>
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Related publications</h2>
        <p className="mt-2 text-sm text-slate-700">
          See the <Link href="/articles" className="text-cyan-700 underline">Articles</Link> page for PubMed-linked publications associated with this database.
        </p>
      </section>
    </PageShell>
  );
}
