import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Rrna3DMolstar } from "@/components/rrna-3d-molstar";

export default async function Rrna3DStructurePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await apiFetch<{ structure3dUrl?: string | null; structure3dExternalUrl?: string | null }>(`/rrna?species=${id}`);
  const publicApiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const cifUrl = `${publicApiBase}${data.structure3dUrl ?? "/rrna/3d/cif"}`;
  const externalUrl = data.structure3dExternalUrl ?? null;

  return (
    <main className="relative left-1/2 w-screen -translate-x-1/2 bg-white">
      <section className="min-h-screen px-2 py-2 md:px-3 md:py-2">
        <Link href={`/organisms/${id}/rrna`} className="inline-block text-sm text-cyan-700 underline">
          Back to rRNA cards
        </Link>
        <h1 className="mb-2 text-2xl font-bold">3D Structure</h1>
        {externalUrl ? (
          <>
            <p className="mb-2 text-sm text-slate-600">Open the Leishmania major 3D structure in the external RCSB viewer.</p>
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded border px-3 py-2 text-sm text-blue-700 underline"
            >
              Open 3D Structure (RCSB 9FXO)
            </a>
          </>
        ) : (
          <>
            <p className="mb-2 text-sm text-slate-600">
              Interactive Mol* viewer loaded from local 8ova.cif. Use the built-in controls for selection, measurement, and
              representations.
            </p>
            <Rrna3DMolstar cifUrl={cifUrl} />
          </>
        )}
      </section>
    </main>
  );
}
