export function parseChromosomeFromSnornaId(snornaId: string): string | null {
  const match = snornaId.match(/^[A-Za-z]+(\d+)/);
  return match ? match[1] : null;
}
