"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Search } from "lucide-react";
import { ORGANISMS } from "@/lib/site-config";

type OrganismStat = {
  slug: string;
  name: string;
  snornaTotal: number;
  snornaCd: number;
  snornaHaca: number;
  modificationNm: number;
  modificationPsi: number;
  clusterItems: number;
};

type Stats = {
  datasetVersion: string;
  homologPairsTbLm: number;
  organisms: OrganismStat[];
};

export function HomePortal({ stats }: { stats: Stats }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 lg:px-6">
      <section className="rounded-3xl border border-cyan-200/70 bg-gradient-to-r from-sky-100 via-cyan-50 to-indigo-100 p-8 shadow-sm">
        <h1 className="text-4xl font-bold text-slate-900 md:text-5xl">Welcome to snoRNA-BIU</h1>
        <p className="mt-2 text-lg text-slate-700">Kinetoplastid snoRNA and rRNA modification database</p>
        <p className="mt-1 text-sm text-slate-600">Dataset: {stats.datasetVersion}</p>
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

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.organisms.map((org) => (
          <article key={org.slug} className="rounded-2xl border border-cyan-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-cyan-900">{org.name}</h2>
            <dl className="mt-2 space-y-1 text-sm text-slate-600">
              <div className="flex justify-between"><dt>snoRNAs</dt><dd className="font-medium text-slate-900">{org.snornaTotal}</dd></div>
              <div className="flex justify-between"><dt>C/D</dt><dd>{org.snornaCd}</dd></div>
              <div className="flex justify-between"><dt>H/ACA</dt><dd>{org.snornaHaca}</dd></div>
              <div className="flex justify-between"><dt>Nm sites</dt><dd>{org.modificationNm}</dd></div>
              <div className="flex justify-between"><dt>Psi sites</dt><dd>{org.modificationPsi}</dd></div>
            </dl>
          </article>
        ))}
        <article className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-violet-900">Cross-species</h2>
          <dl className="mt-2 space-y-1 text-sm text-slate-600">
            <div className="flex justify-between"><dt>TB↔LM pairs</dt><dd className="font-medium text-slate-900">{stats.homologPairsTbLm}</dd></div>
          </dl>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-cyan-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 rounded-lg bg-cyan-100 px-3 py-2 text-xl font-semibold text-cyan-900">Organisms</h2>
          <div className="space-y-2">
            {ORGANISMS.map((item) => (
              <Link
                key={item.slug}
                href={`/organisms/${item.slug}`}
                className="block w-full rounded-lg border border-cyan-200 bg-white px-3 py-2 text-left text-slate-800 transition hover:-translate-y-0.5 hover:bg-cyan-50 hover:shadow-sm"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 rounded-lg bg-violet-100 px-3 py-2 text-xl font-semibold text-violet-900">Tools</h2>
          <div className="space-y-2">
            <Link className="block rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 transition hover:bg-violet-100" href="/tools/genome-browser">
              Genome Browser (local)
            </Link>
            <Link className="block rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 transition hover:bg-violet-100" href="/tools/blast">
              BLAST
            </Link>
            <Link className="block rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 transition hover:bg-violet-100" href="/tools/interactions">
              snoRNA–rRNA Interactions
            </Link>
            <Link className="block rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 transition hover:bg-violet-100" href="/tools/homologs">
              Homolog Explorer
            </Link>
            <a
              className="block rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-slate-600 transition hover:bg-violet-50"
              href="https://tritrypdb.org/tritrypdb/app/jbrowse?loc=Tb927_02_v5.1%3A91072..1046230"
              target="_blank"
              rel="noopener noreferrer"
            >
              TriTrypDB JBrowse (external)
            </a>
          </div>
        </article>

        <article className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 rounded-lg bg-emerald-100 px-3 py-2 text-xl font-semibold text-emerald-900">Resources</h2>
          <div className="space-y-2">
            <Link className="block rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 transition hover:bg-emerald-100" href="/articles">
              Articles
            </Link>
            <Link className="block rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 transition hover:bg-emerald-100" href="/downloads">
              Downloads
            </Link>
            <Link className="block rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 transition hover:bg-emerald-100" href="/about">
              About
            </Link>
            <Link className="block rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 transition hover:bg-emerald-100" href="/cite">
              Cite
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
