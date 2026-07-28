export function parseChromosomeFromSnornaId(snornaId: string): string | null {
  const match = snornaId.match(/^[A-Za-z]+(\d+)/);
  return match ? match[1] : null;
}

export function compareSnornaIds(a: string, b: string): number {
  const parse = (id: string) => {
    const match = id.match(/^([A-Za-z]+)(\d+)Cs-?(\d+)/);
    return {
      chr: match ? Number(match[2]) : Number.MAX_SAFE_INTEGER,
      cluster: match ? Number(match[3]) : Number.MAX_SAFE_INTEGER,
      id,
    };
  };

  const left = parse(a);
  const right = parse(b);

  if (left.chr !== right.chr) return left.chr - right.chr;
  if (left.cluster !== right.cluster) return left.cluster - right.cluster;
  return left.id.localeCompare(right.id);
}
