import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import xlsx from "xlsx";
import { prisma } from "./client.js";

const ROOT_DATA = process.env.DATA_PATH ?? "C:/Users/ALEXANDER/Desktop/transfer-snorna-extracted/Site-db-data";

function readCsv(fileName: string): Record<string, unknown>[] {
  const filePath = path.join(ROOT_DATA, fileName);
  if (!fs.existsSync(filePath)) return [];
  return parse(fs.readFileSync(filePath, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

function readXlsx(fileName: string): Record<string, unknown>[] {
  const filePath = path.join(ROOT_DATA, fileName);
  if (!fs.existsSync(filePath)) return [];
  const wb = xlsx.readFile(filePath);
  return xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" }) as Record<
    string,
    unknown
  >[];
}

function pick(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const match = Object.keys(row).find((k) => k.trim().replace(/^\uFEFF/, "") === key);
    if (!match) continue;
    const value = String(row[match] ?? "").trim();
    if (value) return value;
  }
  return "";
}

function readFastaSequence(fileName: string): string {
  const filePath = path.join(ROOT_DATA, fileName);
  if (!fs.existsSync(filePath)) return "";
  const lines = fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.length > 0 && !line.startsWith(">"));
  return lines.join("").trim().toUpperCase();
}

async function main() {
  const organism = await prisma.organism.findUnique({ where: { slug: "trypanosoma-brucei" } });
  if (!organism) throw new Error("Missing organism seed");

  await prisma.genomicLocation.deleteMany({ where: { snoRna: { organismId: organism.id } } });
  await prisma.snoRnaTarget.deleteMany({ where: { snoRna: { organismId: organism.id } } });
  await prisma.modificationSite.deleteMany({ where: { snoRna: { organismId: organism.id } } });
  await prisma.article.deleteMany({ where: { organismId: organism.id } });
  await prisma.rrnaUnit.deleteMany({ where: { organismId: organism.id } });
  await prisma.asset.deleteMany({ where: { organismId: organism.id } });

  for (const row of readCsv("all_snoRNA_table.csv")) {
    const snornaId = pick(row, "snoRNA_ID");
    if (!snornaId) continue;
    await prisma.snoRna.upsert({
      where: { organismId_snornaId: { organismId: organism.id, snornaId } },
      update: {
        sequence: pick(row, "Sequence"),
        length: Number(pick(row, "Length") || 0),
        type: pick(row, "Type"),
      },
      create: {
        organismId: organism.id,
        snornaId,
        sequence: pick(row, "Sequence"),
        length: Number(pick(row, "Length") || 0),
        type: pick(row, "Type"),
      },
    });
  }

  for (const row of readXlsx("chr_locations.xlsx")) {
    const snornaId = pick(row, "snoRNA_ID");
    if (!snornaId) continue;
    const sno = await prisma.snoRna.findUnique({
      where: { organismId_snornaId: { organismId: organism.id, snornaId } },
    });
    if (!sno) continue;
    await prisma.genomicLocation.create({
      data: {
        snoRnaId: sno.id,
        chr: pick(row, "chr"),
        start: Number(pick(row, "start") || 0),
        end: Number(pick(row, "end") || 0),
        strand: pick(row, "strand"),
      },
    });
  }

  for (const row of readCsv("snoRNA_targets.csv")) {
    const snornaId = pick(row, "snoRNA_ID");
    if (!snornaId) continue;
    const sno = await prisma.snoRna.findUnique({
      where: { organismId_snornaId: { organismId: organism.id, snornaId } },
    });
    if (!sno) continue;
    await prisma.snoRnaTarget.create({
      data: {
        snoRnaId: sno.id,
        targetSequence1: pick(row, "Target Sequence 1") || null,
        targetSequence2: pick(row, "Target Sequence 2") || null,
        cBox: pick(row, "C box") || null,
        cBox2: pick(row, "C box 2") || null,
        dBox: pick(row, "D box") || null,
        dBox2: pick(row, "D box 2") || null,
        dBox3: pick(row, "D box 3") || null,
      },
    });
  }

  for (const row of readXlsx("TB_LM_HACA_IN_PARTS_02Oct2014.xlsx")) {
    const snornaId = pick(row, "snoRNA_ID");
    if (!snornaId) continue;
    const sno = await prisma.snoRna.findUnique({
      where: { organismId_snornaId: { organismId: organism.id, snornaId } },
    });
    if (!sno) continue;
    await prisma.snoRnaTarget.create({
      data: {
        snoRnaId: sno.id,
        osLeft: pick(row, "OS_LEFT") || null,
        leftPocket: pick(row, "LEFT_POCKET") || null,
        innerStem: pick(row, "INNER_STEM") || null,
        rightPocket: pick(row, "RIGHT_POCKET") || null,
        outerStemRight: pick(row, "OUTTER_STEM_RIGHT") || null,
      },
    });
  }

  for (const row of readXlsx("subunits_coordinates.xlsx")) {
    const subunit = pick(row, "subunit");
    if (!subunit) continue;
    await prisma.rrnaUnit.upsert({
      where: { organismId_subunit: { organismId: organism.id, subunit } },
      update: { start: Number(pick(row, "start")), end: Number(pick(row, "end")) },
      create: {
        organismId: organism.id,
        subunit,
        start: Number(pick(row, "start")),
        end: Number(pick(row, "end")),
      },
    });
  }

  const rrnaFullSequence = readFastaSequence("TB_rRNA_chr2.fa");
  if (rrnaFullSequence.length > 0) {
    const units = await prisma.rrnaUnit.findMany({ where: { organismId: organism.id } });
    for (const unit of units) {
      const startIndex = Math.max(unit.start - 1, 0);
      const endIndex = Math.max(unit.end, unit.start);
      const unitSequence = rrnaFullSequence.slice(startIndex, endIndex);
      await prisma.rrnaUnit.update({
        where: { id: unit.id },
        data: { sequence: unitSequence || null },
      });
    }
    await prisma.asset.create({
      data: {
        organismId: organism.id,
        category: "rrna_sequence",
        title: "TB_rRNA_chr2_full_sequence",
        path: path.join(ROOT_DATA, "TB_rRNA_chr2.fa"),
        format: "fasta",
      },
    });
  }

  for (const [file, source, modType] of [
    ["TB_rRNA_annot_Nm.xlsx", "Nm", "Nm"],
    ["TB_rRNA_annot_Psi.xlsx", "Psi", "Psi"],
  ] as const) {
    for (const row of readXlsx(file)) {
      const snornaId = pick(row, "snoRNA_ID");
      if (!snornaId) continue;
      const sno = await prisma.snoRna.findUnique({
        where: { organismId_snornaId: { organismId: organism.id, snornaId } },
      });
      if (!sno) continue;
      const rrnaSubunit = pick(row, "rRNA_unit", "rRNA subunit");
      const rrnaUnit = await prisma.rrnaUnit.findFirst({
        where: { organismId: organism.id, subunit: rrnaSubunit },
      });
      await prisma.modificationSite.create({
        data: {
          snoRnaId: sno.id,
          rrnaUnitId: rrnaUnit?.id ?? null,
          source,
          rrnaSubunit,
          position: Number(pick(row, "position") || 0),
          count: Number(pick(row, "count") || 0),
          bp: pick(row, "BP") || null,
          modType,
        },
      });
    }
  }

  for (const row of readCsv("Articles.csv")) {
    const title = pick(row, "Title");
    if (!title) continue;
    const pmid = pick(row, "PMID");
    await prisma.article.create({
      data: {
        organismId: organism.id,
        pmid: pmid || null,
        title,
        authors: pick(row, "Authors") || null,
        citation: pick(row, "Citation") || null,
        firstAuthor: pick(row, "First Author") || null,
        journalBook: pick(row, "Journal/Book") || null,
        publicationYear: Number(pick(row, "Publication Year")) || null,
        pmcid: pick(row, "PMCID") || null,
        nihmsId: pick(row, "NIHMS ID") || null,
        doi: pick(row, "DOI") || null,
        externalUrl: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : null,
      },
    });
  }

  await prisma.tool.upsert({
    where: { slug: "blast" },
    update: {},
    create: {
      slug: "blast",
      name: "BLAST",
      description: "Run local BLAST against rRNA sequences",
      externalUrl:
        "https://blast.ncbi.nlm.nih.gov/Blast.cgi?PROGRAM=blastn&PAGE_TYPE=BlastSearch&LINK_LOC=blasthome",
    },
  });

  await prisma.tool.upsert({
    where: { slug: "genome-browser" },
    update: {},
    create: {
      slug: "genome-browser",
      name: "Genome Browser",
      description: "Browse genomic features with filters and zoom",
    },
  });

  for (const pdf of ["Figure 4.pdf", "Figure 5.pdf", "Figure 6.pdf"]) {
    const p = path.join(ROOT_DATA, "Secondary structure", pdf);
    if (!fs.existsSync(p)) continue;
    await prisma.asset.create({
      data: {
        organismId: organism.id,
        category: "rrna_secondary_structure",
        title: pdf.replace(".pdf", ""),
        path: p,
        format: "pdf",
      },
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
