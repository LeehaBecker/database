import { apiFetch } from "@/lib/api";
import { HomePortal } from "@/components/home-portal";

export default async function Home() {
  const stats = await apiFetch<{
    datasetVersion: string;
    homologPairsTbLm: number;
    organisms: Array<{
      slug: string;
      name: string;
      snornaTotal: number;
      snornaCd: number;
      snornaHaca: number;
      modificationNm: number;
      modificationPsi: number;
      clusterItems: number;
    }>;
  }>("/stats");

  return <HomePortal stats={stats} />;
}
