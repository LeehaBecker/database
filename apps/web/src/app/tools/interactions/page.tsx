import { Suspense } from "react";
import { PageShell } from "@/components/site-breadcrumbs";
import { InteractionsTool } from "@/components/interactions-tool";
import { TableSkeleton } from "@/components/table-skeleton";

export default function InteractionsPage() {
  return (
    <PageShell className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">snoRNA–rRNA Interaction Viewer</h1>
        <p className="mt-2 text-slate-600">Browse a full rRNA subunit with every modification site marked in red and the snoRNA guides drawn where they pair. Scroll left and right along the sequence, hover a red letter to see which snoRNAs guide that modification, or search by position or snoRNA and select a result to see the base pairing.</p>
      </div>
      <Suspense fallback={<TableSkeleton rows={3} cols={4} />}>
        <InteractionsTool />
      </Suspense>
    </PageShell>
  );
}
