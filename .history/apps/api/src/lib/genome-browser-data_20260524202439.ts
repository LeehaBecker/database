import fs from "node:fs";
import path from "node:path";

const ROOT_DATA = process.env.DATA_PATH ?? "C:/Users/ALEXANDER/Desktop/transfer-snorna-extracted/Site-db-data";

type GenomeFeature = {
  seqid: string;
  source: string;
  type: string;
  start: number;
  end: number;
  score: string;
  strand: string;
  phase: string;
  attributes: Record<string, string>;
};

type GenomeCache = {
  features: GenomeFeature[];
  byChrom: Map<string, GenomeFeature[]>;
  sequences: Map<string, string>;
  chromosomes: Array<{ name: string; length: number }>;
};

let cache: GenomeCache | null = null;

function parseAttributes(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of raw.split(";")) {
    const cleaned = part.trim();
    if (!cleaned) continue;
    const [key, ...rest] = cleaned.split(/\s+/);
    const value = rest.join(" ").replace(/^"/, "").replace(/"$/, "");
    if (key) result[key] = value;
  }
  return result;
}

function readFastaMap(filePath: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!fs.existsSync(filePath)) return map;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  let header = "";
  let chunks: string[] = [];
  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith(">")) {
      if (header) map.set(header, chunks.join("").toUpperCase());
      header = line.slice(1).trim().split(/\s+/)[0] ?? "";
      chunks = [];
      continue;
    }
    chunks.push(line.trim());
  }
  if (header) map.set(header, chunks.join("").toUpperCase());
  return map;
}

export function getGenomeCache(): GenomeCache {
  if (cache) return cache;

  const gtfPath = path.join(ROOT_DATA, "TriTrypDB-68_TbruceiTREU927.gtf");
  const genomeFastaPath = path.join(ROOT_DATA, "TriTrypDB-68_TbruceiTREU927_Genome.fasta");

  const features: GenomeFeature[] = [];
  const byChrom = new Map<string, GenomeFeature[]>();

  if (fs.existsSync(gtfPath)) {
    const lines = fs.readFileSync(gtfPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      if (!line || line.startsWith("#")) continue;
      const fields = line.split("\t");
      if (fields.length < 9) continue;
      const [seqid, source, type, start, end, score, strand, phase, attrs] = fields;
      const feature: GenomeFeature = {
        seqid,
        source,
        type,
        start: Number(start),
        end: Number(end),
        score,
        strand,
        phase,
        attributes: parseAttributes(attrs),
      };
      features.push(feature);
      const list = byChrom.get(seqid) ?? [];
      list.push(feature);
      byChrom.set(seqid, list);
    }
  }

  const sequences = readFastaMap(genomeFastaPath);
  const chromosomes = [...sequences.entries()]
    .map(([name, sequence]) => ({ name, length: sequence.length }))
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const [chrom, list] of byChrom.entries()) {
    list.sort((a, b) => a.start - b.start || a.end - b.end);
    byChrom.set(chrom, list);
  }

  cache = { features, byChrom, sequences, chromosomes };
  return cache;
}

export function queryFeatures(chrom: string, start: number, end: number, search?: string) {
  const data = getGenomeCache();
  const list = data.byChrom.get(chrom) ?? [];
  const q = (search ?? "").trim().toLowerCase();
  return list
    .filter((feature) => feature.end >= start && feature.start <= end)
    .filter((feature) => {
      if (!q) return true;
      const id = (feature.attributes.gene_id ?? feature.attributes.transcript_id ?? "").toLowerCase();
      const name = (feature.attributes.gene_name ?? "").toLowerCase();
      const description = (feature.attributes.description ?? "").toLowerCase();
      return id.includes(q) || name.includes(q) || description.includes(q) || feature.type.toLowerCase().includes(q);
    });
}

export function querySequence(chrom: string, start: number, end: number) {
  const data = getGenomeCache();
  const sequence = data.sequences.get(chrom);
  if (!sequence) return "";
  const s = Math.max(start - 1, 0);
  const e = Math.min(end, sequence.length);
  return sequence.slice(s, e);
}

export function searchGenome(term: string) {
  const data = getGenomeCache();
  const q = term.trim().toLowerCase();
  if (!q) return [];
  return data.features
    .filter((feature) => {
      const id = (feature.attributes.gene_id ?? feature.attributes.transcript_id ?? "").toLowerCase();
      const name = (feature.attributes.gene_name ?? "").toLowerCase();
      return id.includes(q) || name.includes(q);
    })
    .slice(0, 100)
    .map((feature) => ({
      chrom: feature.seqid,
      start: feature.start,
      end: feature.end,
      type: feature.type,
      geneId: feature.attributes.gene_id ?? null,
      transcriptId: feature.attributes.transcript_id ?? null,
      geneName: feature.attributes.gene_name ?? null,
    }));
}
