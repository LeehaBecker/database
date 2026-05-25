import { Router } from "express";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { blastRunSchema } from "../lib/schemas.js";

export const blastRouter = Router();
const execFileAsync = promisify(execFile);
const ROOT_DATA = process.env.DATA_PATH ?? "C:/Users/ALEXANDER/Desktop/transfer-snorna-extracted/Site-db-data";

type FastaRecord = { id: string; sequence: string; source: string };

function walk(dir: string, out: string[]) {
  const entries = fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : [];
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
  let chunks: string[] = [];
  for (const line of content.split(/\r?\n/)) {
    if (!line) continue;
    if (line.startsWith(">")) {
      if (id) records.push({ id, sequence: chunks.join("").toUpperCase(), source: filePath });
      id = line.slice(1).trim().split(/\s+/)[0] ?? "unknown";
      chunks = [];
      continue;
    }
    chunks.push(line.trim());
  }
  if (id) records.push({ id, sequence: chunks.join("").toUpperCase(), source: filePath });
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

function fallbackSearch(sequence: string, records: FastaRecord[]) {
  const query = sequence.replace(/\s+/g, "").toUpperCase().replaceAll("U", "T");
  const hits = records
    .map((record) => {
      const target = record.sequence.replaceAll("U", "T");
      const idx = target.indexOf(query);
      if (idx < 0) return null;
      return {
        subjectId: record.id,
        source: record.source,
        identityPct: 100,
        alignmentLength: query.length,
        eValue: "0",
        start: idx + 1,
        end: idx + query.length,
      };
    })
    .filter((hit) => !!hit)
    .slice(0, 50);
  return hits;
}

async function runBlastn(sequence: string, records: FastaRecord[]) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "snorna-blast-"));
  const dbFastaPath = path.join(tempDir, "db.fasta");
  const queryPath = path.join(tempDir, "query.fasta");
  const dbPrefix = path.join(tempDir, "db");
  const dbContent = records.map((record) => `>${record.id}\n${record.sequence}`).join("\n");
  fs.writeFileSync(dbFastaPath, dbContent, "utf8");
  fs.writeFileSync(queryPath, `>query\n${sequence.replace(/\s+/g, "")}\n`, "utf8");

  try {
    await execFileAsync("makeblastdb", ["-in", dbFastaPath, "-dbtype", "nucl", "-out", dbPrefix], { timeout: 30_000 });
    const { stdout } = await execFileAsync(
      "blastn",
      ["-query", queryPath, "-db", dbPrefix, "-outfmt", "6 sseqid pident length evalue sstart send", "-max_target_seqs", "50"],
      { timeout: 30_000 },
    );
    return stdout
      .trim()
      .split(/\r?\n/)
      .filter((line) => line.length > 0)
      .map((line) => {
        const [subjectId, pident, length, evalue, sstart, send] = line.split("\t");
        return {
          subjectId,
          identityPct: Number(pident),
          alignmentLength: Number(length),
          eValue: evalue,
          start: Number(sstart),
          end: Number(send),
        };
      });
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
    const blastHits = await runBlastn(sequence, records);
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
