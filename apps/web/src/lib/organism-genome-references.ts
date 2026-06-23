export const organismGenomeReferenceUrls: Record<string, string> = {
  "trypanosoma-brucei": "https://www.ncbi.nlm.nih.gov/datasets/genome/GCA_000002445.1/",
  "leishmania-major": "https://www.ncbi.nlm.nih.gov/datasets/genome/GCF_000002725.2/",
};

export function getOrganismGenomeReferenceUrl(slug: string): string | null {
  return organismGenomeReferenceUrls[slug] ?? null;
}
