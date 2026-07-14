import { Suspense } from "react";
import { PageShell } from "@/components/site-breadcrumbs";
import { InteractionsTool } from "@/components/interactions-tool";
import { TableSkeleton } from "@/components/table-skeleton";

export default function InteractionsPage() {
  return (
    <PageShell className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">snoRNA–rRNA Interaction Viewer</h1>
        <p className="mt-2 text-slate-600">Find which snoRNAs guide rRNA modifications, or view all targets for a snoRNA.</p>
      </div>
      <Suspense fallback={<TableSkeleton rows={3} cols={4} />}>
        <InteractionsTool />
      </Suspense>
    </PageShell>
  );
}
