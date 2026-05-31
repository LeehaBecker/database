import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { apiFetch } from "@/lib/api";
import { SnornaSequenceViewer } from "@/components/snorna-sequence-viewer";

type SnornaDetail = {
  snornaId: string;
  type: string;
  length: number;
  sequence: string;
  organism: { slug: string };
  referenceUrl?: string | null;
  lmHomologIds?: string[];
  tbHomologIds?: string[];
  ldHomologIds?: string[];
  genomicLocations: Array<{ chr: string; start: number; end: number; strand: string }>;
  modificationSites: Array<{ rrnaSubunit: string; rrnaUnitLabel?: string; count: number; bp: string | null }>;
  targets: Array<{
    cBox: string | null;
    dBox: string | null;
    targetSequence1: string | null;
    targetSequence2: string | null;
  }>;
  highlightFragments: Array<{ label: string; value: string; priority: number }>;
};

export default async function SnornaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await apiFetch<SnornaDetail>(`/snorna/${id}`);
  const backToTableHref = `/organisms/${item.organism?.slug ?? "trypanosoma-brucei"}/snorna`;
  const displaySequence = (item.sequence ?? "").replaceAll("T", "U").replaceAll("t", "u");
  const fasta = `>${item.snornaId}\n${displaySequence}`;
  const fastaHref = `data:text/plain;charset=utf-8,${encodeURIComponent(fasta)}`;
  const basePairingImageBases = [item.snornaId, `${item.snornaId}_1`];
  const basePairingExtensions = ["png", "jpg", "jpeg"];
  const basePairingPublicDirs = [
    path.join(process.cwd(), "public", "base-pairing"),
    path.join(process.cwd(), "apps", "web", "public", "base-pairing"),
  ];
  const basePairingImages = (
    await Promise.all(
      basePairingImageBases.map(async (baseName) => {
        for (const extension of basePairingExtensions) {
          const fileName = `${baseName}.${extension}`;
          for (const publicDir of basePairingPublicDirs) {
            const imagePath = path.join(publicDir, fileName);
            try {
              await access(imagePath, fsConstants.F_OK);
              return `/base-pairing/${encodeURIComponent(fileName)}`;
            } catch {
              // Continue checking additional extensions/directories.
            }
          }
        }
        return null;
      }),
    )
  ).filter((imageUrl): imageUrl is string => Boolean(imageUrl));
  const basePairingReferenceUrl = "https://pmc.ncbi.nlm.nih.gov/articles/PMC1370750/#sec17";

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-4">
      <header className="flex items-center justify-between">
        <Link href={backToTableHref} className="text-sm underline">
          Back to table
        </Link>
        <a href="https://tritrypdb.org" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm underline">
          View in TriTrypDB <ExternalLink className="h-4 w-4" />
        </a>
      </header>

      <section className="rounded-xl border bg-white p-4">
        <h1 className="text-3xl font-bold">{item.snornaId}</h1>
        <span className="mt-2 inline-block rounded-full bg-cyan-100 px-3 py-1 text-sm">{item.type}</span>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border bg-white p-4 space-y-1">
          <h2 className="font-semibold">Basic Information</h2>
          <p>snoRNA ID: {item.snornaId}</p>
          <p>Type: {item.type}</p>
          <p>Length: {item.length}</p>
          <p>Modification sites: {item.modificationSites.length}</p>
          <div>
            <p className="font-medium">Genomic locations:</p>
            {item.genomicLocations.length ? (
              <ul className="list-disc pl-5">
                {item.genomicLocations.map((location, index) => (
                  <li key={`${location.chr}-${location.start}-${location.end}-${index}`}>
                    {location.chr}:{location.start}-{location.end} ({location.strand})
                  </li>
                ))}
              </ul>
            ) : (
              <p>No genomic location available</p>
            )}
          </div>
        </article>
        <article className="rounded-xl border bg-white p-4">
          <h2 className="mb-2 font-semibold">Sequence</h2>
          <SnornaSequenceViewer sequence={displaySequence} fragments={item.highlightFragments ?? []} />
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1"><i className="h-3 w-3 bg-teal-500 inline-block" /> C box</span>
            <span className="inline-flex items-center gap-1"><i className="h-3 w-3 bg-blue-500 inline-block" /> D box</span>
            <span className="inline-flex items-center gap-1"><i className="h-3 w-3 bg-green-500 inline-block" /> Target 1</span>
            <span className="inline-flex items-center gap-1"><i className="h-3 w-3 bg-red-500 inline-block" /> Target 2</span>
            <span className="inline-flex items-center gap-1"><i className="h-3 w-3 bg-amber-400 inline-block" /> H/ACA pockets</span>
            <span className="inline-flex items-center gap-1"><i className="h-3 w-3 bg-purple-400 inline-block" /> H/ACA stems</span>
          </div>
          <a href={fastaHref} download={`${item.snornaId}.fasta`} className="mt-3 inline-block rounded border px-3 py-1 text-xs">
            Download FASTA
          </a>
        </article>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-2 font-semibold">Modification sites</h2>
        <table className="w-full text-sm">
          <thead>
            <tr><th className="text-left">rRNA unit</th><th className="text-left">position</th><th className="text-left">BP</th></tr>
          </thead>
          <tbody>
            {item.modificationSites.map((row, index) => (
              <tr key={index} className="border-t">
                <td>{row.rrnaUnitLabel || row.rrnaSubunit || "Not Known"}</td><td>{row.count}</td><td>{row.bp ?? "Not Known"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-2 font-semibold">Homolog</h2>
        {!!item.lmHomologIds?.length && (
          <div className="mb-3">
            <p className="mb-1 text-sm font-medium text-slate-700">LM homologs</p>
            <div className="flex flex-wrap gap-2">
              {item.lmHomologIds.map((homologId) => (
                <Link
                  key={homologId}
                  href={`/snorna/${homologId}`}
                  className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-900 underline"
                >
                  {homologId}
                </Link>
              ))}
            </div>
          </div>
        )}
        {!!item.tbHomologIds?.length && (
          <div className="mb-3">
            <p className="mb-1 text-sm font-medium text-slate-700">TB homologs</p>
            <div className="flex flex-wrap gap-2">
              {item.tbHomologIds.map((homologId) => (
                <Link
                  key={homologId}
                  href={`/snorna/${homologId}`}
                  className="rounded border border-cyan-200 bg-cyan-50 px-2 py-1 text-xs text-cyan-900 underline"
                >
                  {homologId}
                </Link>
              ))}
            </div>
          </div>
        )}
        {!!item.ldHomologIds?.length && (
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">LD homologs</p>
            <div className="flex flex-wrap gap-2">
              {item.ldHomologIds.map((homologId) => (
                <span key={homologId} className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
                  {homologId}
                </span>
              ))}
            </div>
          </div>
        )}
        {!item.lmHomologIds?.length && !item.tbHomologIds?.length && !item.ldHomologIds?.length && (
          <p className="text-sm text-slate-500">No homolog available</p>
        )}
      </section>
      <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-2 font-semibold">Base pairing</h2>
        {basePairingImages.length ? (
          <div className="space-y-4">
            {basePairingImages.map((imageUrl, index) => {
              const imageName = decodeURIComponent(imageUrl.split("/").pop() ?? `base-pairing-${index + 1}.png`);
              return (
                <article key={imageUrl} className="rounded border p-3">
                  <a href={imageUrl} target="_blank" rel="noreferrer" className="block">
                    <img src={imageUrl} alt={`Base pairing ${item.snornaId} ${index + 1}`} className="mx-auto w-full max-w-md rounded border bg-slate-50" loading="lazy" />
                  </a>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <a href={imageUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                      Open full size
                    </a>
                    <a href={imageUrl} download={imageName} className="text-blue-700 underline">
                      Download
                    </a>
                    <a href={basePairingReferenceUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                      Reference
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No base pairing image available</p>
        )}
      </section>
      <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-2 font-semibold">Secondary Structure</h2>
        <p className="text-sm text-slate-500">No secondary structure available</p>
      </section>
      <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-2 font-semibold">Reference</h2>
        {item.referenceUrl ? (
          <a href={item.referenceUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-700 underline break-all">
            {item.referenceUrl}
          </a>
        ) : (
          <p className="text-sm text-slate-500">No reference available</p>
        )}
      </section>
    </main>
  );
}
