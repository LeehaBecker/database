"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Menu, Search, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { ORGANISMS } from "@/lib/site-config";

const toolLinks = [
  { href: "/tools", label: "Tools Hub" },
  { href: "/tools/blast", label: "BLAST" },
  { href: "/tools/genome-browser", label: "Genome Browser" },
  { href: "/tools/interactions", label: "snoRNA–rRNA Interactions" },
  { href: "/tools/homologs", label: "Homolog Explorer" },
  { href: "/tools/fasta-fetch", label: "FASTA Fetch" },
  { href: "/tools/motif-search", label: "Motif Search" },
  { href: "/tools/coordinate-converter", label: "Coordinate Converter" },
];

const infoLinks = [
  { href: "/about", label: "About" },
  { href: "/help", label: "Help" },
  { href: "/cite", label: "Cite" },
  { href: "/downloads", label: "Downloads" },
  { href: "/api-docs", label: "API" },
  { href: "/articles", label: "Articles" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-cyan-200/70 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 lg:px-6">
        <Link href="/" className="shrink-0 text-lg font-bold text-cyan-900">
          snoRNA-BIU
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <div className="relative">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-cyan-50"
              onClick={() => {
                setOrgOpen(!orgOpen);
                setToolsOpen(false);
              }}
            >
              Organisms <ChevronDown className="h-4 w-4" />
            </button>
            {orgOpen && (
              <div className="absolute left-0 mt-1 w-56 rounded-xl border bg-white py-1 shadow-lg">
                {ORGANISMS.map((org) => (
                  <Link
                    key={org.slug}
                    href={`/organisms/${org.slug}`}
                    className="block px-4 py-2 text-sm hover:bg-cyan-50"
                    onClick={() => setOrgOpen(false)}
                  >
                    {org.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-violet-50"
              onClick={() => {
                setToolsOpen(!toolsOpen);
                setOrgOpen(false);
              }}
            >
              Tools <ChevronDown className="h-4 w-4" />
            </button>
            {toolsOpen && (
              <div className="absolute left-0 mt-1 w-64 rounded-xl border bg-white py-1 shadow-lg">
                {toolLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block px-4 py-2 text-sm hover:bg-violet-50"
                    onClick={() => setToolsOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {infoLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm hover:bg-slate-100 ${pathname === link.href ? "bg-slate-100 font-medium" : "text-slate-700"}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={handleSearch} className="ml-auto hidden max-w-xs flex-1 items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 md:flex">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            className="w-full bg-transparent text-sm outline-none"
            placeholder="Search snoRNA ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>

        <button
          type="button"
          className="ml-auto rounded-lg p-2 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t bg-white px-4 py-3 md:hidden">
          <form onSubmit={handleSearch} className="mb-3 flex items-center gap-2 rounded-lg border px-3 py-2">
            <Search className="h-4 w-4" />
            <input className="w-full text-sm outline-none" placeholder="Search snoRNA ID" value={query} onChange={(e) => setQuery(e.target.value)} />
          </form>
          <div className="space-y-1 text-sm">
            {ORGANISMS.map((org) => (
              <Link key={org.slug} href={`/organisms/${org.slug}`} className="block rounded px-2 py-2 hover:bg-cyan-50" onClick={() => setMobileOpen(false)}>
                {org.name}
              </Link>
            ))}
            {toolLinks.map((link) => (
              <Link key={link.href} href={link.href} className="block rounded px-2 py-2 hover:bg-violet-50" onClick={() => setMobileOpen(false)}>
                {link.label}
              </Link>
            ))}
            {infoLinks.map((link) => (
              <Link key={link.href} href={link.href} className="block rounded px-2 py-2 hover:bg-slate-50" onClick={() => setMobileOpen(false)}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
