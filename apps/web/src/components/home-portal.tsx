"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Search } from "lucide-react";

const organisms = [
  { slug: "trypanosoma-brucei", name: "Trypanosoma brucei" },
  { slug: "leishmania-major", name: "Leishmania major" },
];

export function HomePortal() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-cyan-200/70 bg-gradient-to-r from-sky-100 via-cyan-50 to-indigo-100 p-8 shadow-sm">
        <h1 className="text-4xl font-bold text-slate-900 md:text-5xl">Welcome to snoRNA-BIU</h1>
        <p className="mt-2 text-lg text-slate-700">snoRNA-BIU: The non-coding RNA sequence database</p>
        <form
          className="mt-6 flex items-center rounded-xl border border-cyan-300 bg-white/90 px-4 py-3 shadow-sm"
          onSubmit={handleSearch}
        >
          <Search className="mr-2 h-6 w-6 shrink-0 text-cyan-600" />
          <input
            type="search"
            aria-label="Search by snoRNA ID"
            className="w-full bg-transparent text-lg outline-none"
            placeholder="Search by snoRNA ID"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-cyan-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 rounded-lg bg-cyan-100 px-3 py-2 text-xl font-semibold text-cyan-900">Organisms</h2>
          <div className="space-y-2">
            {organisms.map((item) => (
              <Link
                key={item.slug}
                href={`/organisms/${item.slug}`}
                className="block w-full rounded-lg border border-cyan-200 bg-white px-3 py-2 text-left text-slate-800 transition hover:-translate-y-0.5 hover:bg-cyan-50 hover:shadow-sm"
              >
                {item.name}
              </Link>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">Select an organism to open dedicated data cards.</p>
        </article>

        <article className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 rounded-lg bg-violet-100 px-3 py-2 text-xl font-semibold text-violet-900">Tools</h2>
          <div className="space-y-2">
            <Link
              className="block rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 transition hover:bg-violet-100"
              href="https://tritrypdb.org/tritrypdb/app/jbrowse?loc=Tb927_02_v5.1%3A91072..1046230&data=%2Ftritrypdb%2Fservice%2Fjbrowse%2Ftracks%2FtbruTREU927&tracks=gene%2CCommunity%20annotations%20from%20Apollo%2CTbruceiTREU927%20combined%20RNAseq%20plot&highlight=Tb927_10_v5.1%3A508643..511018"
              target="_blank"
              rel="noopener noreferrer"
            >
              Genome Browser
            </Link>
            <Link className="block rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 transition hover:bg-violet-100" href="/tools/blast">
              BLAST
            </Link>
          </div>
        </article>

        <article className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 rounded-lg bg-emerald-100 px-3 py-2 text-xl font-semibold text-emerald-900">Experiment Details</h2>
          <div className="space-y-2">
            <Link className="block rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 transition hover:bg-emerald-100" href="/articles">
              Articles
            </Link>
            <Link className="block rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 transition hover:bg-emerald-100" href="/libraries">
              Sequencing Libraries
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
