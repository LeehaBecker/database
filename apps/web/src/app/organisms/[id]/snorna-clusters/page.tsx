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

export default async function SnornaClustersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await apiFetch<ClusterResponse>(`/snorna/clusters?species=${id}`);

  return (
    <main className="mx-auto max-w-7xl space-y-4 p-6">
      <Link href={`/organisms/${id}`} className="inline-block text-sm text-cyan-700 underline">
        Back to organism
      </Link>
      <section className="rounded-xl border bg-white p-4">
        <h1 className="text-2xl font-bold">snoRNA Gene Clusters</h1>
        <p className="mt-2 text-sm text-slate-600">
          Click a snoRNA label to open its existing entry page. Unavailable labels indicate no exact match in current
          snoRNA records.
        </p>
      </section>
      <SnornaClusterViewer clusters={data.clusters ?? []} />
    </main>
  );
}
