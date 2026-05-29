import { apiFetch } from "@/lib/api";
import { ChimeraTableClient } from "@/components/chimera-table-client";

type ChimeraMrnaResponse = {
  columns: string[];
  rows: Record<string, string>[];
  total: number;
  page: number;
  pageSize: number;
};

export default async function OrganismSnornaMrnaChimerasPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; pageSize?: string; search?: string }>;
}) {
  const { id } = await params;
  const qp = await searchParams;
  const page = Number(qp.page ?? "1");
  const pageSize = Number(qp.pageSize ?? "50");
  const search = qp.search?.trim() ?? "";
  const data = await apiFetch<ChimeraMrnaResponse>(
    `/chimera/mrna?species=${encodeURIComponent(id)}&page=${Number.isFinite(page) && page > 0 ? page : 1}&pageSize=${
      Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 50
    }&search=${encodeURIComponent(search)}`,
  );

  return (
    <ChimeraTableClient
      columns={data.columns}
      rows={data.rows}
      organismId={id}
      datasetLabel="snoRNA - mRNA Chimeras"
      page={data.page}
      pageSize={data.pageSize}
      total={data.total}
      search={search}
    />
  );
}
