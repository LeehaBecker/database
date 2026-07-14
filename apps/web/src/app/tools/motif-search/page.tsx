import { PageShell } from "@/components/site-breadcrumbs";
import { MotifSearchTool } from "@/components/motif-search-tool";

export default function MotifSearchPage() {
  return (
    <PageShell className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Motif Search</h1>
        <p className="mt-2 text-slate-600">Search for C/D box, ACA, or custom motifs across all snoRNAs.</p>
      </div>
      <MotifSearchTool />
    </PageShell>
  );
}
