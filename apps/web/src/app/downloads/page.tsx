import { PageShell } from "@/components/site-breadcrumbs";
import { downloadUrl } from "@/lib/api";
import { ORGANISMS } from "@/lib/site-config";

export default function DownloadsPage() {
  return (
    <PageShell className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Download Center</h1>
        <p className="mt-2 text-slate-600">Bulk export of snoRNA-BIU data per organism.</p>
      </div>
      {ORGANISMS.map((org) => (
        <section key={org.slug} className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">{org.name}</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={downloadUrl(`/downloads/snorna.fasta?organism=${org.slug}`)}
              className="rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm hover:bg-cyan-100"
            >
              snoRNA FASTA
            </a>
            <a
              href={downloadUrl(`/downloads/modifications.csv?organism=${org.slug}`)}
              className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm hover:bg-violet-100"
            >
              Modifications CSV
            </a>
            {org.slug === "trypanosoma-brucei" && (
              <a
                href={downloadUrl(`/downloads/clusters.csv?organism=${org.slug}`)}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm hover:bg-emerald-100"
              >
                Clusters CSV
              </a>
            )}
            <a
              href={downloadUrl(`/downloads/bundle.txt?organism=${org.slug}`)}
              className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm hover:bg-slate-200"
            >
              Combined bundle (.txt)
            </a>
          </div>
        </section>
      ))}
      <p className="text-sm text-slate-500">
        For programmatic access, see <a href="/api-docs" className="text-cyan-700 underline">API Documentation</a>.
      </p>
    </PageShell>
  );
}
