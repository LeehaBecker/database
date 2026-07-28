export type BlastAlignmentSegment = {
  queryStart: number;
  queryEnd: number;
  querySeq: string;
  matchLine: string;
  subjectStart: number;
  subjectEnd: number;
  subjectSeq: string;
};

export type BlastHitResult = {
  subjectId: string;
  subjectTitle: string;
  subjectLength: number;
  source?: string;
  identityPct: number;
  alignmentLength: number;
  identities: number;
  gapColumns: number;
  eValue: string;
  bitScore: number;
  queryStrand: "Plus" | "Minus";
  subjectStrand: "Plus" | "Minus";
  start: number;
  end: number;
  segments: BlastAlignmentSegment[];
  genomeBrowserUrl?: string;
};

const LINE_WIDTH = 60;

function parseStrand(value: string | undefined, fallback: "Plus" | "Minus" = "Plus"): "Plus" | "Minus" {
  if (!value) return fallback;
  const normalized = value.toLowerCase();
  if (normalized === "minus" || normalized === "-1") return "Minus";
  return "Plus";
}

function buildMatchLine(qseq: string, sseq: string): string {
  let line = "";
  for (let i = 0; i < qseq.length; i++) {
    const q = qseq[i] ?? "";
    const s = sseq[i] ?? "";
    if (q === "-" || s === "-") line += " ";
    else if (q.toUpperCase() === s.toUpperCase()) line += "|";
    else line += " ";
  }
  return line;
}

function countGapColumns(qseq: string, sseq: string): number {
  let gaps = 0;
  for (let i = 0; i < qseq.length; i++) {
    if ((qseq[i] ?? "") === "-" || (sseq[i] ?? "") === "-") gaps++;
  }
  return gaps;
}

function positionAtOffset(seq: string, offset: number, startPos: number, endPos: number): number {
  const step = startPos <= endPos ? 1 : -1;
  let pos = startPos;
  for (let i = 0; i < offset; i++) {
    if ((seq[i] ?? "") !== "-") pos += step;
  }
  for (let i = offset; i < seq.length; i++) {
    if ((seq[i] ?? "") !== "-") return pos;
  }
  return pos;
}

function endPositionAtOffset(seq: string, offset: number, startPos: number, endPos: number): number {
  const step = startPos <= endPos ? 1 : -1;
  let pos = startPos;
  for (let i = 0; i <= offset && i < seq.length; i++) {
    if ((seq[i] ?? "") !== "-") pos += step;
  }
  return startPos <= endPos ? pos - 1 : pos + 1;
}

export function wrapAlignment(
  qseq: string,
  sseq: string,
  qstart: number,
  qend: number,
  sstart: number,
  send: number,
  lineWidth = LINE_WIDTH,
): BlastAlignmentSegment[] {
  const segments: BlastAlignmentSegment[] = [];
  for (let i = 0; i < qseq.length; i += lineWidth) {
    const querySeq = qseq.slice(i, i + lineWidth);
    const subjectSeq = sseq.slice(i, i + lineWidth);
    const chunkEnd = i + querySeq.length - 1;
    segments.push({
      queryStart: positionAtOffset(qseq, i, qstart, qend),
      queryEnd: endPositionAtOffset(qseq, chunkEnd, qstart, qend),
      querySeq,
      matchLine: buildMatchLine(querySeq, subjectSeq),
      subjectStart: positionAtOffset(sseq, i, sstart, send),
      subjectEnd: endPositionAtOffset(sseq, chunkEnd, sstart, send),
      subjectSeq,
    });
  }
  return segments;
}

export function buildExactMatchAlignment(
  querySeq: string,
  subjectSeq: string,
  queryStart: number,
  subjectStart: number,
): BlastAlignmentSegment[] {
  return wrapAlignment(querySeq, subjectSeq, queryStart, queryStart + querySeq.length - 1, subjectStart, subjectStart + subjectSeq.length - 1);
}

export function genomeBrowserUrl(subjectId: string, start: number, end: number): string | undefined {
  if (!/^Tb927_/i.test(subjectId)) return undefined;
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  const padding = Math.max(500, Math.floor((hi - lo) * 0.1));
  return `/tools/genome-browser?chrom=${encodeURIComponent(subjectId)}&start=${Math.max(1, lo - padding)}&end=${hi + padding}`;
}

type BlastRow = {
  subjectId: string;
  subjectTitle: string;
  subjectLength: number;
  source?: string;
  pident: string;
  length: string;
  nident: string;
  evalue: string;
  bitscore: string;
  qstart: string;
  qend: string;
  sstart: string;
  send: string;
  sstrand: string;
  qseq: string;
  sseq: string;
};

export function parseBlastRow(row: BlastRow): BlastHitResult {
  const qstart = Number(row.qstart);
  const qend = Number(row.qend);
  const sstart = Number(row.sstart);
  const send = Number(row.send);
  const alignmentLength = Number(row.length);
  const identities = Number(row.nident);
  const gapColumns = countGapColumns(row.qseq, row.sseq);
  const lo = Math.min(sstart, send);
  const hi = Math.max(sstart, send);

  return {
    subjectId: row.subjectId,
    subjectTitle: row.subjectTitle,
    subjectLength: row.subjectLength,
    source: row.source,
    identityPct: Number(row.pident),
    alignmentLength,
    identities,
    gapColumns,
    eValue: row.evalue,
    bitScore: Number(row.bitscore),
    queryStrand: qstart <= qend ? "Plus" : "Minus",
    subjectStrand: parseStrand(row.sstrand),
    start: lo,
    end: hi,
    segments: wrapAlignment(row.qseq, row.sseq, qstart, qend, sstart, send),
    genomeBrowserUrl: genomeBrowserUrl(row.subjectId, lo, hi),
  };
}

export const BLAST_OUTFMT =
  "6 qseqid sseqid pident length nident mismatch gapopen qstart qend sstart send evalue bitscore sstrand qseq sseq";

export function parseBlastOutfmtLine(
  line: string,
  metadataBySubjectId: Map<string, { fullTitle: string; length: number; source: string }>,
): BlastHitResult | null {
  const cols = line.split("\t");
  if (cols.length < 16) return null;

  const subjectId = cols[1] ?? "";
  const meta = metadataBySubjectId.get(subjectId);
  if (!meta) return null;

  return parseBlastRow({
    subjectId,
    subjectTitle: meta.fullTitle,
    subjectLength: meta.length,
    source: meta.source,
    pident: cols[2] ?? "0",
    length: cols[3] ?? "0",
    nident: cols[4] ?? "0",
    evalue: cols[11] ?? "0",
    bitscore: cols[12] ?? "0",
    qstart: cols[7] ?? "1",
    qend: cols[8] ?? "1",
    sstart: cols[9] ?? "1",
    send: cols[10] ?? "1",
    sstrand: cols[13] ?? "plus",
    qseq: cols[14] ?? "",
    sseq: cols[15] ?? "",
  });
}
