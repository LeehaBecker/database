import Link from "next/link";
import { apiFetch } from "@/lib/api";

type Asset = { id: string; title: string; publicUrl: string };
type Figure = { id: string; title: string; fileName: string; description: string };

const TRYPANOSOMA_BRUCEI_REFERENCE_URL = "https://pmc.ncbi.nlm.nih.gov/articles/PMC7549662/";
const LEISHMANIA_MAJOR_REFERENCE_URL = "https://pmc.ncbi.nlm.nih.gov/articles/PMC4829279/";

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

const LEISHMANIA_MAJOR_FIGURES: Figure[] = [
  {
    id: "lm-ssu",
    title: "LM SSU rRNA",
    fileName: "LM_ssu.jpg",
    description:
      "Modification of SSU. Location of modified nucleotides on the structure of rRNA. The Nm are marked as m, and the pseudouridines as Ψ. The secondary structure was predicted based on the structure presented for T. brucei at htttp://www.icmb.utexas.edu, adjusting it to the L. major rRNA sequence. The identity of the small rRNA fragments and distinct domains is indicated and shaded. The modifications in different eukaryotes are designated by different colors, as indicated to the right.",
  },
  {
    id: "lm-lsu5",
    title: "LM LSU 5' rRNA",
    fileName: "LM_LSU5.jpg",
    description: "As in A but for the 5' half of LSU.",
  },
  {
    id: "lm-lsu3",
    title: "LM LSU 3' rRNA",
    fileName: "LM_LSU3.jpg",
    description: "The same as in A and B, but for the 3' part of LSU. The domains of the rRNA are indicated.",
  },
];

export default async function RrnaSecondaryStructurePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await apiFetch<{ assets: Asset[] }>(`/rrna?species=${id}`);
  const isTrypanosomaBrucei = id === "trypanosoma-brucei";
  const isLeishmaniaMajor = id === "leishmania-major";
  const imageFigures = isTrypanosomaBrucei
    ? TRYPANOSOMA_BRUCEI_FIGURES
    : isLeishmaniaMajor
      ? LEISHMANIA_MAJOR_FIGURES
      : [];
  const referenceUrl = isTrypanosomaBrucei
    ? TRYPANOSOMA_BRUCEI_REFERENCE_URL
    : isLeishmaniaMajor
      ? LEISHMANIA_MAJOR_REFERENCE_URL
      : "";

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-6">
      <Link href={`/organisms/${id}/rrna`} className="inline-block text-sm text-cyan-700 underline">
        Back to rRNA cards
      </Link>
      <section className="rounded-xl border bg-white p-4">
        <h1 className="mb-3 text-2xl font-bold">Secondary Structure</h1>
        {imageFigures.length ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {imageFigures.map((figure) => {
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
                    <a href={referenceUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">
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
