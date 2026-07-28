import { Router } from "express";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  BLAST_OUTFMT,
  buildExactMatchAlignment,
  genomeBrowserUrl,
  parseBlastOutfmtLine,
  type BlastHitResult,
} from "../lib/blast-alignment.js";
import { blastRunSchema } from "../lib/schemas.js";

export const blastRouter = Router();
const execFileAsync = promisify(execFile);
const ROOT_DATA = process.env.DATA_PATH ?? "C:/Users/ALEXANDER/Desktop/transfer-snorna-extracted/Site-db-data";

type FastaRecord = { id: string; fullTitle: string; sequence: string; source: string };

function walk(dir: string, out: string[]) {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
}

function readFasta(filePath: string): FastaRecord[] {
  const records: FastaRecord[] = [];
  const content = fs.readFileSync(filePath, "utf8");
  let id = "";
  let fullTitle = "";
  let chunks: string[] = [];
  for (const line of content.split(/\r?\n/)) {
    if (!line) continue;
    if (line.startsWith(">")) {
      if (id) records.push({ id, fullTitle, sequence: chunks.join("").toUpperCase(), source: filePath });
      fullTitle = line.slice(1).trim();
      id = fullTitle.split(/\s+/)[0] ?? "unknown";
      chunks = [];
      continue;
    }
    chunks.push(line.trim());
  }
  if (id) records.push({ id, fullTitle, sequence: chunks.join("").toUpperCase(), source: filePath });
  return records;
}

function collectFastaRecords(): FastaRecord[] {
  const files: string[] = [];
  walk(ROOT_DATA, files);
  const fastaFiles = files.filter((file) => /\.(fa|fasta|fna|ffn)$/i.test(file));
  const records: FastaRecord[] = [];
  for (const file of fastaFiles) {
    try {
      records.push(...readFasta(file));
    } catch {
      // skip malformed files
    }
  }
  return records;
}

function buildMetadataBySubjectId(records: FastaRecord[]): Map<string, { fullTitle: string; length: number; source: string }> {
  const metadataBySubjectId = new Map<string, { fullTitle: string; length: number; source: string }>();
  for (const record of records) {
    if (!metadataBySubjectId.has(record.id)) {
      metadataBySubjectId.set(record.id, {
        fullTitle: record.fullTitle,
        length: record.sequence.length,
        source: record.source,
      });
    }
  }
  return metadataBySubjectId;
}

function fallbackSearch(sequence: string, records: FastaRecord[]): BlastHitResult[] {
  const query = sequence.replace(/\s+/g, "").toUpperCase().replaceAll("U", "T");
  const hits: BlastHitResult[] = [];
  for (const record of records) {
    const target = record.sequence.replaceAll("U", "T");
    const idx = target.indexOf(query);
    if (idx < 0) continue;
    const subjectStart = idx + 1;
    const subjectEnd = idx + query.length;
    hits.push({
      subjectId: record.id,
      subjectTitle: record.fullTitle,
      subjectLength: record.sequence.length,
      source: record.source,
      identityPct: 100,
      alignmentLength: query.length,
      identities: query.length,
      gapColumns: 0,
      eValue: "0",
      bitScore: 0,
      queryStrand: "Plus",
      subjectStrand: "Plus",
      start: subjectStart,
      end: subjectEnd,
      segments: buildExactMatchAlignment(query, query, 1, subjectStart),
      genomeBrowserUrl: genomeBrowserUrl(record.id, subjectStart, subjectEnd),
    });
    if (hits.length >= 50) break;
  }
  return hits;
}

async function runBlastn(sequence: string, records: FastaRecord[], queryLength: number): Promise<BlastHitResult[]> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "snorna-blast-"));
  const dbFastaPath = path.join(tempDir, "db.fasta");
  const queryPath = path.join(tempDir, "query.fasta");
  const dbPrefix = path.join(tempDir, "db");
  const metadataBySubjectId = buildMetadataBySubjectId(records);
  const dbContent = records.map((record) => `>${record.fullTitle}\n${record.sequence}`).join("\n");
  fs.writeFileSync(dbFastaPath, dbContent, "utf8");
  fs.writeFileSync(queryPath, `>query\n${sequence.replace(/\s+/g, "")}\n`, "utf8");

  const blastArgs = [
    "-query",
    queryPath,
    "-db",
    dbPrefix,
    "-outfmt",
    BLAST_OUTFMT,
    "-max_target_seqs",
    "50",
  ];
  if (queryLength < 50) {
    blastArgs.push("-task", "blastn-short");
  }

  try {
    await execFileAsync("makeblastdb", ["-in", dbFastaPath, "-dbtype", "nucl", "-out", dbPrefix], { timeout: 60_000 });
    const { stdout } = await execFileAsync("blastn", blastArgs, { timeout: 120_000 });
    return stdout
      .trim()
      .split(/\r?\n/)
      .filter((line) => line.length > 0)
      .map((line) => parseBlastOutfmtLine(line, metadataBySubjectId))
      .filter((hit): hit is BlastHitResult => hit !== null);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

blastRouter.post("/run", async (req, res) => {
  const parsed = blastRunSchema.safeParse(req.body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const message = firstIssue?.message ?? "Invalid BLAST input";
    res.status(400).json({ error: message, details: parsed.error.flatten() });
    return;
  }
  const sequence = parsed.data.sequence;
  const queryLength = sequence.replace(/\s+/g, "").length;
  if (queryLength > 5000) {
    res.status(400).json({ error: "For sync mode, query length must be <= 5000 nt." });
    return;
  }

  const records = collectFastaRecords();
  if (!records.length) {
    res.status(500).json({ error: "No FASTA records found in data path." });
    return;
  }

  try {
    const blastHits = await runBlastn(sequence, records, queryLength);
    res.json({
      mode: "blastn",
      queryLength,
      databaseRecordCount: records.length,
      hits: blastHits,
    });
    return;
  } catch {
    const hits = fallbackSearch(sequence, records);
    res.json({
      mode: "fallback-exact-match",
      queryLength,
      databaseRecordCount: records.length,
      hits,
    });
  }
});
