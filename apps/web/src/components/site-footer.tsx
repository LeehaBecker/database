import Link from "next/link";
import { DATASET_VERSION } from "@/lib/api";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 text-sm text-slate-600 md:grid-cols-3 lg:px-6">
        <div>
          <p className="font-semibold text-slate-900">snoRNA-BIU</p>
          <p className="mt-2">Non-coding RNA sequence database for kinetoplastid parasites.</p>
          <p className="mt-2 text-xs">Bar-Ilan University</p>
        </div>
        <div>
          <p className="font-semibold text-slate-900">Resources</p>
          <ul className="mt-2 space-y-1">
            <li><Link href="/about" className="hover:text-cyan-700">About</Link></li>
            <li><Link href="/help" className="hover:text-cyan-700">Help</Link></li>
            <li><Link href="/cite" className="hover:text-cyan-700">Cite</Link></li>
            <li><Link href="/downloads" className="hover:text-cyan-700">Downloads</Link></li>
            <li><Link href="/api-docs" className="hover:text-cyan-700">API Documentation</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-slate-900">Data provenance</p>
          <p className="mt-2">Dataset: {DATASET_VERSION}</p>
          <p className="mt-1 text-xs">Sources include TriTrypDB and NCBI. See About for details.</p>
        </div>
      </div>
      <div className="border-t border-slate-200 py-3 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} snoRNA-BIU · Kinetoplastid snoRNA/rRNA research database
      </div>
    </footer>
  );
}
