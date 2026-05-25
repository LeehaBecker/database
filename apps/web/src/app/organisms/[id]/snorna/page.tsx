import { apiFetch } from "@/lib/api";
import { SnornaTableClient } from "@/components/snorna-table-client";

type SnoRow = {
  id: string;
  snoRNAId: string;
  boxType: string;
  targetType: string;
  targetCount: number;
};

export default async function OrganismSnornaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await apiFetch<{ items: SnoRow[]; total: number }>(`/snorna?species=${id}&page=1&pageSize=200`);

  return <SnornaTableClient rows={data.items} organismId={id} total={data.total} />;
}
