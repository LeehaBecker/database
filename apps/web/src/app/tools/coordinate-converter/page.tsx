import { PageShell } from "@/components/site-breadcrumbs";
import { CoordinateConverterTool } from "@/components/coordinate-converter-tool";

export default function CoordinateConverterPage() {
  return (
    <PageShell className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Coordinate Converter</h1>
        <p className="mt-2 text-slate-600">Convert between rRNA subunit-relative and absolute positions within the concatenated rRNA sequence.</p>
      </div>
      <CoordinateConverterTool />
    </PageShell>
  );
}
