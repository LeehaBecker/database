import { apiFetch } from "@/lib/api";
import { SnornaTableClient } from "@/components/snorna-table-client";

type SnoRow = {
  id: string;
  snoRNAId: string;
  boxType: string;
  targetType: string;
  targetCount: number;
  hasHomolog: boolean;
  singleCopyGene: string | null;
  genomicLocations?: Array<{ chr: string; start: number; end: number; strand: string }>;
};

export default async function OrganismSnornaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await apiFetch<{ items: SnoRow[]; total: number }>(`/snorna?species=${id}&page=1&pageSize=500`);

  return <SnornaTableClient rows={data.items} organismId={id} total={data.total} />;
}
