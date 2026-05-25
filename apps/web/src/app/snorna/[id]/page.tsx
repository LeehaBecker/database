import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { SnornaSequenceViewer } from "@/components/snorna-sequence-viewer";

type SnornaDetail = {
  snornaId: string;
  type: string;
  length: number;
  sequence: string;
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
  const displaySequence = (item.sequence ?? "").replaceAll("T", "U").replaceAll("t", "u");
  const fasta = `>${item.snornaId}\n${displaySequence}`;
  const fastaHref = `data:text/plain;charset=utf-8,${encodeURIComponent(fasta)}`;

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-4">
      <header className="flex items-center justify-between">
        <Link href="/organisms/trypanosoma-brucei/snorna" className="text-sm underline">
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

      <section className="rounded-xl border bg-white p-4">No secondary structure available</section>
      <section className="rounded-xl border bg-white p-4">No homolog available</section>
    </main>
  );
}
