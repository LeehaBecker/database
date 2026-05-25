import { apiFetch } from "@/lib/api";

type Article = { id: string; title: string; authors: string | null; externalUrl: string | null };

export default async function ArticlesPage() {
  const items = await apiFetch<Article[]>("/articles");
  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-3xl font-bold">Articles</h1>
      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border bg-white p-4">
            <h2 className="font-semibold">{item.title}</h2>
            <p className="text-sm text-slate-600">{item.authors}</p>
            {item.externalUrl ? <a href={item.externalUrl} target="_blank" rel="noreferrer" className="text-sm underline text-blue-700">Open article</a> : null}
          </article>
        ))}
      </div>
    </main>
  );
}
