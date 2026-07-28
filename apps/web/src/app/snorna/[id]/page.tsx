import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { readdir } from "node:fs/promises";
import { apiFetch } from "@/lib/api";
import { parseChromosomeFromSnornaId } from "@/lib/snorna-id";
import { genomeBrowserUrl } from "@/lib/site-config";
import { GenomeVersionBadge } from "@/components/genome-version-badge";
import { formatModificationCell, ModificationSiteReference } from "@/lib/modification-site";
import { SnornaSequenceViewer } from "@/components/snorna-sequence-viewer";
import { CopyButton } from "@/components/copy-button";
import { SnornaHomologComparison } from "@/components/snorna-homolog-comparison";
import { PageShell } from "@/components/site-breadcrumbs";

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
  singleCopyGene?: string | null;
  genomicLocations: Array<{ chr: string; start: number; end: number; strand: string }>;
  modificationSites: Array<{
    rrnaSubunit: string;
    rrnaUnitLabel?: string;
    count: number;
    bp: string | null;
    experimentallyValidated?: string | null;
    mappedTo?: string | null;
    reference?: string | null;
  }>;
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
  const displaySequence = (item.sequence ?? "").replaceAll("T", "U").replaceAll("t", "u");
  const fasta = `>${item.snornaId}\n${displaySequence}`;
  const fastaHref = `data:text/plain;charset=utf-8,${encodeURIComponent(fasta)}`;
  const basePairingExtensions = ["png", "jpg", "jpeg"];
  const basePairingPublicDirs = [
    path.join(process.cwd(), "public", "base-pairing"),
    path.join(process.cwd(), "apps", "web", "public", "base-pairing"),
  ];
  let basePairingDirPath: string | null = null;
  for (const publicDir of basePairingPublicDirs) {
    try {
      await access(publicDir, fsConstants.F_OK);
      basePairingDirPath = publicDir;
      break;
    } catch {
      // Try the next known public directory.
    }
  }

  const basePairingImageNames: string[] = [];
  if (basePairingDirPath) {
    const files = await readdir(basePairingDirPath);
    const extensionPattern = basePairingExtensions.join("|");
    const basePattern = new RegExp(
      `^${item.snornaId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:_(\\d+))?\\.(${extensionPattern})$`,
      "i",
    );

    const matched = files
      .map((fileName) => {
        const match = fileName.match(basePattern);
        if (!match) return null;
        const suffixNumber = match[1] ? Number(match[1]) : 0;
        const extensionIndex = basePairingExtensions.findIndex((ext) => ext.toLowerCase() === match[2].toLowerCase());
        return { fileName, suffixNumber, extensionIndex: extensionIndex >= 0 ? extensionIndex : basePairingExtensions.length };
      })
      .filter((entry): entry is { fileName: string; suffixNumber: number; extensionIndex: number } => Boolean(entry))
      .sort((a, b) => {
        if (a.suffixNumber !== b.suffixNumber) return a.suffixNumber - b.suffixNumber;
        if (a.extensionIndex !== b.extensionIndex) return a.extensionIndex - b.extensionIndex;
        return a.fileName.localeCompare(b.fileName);
      });

    for (const entry of matched) {
      if (!basePairingImageNames.includes(entry.fileName)) {
        basePairingImageNames.push(entry.fileName);
      }
    }
  }

  const basePairingImages = basePairingImageNames.map((fileName) => `/base-pairing/${encodeURIComponent(fileName)}`);
  const defaultBasePairingReferenceUrl = "https://pmc.ncbi.nlm.nih.gov/articles/PMC1370750/#sec17";
  const leishmaniaBasePairingReferenceUrl = "https://pmc.ncbi.nlm.nih.gov/articles/PMC4829279/";
  const basePairingReferenceUrl =
    item.organism?.slug === "leishmania-major" ? leishmaniaBasePairingReferenceUrl : defaultBasePairingReferenceUrl;
  const basePairingHacaReferenceUrl = "https://pmc.ncbi.nlm.nih.gov/articles/PMC4855143/";
  const showHacaBasePairingReference = item.type === "H/ACA" && item.organism?.slug === "trypanosoma-brucei";
  const organismSlug = item.organism?.slug ?? "";

  return (
    <PageShell className="max-w-6xl space-y-4">
      <header className="flex items-center justify-between">
        <Link href={`/tools/interactions?mode=bySnorna&snornaId=${encodeURIComponent(item.snornaId)}`} className="text-sm text-cyan-700 underline">
          View interactions
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
          <p>Chromosome: {parseChromosomeFromSnornaId(item.snornaId) ?? "—"}</p>
          <p>Single copy gene: {item.singleCopyGene ?? "No"}</p>
          <p>Type: {item.type}</p>
          <p>Length: {item.length}</p>
          <p>Modification sites: {item.modificationSites.length}</p>
          <div>
            <p className="font-medium">
              Genomic locations:
              <GenomeVersionBadge organismSlug={organismSlug} className="ml-1 text-sm" />
            </p>
            {item.genomicLocations.length ? (
              <ul className="list-disc pl-5">
                {item.genomicLocations.map((location, index) => (
                  <li key={`${location.chr}-${location.start}-${location.end}-${index}`}>
                    <Link href={genomeBrowserUrl(location.chr, location.start, location.end)} className="text-cyan-700 underline">
                      {location.chr}:{location.start}-{location.end} ({location.strand})
                    </Link>
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
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CopyButton text={displaySequence} label="Copy sequence" />
            <a href={fastaHref} download={`${item.snornaId}.fasta`} className="rounded border px-3 py-1 text-xs">
              Download FASTA
            </a>
          </div>
        </article>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <div className="mb-2 flex items-start justify-between gap-4">
          <h2 className="font-semibold">Modification sites</h2>
          <GenomeVersionBadge organismSlug={organismSlug} />
        </div>
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[24%]" />
            <col className="w-[12%]" />
            <col className="w-[8%]" />
            <col className="w-[18%]" />
            <col className="w-[14%]" />
            <col className="w-[24%]" />
          </colgroup>
          <thead>
            <tr>
              <th className="text-left">rRNA unit</th>
              <th className="text-left">position</th>
              <th className="text-left">BP</th>
              <th className="whitespace-normal text-left leading-tight">Experimentally validated</th>
              <th className="text-left">Mapped to</th>
              <th className="text-left">Reference</th>
            </tr>
          </thead>
          <tbody>
            {item.modificationSites.map((row, index) => (
              <tr key={index} className="border-t">
                <td>{row.rrnaUnitLabel || row.rrnaSubunit || "Not Known"}</td>
                <td>
                  <Link href={`/tools/interactions?subunit=${encodeURIComponent(row.rrnaSubunit)}&position=${row.count}`} className="text-blue-700 underline">
                    {row.count}
                  </Link>
                </td>
                <td>{row.bp ?? "Not Known"}</td>
                <td>{formatModificationCell(row.experimentallyValidated)}</td>
                <td>{formatModificationCell(row.mappedTo)}</td>
                <td><ModificationSiteReference value={row.reference} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <SnornaHomologComparison
        tbIds={item.tbHomologIds ?? []}
        lmIds={item.lmHomologIds ?? []}
        ldIds={item.ldHomologIds ?? []}
      />
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
                    {showHacaBasePairingReference ? (
                      <a href={basePairingHacaReferenceUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                        H/ACA Reference
                      </a>
                    ) : null}
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
    </PageShell>
  );
}
