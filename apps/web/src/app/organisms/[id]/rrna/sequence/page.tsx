import Link from "next/link";
import { apiFetch } from "@/lib/api";

type RrnaUnit = { id: string; subunit: string; start: number; end: number; sequence?: string | null };
const unitColors = [
  { bar: "bg-cyan-300", text: "text-cyan-700" },
  { bar: "bg-blue-300", text: "text-blue-700" },
  { bar: "bg-violet-300", text: "text-violet-700" },
  { bar: "bg-emerald-300", text: "text-emerald-700" },
  { bar: "bg-amber-300", text: "text-amber-700" },
  { bar: "bg-rose-300", text: "text-rose-700" },
];

export default async function RrnaSequencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await apiFetch<{ units: RrnaUnit[]; rrnaSequence: string }>(`/rrna?species=${id}`);
  const fasta = `>rRNA_${id}\n${data.rrnaSequence ?? ""}`;
  const fastaHref = `data:text/plain;charset=utf-8,${encodeURIComponent(fasta)}`;

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-6">
      <Link href={`/organisms/${id}/rrna`} className="inline-block text-sm text-cyan-700 underline">
        Back to rRNA cards
      </Link>
      <section className="rounded-xl border bg-white p-4">
        <h1 className="text-2xl font-bold">rRNA Sequence</h1>
        <div className="mt-3 flex h-10 overflow-hidden rounded">
          {data.units.map((unit, index) => (
            <div key={unit.id} className={`flex-1 text-center text-xs leading-10 ${unitColors[index % unitColors.length].bar}`}>
              {unit.subunit}
            </div>
          ))}
        </div>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr>
              <th className="text-left">Subunit</th>
              <th className="text-left">Start</th>
              <th className="text-left">End</th>
              <th className="text-left">Length</th>
            </tr>
          </thead>
          <tbody>
            {data.units.map((unit) => (
              <tr key={unit.id} className="border-t">
                <td>{unit.subunit}</td>
                <td>{unit.start}</td>
                <td>{unit.end}</td>
                <td>{unit.end - unit.start + 1}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h2 className="mt-4 mb-2 font-semibold">Full rRNA sequence</h2>
        <pre className="max-h-80 overflow-auto rounded bg-slate-100 p-3 text-xs whitespace-pre-wrap break-all">
          {data.units.length
            ? data.units.map((unit, index) => (
                <span key={unit.id} className={unitColors[index % unitColors.length].text}>
                  {unit.sequence ?? ""}
                </span>
              ))
            : data.rrnaSequence || "No sequence available"}
        </pre>
        <a href={fastaHref} download={`${id}-rrna.fasta`} className="mt-3 inline-block rounded border px-3 py-1 text-xs">
          Download FASTA
        </a>
      </section>
    </main>
  );
}
