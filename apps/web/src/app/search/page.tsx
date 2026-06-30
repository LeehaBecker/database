import Link from "next/link";
import { apiFetch } from "@/lib/api";

type SnoRow = {
  id: string;
  snoRNAId: string;
  boxType: string;
  targetType: string;
  targetCount: number;
  hasHomolog: boolean;
  singleCopyGene: string | null;
};

const formatHasHomolog = (hasHomolog: boolean) => (hasHomolog ? "Yes" : "No");
const formatSingleCopyGene = (value: string | null) => value?.trim() || "No";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  if (!query) {
    return (
      <main className="mx-auto max-w-5xl space-y-4 px-6 py-8">
        <Link href="/" className="text-sm text-cyan-700 underline">
          Back to Home
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">Search</h1>
        <p className="text-slate-600">Enter a snoRNA ID on the home page to search the database.</p>
      </main>
    );
  }

  const data = await apiFetch<{ items: SnoRow[]; total: number }>(
    `/snorna?search=${encodeURIComponent(query)}&page=1&pageSize=200`,
  );

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-8">
      <Link href="/" className="text-sm text-cyan-700 underline">
        Back to Home
      </Link>
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-slate-900">Search results</h1>
        <p className="text-slate-600">
          Results for &ldquo;{query}&rdquo;
          {data.items.length > 0 ? ` (${data.total} found)` : null}
        </p>
      </div>

      {data.items.length > 0 ? (
        <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-3 text-left">snoRNA ID</th>
                <th className="p-3 text-left">Box Type</th>
                <th className="p-3 text-left">Target Type</th>
                <th className="p-3 text-left">Target Count</th>
                <th className="p-3 text-left">Has a homolog</th>
                <th className="p-3 text-left">Single copy gene</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3">
                    <Link className="text-blue-700 underline hover:text-blue-900" href={`/snorna/${item.snoRNAId}`}>
                      {item.snoRNAId}
                    </Link>
                  </td>
                  <td className="p-3">{item.boxType}</td>
                  <td className="p-3">{item.targetType}</td>
                  <td className="p-3">{item.targetCount}</td>
                  <td className="p-3">{formatHasHomolog(item.hasHomolog)}</td>
                  <td className="p-3">{formatSingleCopyGene(item.singleCopyGene)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-medium text-slate-700">No results found</p>
          <p className="mt-2 text-sm text-slate-500">Try a different snoRNA ID or check the spelling.</p>
        </section>
      )}
    </main>
  );
}
