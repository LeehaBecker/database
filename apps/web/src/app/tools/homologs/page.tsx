import { PageShell } from "@/components/site-breadcrumbs";
import { HomologExplorer } from "@/components/homolog-explorer";

export default function HomologsPage() {
  return (
    <PageShell className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Cross-Species Homolog Explorer</h1>
        <p className="mt-2 text-slate-600">Browse and compare snoRNA homolog pairs between T. brucei and L. major.</p>
      </div>
      <HomologExplorer />
    </PageShell>
  );
}
