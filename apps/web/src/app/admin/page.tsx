export default function AdminPage() {
  return (
    <main className="mx-auto max-w-4xl p-6 space-y-4">
      <h1 className="text-3xl font-bold">Admin</h1>
      <p className="text-slate-600">Upload CSV/XLSX files to add organisms, snoRNA data, articles, tools, and libraries.</p>
      <form className="space-y-3 rounded-xl border bg-white p-4">
        <input type="file" className="block w-full" />
        <button type="button" className="rounded bg-slate-900 px-4 py-2 text-white">Validate and Upload</button>
      </form>
    </main>
  );
}
