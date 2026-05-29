import Link from "next/link";
import { apiFetch } from "@/lib/api";

type Asset = { id: string; title: string; publicUrl: string };
type Figure = { id: string; title: string; fileName: string; description: string };

const REFERENCE_URL = "https://pmc.ncbi.nlm.nih.gov/articles/PMC7549662/";

const TRYPANOSOMA_BRUCEI_FIGURES: Figure[] = [
  {
    id: "figure-4",
    title: "Figure 4 - SSU rRNA",
    fileName: "Figure4.jpg",
    description:
      "Localization of the Nms and ψs in the secondary structure of T. brucei SSU rRNA. Boxes highlighted in blue show the Nm sites whose level is increased in BSF (>10% compared to PCF) and those in yellow are the hypermodified pseudouridines (ψ)[20]. T. brucei specific Nm (not detected in T. cruzi or L. donovani Cryo-EM studies) are indicated by an asterisk (*).",
  },
  {
    id: "figure-5",
    title: "Figure 5 - LSUα rRNA",
    fileName: "Figure5.jpg",
    description:
      "Localization of Nms and ψs in the secondary structure of T. brucei LSUα rRNA. Boxes highlighted in blue show the Nm sites whose level is increased in BSF (>10% compared to PCF) and those in yellow show the hypermodified pseudouridines (ψ)[20]. T. brucei specific Nm (not detected in T. cruzi or L. donovani Cryo-EM studies) are indicated by an asterisk (*).",
  },
  {
    id: "figure-6",
    title: "Figure 6 - LSUβ rRNA",
    fileName: "Figure6.jpg",
    description:
      "Localization of Nms and ψs on the secondary structure of T. brucei LSUβ rRNA. Boxes highlighted in blue show the Nm sites whose level is increased in BSF (>10% compared to PCF) and those in yellow show the hypermodified pseudouridines (ψ)[20]. T. brucei specific Nm (not detected in T. cruzi or L. donovani Cryo-EM studies) are indicated by an asterisk (*).",
  },
];

export default async function RrnaSecondaryStructurePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await apiFetch<{ assets: Asset[] }>(`/rrna?species=${id}`);
  const isTrypanosomaBrucei = id === "trypanosoma-brucei";

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-6">
      <Link href={`/organisms/${id}/rrna`} className="inline-block text-sm text-cyan-700 underline">
        Back to rRNA cards
      </Link>
      <section className="rounded-xl border bg-white p-4">
        <h1 className="mb-3 text-2xl font-bold">Secondary Structure</h1>
        {isTrypanosomaBrucei ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {TRYPANOSOMA_BRUCEI_FIGURES.map((figure) => {
              const url = `/rrna-secondary-structure/${encodeURIComponent(figure.fileName)}`;
              return (
                <article key={figure.id} className="rounded-lg border p-3">
                  <h2 className="mb-2 font-semibold">{figure.title}</h2>
                  <a href={url} target="_blank" rel="noreferrer" className="block">
                    <img
                      src={url}
                      alt={figure.title}
                      className="h-[360px] w-full rounded border object-contain bg-slate-50"
                      loading="lazy"
                    />
                  </a>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <a href={url} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                      Open full size
                    </a>
                    <a href={url} download={figure.fileName} className="text-blue-700 underline">
                      Download
                    </a>
                    <a href={REFERENCE_URL} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                      Reference
                    </a>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{figure.description}</p>
                </article>
              );
            })}
          </div>
        ) : data.assets.length ? (
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
