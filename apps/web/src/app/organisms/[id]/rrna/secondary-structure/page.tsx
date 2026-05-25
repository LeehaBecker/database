import Link from "next/link";
import { apiFetch } from "@/lib/api";

type Asset = { id: string; title: string; publicUrl: string };

export default async function RrnaSecondaryStructurePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await apiFetch<{ assets: Asset[] }>(`/rrna?species=${id}`);

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-6">
      <Link href={`/organisms/${id}/rrna`} className="inline-block text-sm text-cyan-700 underline">
        Back to rRNA cards
      </Link>
      <section className="rounded-xl border bg-white p-4">
        <h1 className="mb-3 text-2xl font-bold">Secondary Structure</h1>
        {data.assets.length ? (
          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-4">
            {data.assets.map((asset) => {
              const fileName = asset.publicUrl.split("/").pop() ?? "";
              const normalizedName = decodeURIComponent(fileName);
              const url = `/api/rrna/secondary-structure/${encodeURIComponent(normalizedName)}`;
              return (
                <article key={asset.id} className="w-[620px] flex-shrink-0 rounded-lg border p-3">
                  <h2 className="mb-2 font-semibold">{asset.title}</h2>
                  <iframe title={asset.title} src={url} className="h-[680px] w-full rounded border" />
                  <a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-blue-700 underline">
                    Open PDF in new tab
                  </a>
                </article>
              );
            })}
            </div>
          </div>
        ) : (
          <p>No secondary structure available</p>
        )}
      </section>
    </main>
  );
}
