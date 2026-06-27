export const tritrypdbDownloadsUrl = "https://tritrypdb.org/tritrypdb/app/downloads";

export const organismNcbiGenomeReferenceUrls: Record<string, string> = {
  "trypanosoma-brucei": "https://www.ncbi.nlm.nih.gov/datasets/genome/GCA_000002445.1/",
  "leishmania-major": "https://www.ncbi.nlm.nih.gov/datasets/genome/GCF_000002725.2/",
};

export function getOrganismNcbiGenomeReferenceUrl(slug: string): string | null {
  return organismNcbiGenomeReferenceUrls[slug] ?? null;
}

export function hasGenomeReferencePage(slug: string): boolean {
  return getOrganismNcbiGenomeReferenceUrl(slug) !== null;
}
