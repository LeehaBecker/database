import { Suspense } from "react";
import { HomologCompareClient } from "@/components/homolog-compare-client";
import { PageShell } from "@/components/site-breadcrumbs";

export default function HomologComparePage() {
  return (
    <PageShell className="space-y-4">
      <Suspense fallback={<p className="text-sm text-slate-500">Loading alignment…</p>}>
        <HomologCompareClient />
      </Suspense>
    </PageShell>
  );
}
