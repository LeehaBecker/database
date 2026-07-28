import { Suspense } from "react";
import GenomeBrowserClient from "@/components/genome-browser-client";

export default function GenomeBrowserPage() {
  return (
    <Suspense fallback={<main className="p-6 text-sm text-slate-600">Loading genome browser...</main>}>
      <GenomeBrowserClient />
    </Suspense>
  );
}
