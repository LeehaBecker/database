import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { SnornaClusterViewer } from "@/components/snorna-cluster-viewer";

type ClusterItem = {
  snornaId: string;
  linkedSnornaId: string | null;
  isAvailable: boolean;
  boxType: string | null;
  geneLengthNt: number | null;
  intergenicLengthNt: string | null;
  coordinatesList: string[];
};

type ClusterRow = {
  clusterId: number;
  coordinates: string | null;
  repeatedInGenome: number | null;
  referenceUrl: string | null;
  items: ClusterItem[];
};

type ClusterResponse = {
  organism: { slug: string; name: string };
  clusters: ClusterRow[];
};

export default async function UpdatedSnornaClustersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await apiFetch<ClusterResponse>(`/snorna/clusters/updated?species=${id}`);

  return (
    <main className="mx-auto max-w-7xl space-y-4 p-6">
      <Link href={`/organisms/${id}`} className="inline-block text-sm text-cyan-700 underline">
        Back to organism
      </Link>
      <section className="rounded-xl border bg-white p-4">
        <h1 className="text-2xl font-bold">Updated version</h1>
        <p className="mt-2 text-sm text-slate-600">
          Clusters are grouped from genomic coordinates. Neighboring snoRNAs on the same chromosome stay in one cluster when the gap between them is at most 1 kb. C/D boxes are green and H/ACA boxes are blue. The number under each box is the gene length, and the number above the line is the gap to the next snoRNA.
        </p>
      </section>
      <SnornaClusterViewer clusters={data.clusters ?? []} />
    </main>
  );
}
