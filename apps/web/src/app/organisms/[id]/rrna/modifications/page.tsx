import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { RrnaModificationsTableClient } from "@/components/rrna-modifications-table-client";

type ModRow = {
  rrnaSubunit: string;
  count: number;
  modType: string | null;
  bp: string | null;
  snoRna: { snornaId: string } | null;
};

export default async function RrnaModificationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mods = await apiFetch<ModRow[]>(`/rrna/modifications?species=${id}`);

  return (
    <main className="mx-auto max-w-7xl space-y-4 p-6">
      <Link href={`/organisms/${id}/rrna`} className="inline-block text-sm text-cyan-700 underline">
        Back to rRNA cards
      </Link>
      <section className="rounded-xl border bg-white p-4">
        <h1 className="mb-2 text-2xl font-bold">Modification Sites</h1>
        <RrnaModificationsTableClient rows={mods} />
      </section>
    </main>
  );
}
