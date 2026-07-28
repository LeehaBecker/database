import { DATASET_VERSION } from "@/lib/api";

export const ORGANISMS = [
  { slug: "trypanosoma-brucei", name: "Trypanosoma brucei", short: "T. brucei" },
  { slug: "leishmania-major", name: "Leishmania major", short: "L. major" },
] as const;

export const ORGANISM_INFO: Record<
  string,
  { description: string; disease: string; color: string }
> = {
  "trypanosoma-brucei": {
    description:
      "Kinetoplastid parasite causing African trypanosomiasis (sleeping sickness). Model organism for snoRNA-guided rRNA modification studies.",
    disease: "African trypanosomiasis (sleeping sickness)",
    color: "cyan",
  },
  "leishmania-major": {
    description:
      "Protozoan parasite causing cutaneous leishmaniasis. Comparative snoRNA resource paired with T. brucei homologs.",
    disease: "Cutaneous leishmaniasis",
    color: "emerald",
  },
};

export function prettyOrganismName(slug: string) {
  return ORGANISMS.find((o) => o.slug === slug)?.name ?? slug.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

export function genomeBrowserUrl(chr: string, start: number, end: number) {
  return `/tools/genome-browser?chr=${encodeURIComponent(chr)}&start=${start}&end=${end}`;
}

export function genomeVersionLabel(slug: string): string | null {
  if (slug !== "trypanosoma-brucei") return null;
  const match = DATASET_VERSION.match(/-(\d+)$/);
  return match ? match[1] : "68";
}
