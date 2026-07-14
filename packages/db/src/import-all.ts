import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import type { PrismaClient } from "@prisma/client";
import xlsx from "xlsx";
import { prisma } from "./client.js";

const db = prisma as PrismaClient;

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

function readCsvColumns(fileName: string): string[] {
  const filePath = path.join(ROOT_DATA, fileName);
  if (!fs.existsSync(filePath)) return [];
  const rows = parse(fs.readFileSync(filePath, "utf8"), {
    columns: false,
    skip_empty_lines: true,
    trim: true,
    to_line: 1,
  }) as unknown[][];
  if (!rows.length) return [];
  return rows[0]
    .map((value) => String(value ?? "").trim().replace(/^\uFEFF/, ""))
    .filter((value, index, arr) => value.length > 0 && arr.indexOf(value) === index);
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

function readXlsxSheet(fileName: string, sheetName: string): Record<string, unknown>[] {
  const filePath = path.join(ROOT_DATA, fileName);
  if (!fs.existsSync(filePath)) return [];
  const wb = xlsx.readFile(filePath);
  if (!wb.Sheets[sheetName]) return [];
  return xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" }) as Record<string, unknown>[];
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

function readFastaEntries(fileName: string): Array<{ header: string; sequence: string }> {
  const filePath = path.join(ROOT_DATA, fileName);
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const entries: Array<{ header: string; sequence: string }> = [];
  let currentHeader = "";
  let currentSequence: string[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    if (line.startsWith(">")) {
      if (currentHeader) {
        entries.push({
          header: currentHeader,
          sequence: currentSequence.join("").trim().toUpperCase(),
        });
      }
      currentHeader = line.replace(/^>/, "").trim();
      currentSequence = [];
      continue;
    }
    currentSequence.push(line.trim());
  }

  if (currentHeader) {
    entries.push({
      header: currentHeader,
      sequence: currentSequence.join("").trim().toUpperCase(),
    });
  }

  return entries.filter((entry) => entry.sequence.length > 0);
}

function readRowsByExtension(baseFileNameWithoutExt: string): Record<string, unknown>[] {
  const csvFile = `${baseFileNameWithoutExt}.csv`;
  const xlsxFile = `${baseFileNameWithoutExt}.xlsx`;
  const csvPath = path.join(ROOT_DATA, csvFile);
  const xlsxPath = path.join(ROOT_DATA, xlsxFile);
  if (fs.existsSync(csvPath)) return readCsv(csvFile);
  if (fs.existsSync(xlsxPath)) return readXlsx(xlsxFile);
  return [];
}

function parseHomologList(value: string): string[] {
  return value
    .split(/[,;\/\n\r]+|\s+/)
    .map((part) => part.trim())
    .filter((part, index, arr) => part.length > 0 && arr.indexOf(part) === index);
}

function normalizeRowForJson(row: Record<string, unknown>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [rawKey, rawValue] of Object.entries(row)) {
    const key = rawKey.trim().replace(/^\uFEFF/, "");
    if (!key) continue;
    normalized[key] = String(rawValue ?? "").trim();
  }
  return normalized;
}

async function importChimeraMrnaRows(organismId: string, fileName: string) {
  const columns = readCsvColumns(fileName);
  const rows = readCsv(fileName);

  await db.chimeraDatasetMeta.upsert({
    where: {
      organismId_datasetKey: {
        organismId,
        datasetKey: "snorna-mrna",
      },
    },
    update: {
      columns,
      sourceFile: fileName,
    },
    create: {
      organismId,
      datasetKey: "snorna-mrna",
      columns,
      sourceFile: fileName,
    },
  });

  await db.chimeraMrnaEntry.deleteMany({ where: { organismId } });
  if (!rows.length) return;

  await db.chimeraMrnaEntry.createMany({
    data: rows.map((row, index) => ({
      organismId,
      rowOrder: index,
      rowData: normalizeRowForJson(row),
    })),
  });
}

async function importSnornaClusterRows(organismId: string, fileName: string) {
  const rows = readRowsByExtension(fileName.replace(/\.(csv|xlsx)$/i, ""));
  if (!rows.length) return;

  let currentClusterId = Number.NaN;
  let itemOrder = 0;
  const data = rows
    .map((row) => {
      const clusterId = Number(pick(row, "Cluster_ID"));
      const snornaId = pick(row, "snoRNA_ID");
      if (!Number.isFinite(clusterId) || !snornaId) return null;
      if (clusterId !== currentClusterId) {
        currentClusterId = clusterId;
        itemOrder = 0;
      }

      const clusterRepeatRaw = pick(row, "Number of times the cluster is repeated in the genome");
      const geneLengthRaw = pick(row, "Gene length (nt)");
      const entry = {
        organismId,
        clusterId,
        itemOrder,
        coordinates: pick(row, "Coordinates") || null,
        snornaId,
        boxType: pick(row, "Box") || null,
        geneLengthNt: Number(geneLengthRaw) || null,
        intergenicLengthNt: pick(row, " intergenic regions length (nt)", "intergenic regions length (nt)") || null,
        clusterRepeatInGenome: Number(clusterRepeatRaw) || null,
        referenceUrl: pick(row, "reference", "Reference") || null,
      };
      itemOrder += 1;
      return entry;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (!data.length) return;
  await (db as any).snornaClusterItem.createMany({ data });
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
  await db.chimeraDatasetMeta.deleteMany({ where: { organismId: organism.id } });
  await db.chimeraMrnaEntry.deleteMany({ where: { organismId: organism.id } });
  await (db as any).snornaClusterItem.deleteMany({ where: { organismId: organism.id } });

  for (const row of readCsv("all_snoRNA_table.csv")) {
    const snornaId = pick(row, "snoRNA_ID");
    if (!snornaId) continue;
    const referenceUrl = pick(row, "reference", "Reference") || null;
    const lmHomologIds = parseHomologList(pick(row, "LM Homolog")).join(",") || null;
    const primaryHomolog = lmHomologIds?.split(",")[0] || null;
    const singleCopyGene = pick(row, "Single copy gene") || "No";
    await prisma.snoRna.upsert({
      where: { organismId_snornaId: { organismId: organism.id, snornaId } },
      update: {
        sequence: pick(row, "Sequence"),
        length: Number(pick(row, "Length") || 0),
        type: pick(row, "Type"),
        referenceUrl,
        lmHomologIds,
        tbHomologIds: null,
        ldHomologIds: null,
        homologSnoRnaId: primaryHomolog,
        singleCopyGene,
      },
      create: {
        organismId: organism.id,
        snornaId,
        sequence: pick(row, "Sequence"),
        length: Number(pick(row, "Length") || 0),
        type: pick(row, "Type"),
        referenceUrl,
        lmHomologIds,
        tbHomologIds: null,
        ldHomologIds: null,
        homologSnoRnaId: primaryHomolog,
        singleCopyGene,
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
    update: {
      description: "Run local BLAST against all FASTA sequences in Site-db-data",
    },
    create: {
      slug: "blast",
      name: "BLAST",
      description: "Run local BLAST against all FASTA sequences in Site-db-data",
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

  await importChimeraMrnaRows(organism.id, "Chimera_TB_snoRNAs_w_mRNA.csv");
  await importSnornaClusterRows(organism.id, "snoRNA_Gene_Clusters_Trypanosoma_brucei.xlsx");

  const lmOrganism = await prisma.organism.findUnique({ where: { slug: "leishmania-major" } });
  if (!lmOrganism) throw new Error("Missing Leishmania major organism seed");

  await prisma.genomicLocation.deleteMany({ where: { snoRna: { organismId: lmOrganism.id } } });
  await prisma.snoRnaTarget.deleteMany({ where: { snoRna: { organismId: lmOrganism.id } } });
  await prisma.modificationSite.deleteMany({ where: { snoRna: { organismId: lmOrganism.id } } });
  await prisma.article.deleteMany({ where: { organismId: lmOrganism.id } });
  await prisma.rrnaUnit.deleteMany({ where: { organismId: lmOrganism.id } });
  await prisma.asset.deleteMany({ where: { organismId: lmOrganism.id } });
  await db.chimeraDatasetMeta.deleteMany({ where: { organismId: lmOrganism.id } });
  await db.chimeraMrnaEntry.deleteMany({ where: { organismId: lmOrganism.id } });
  await (db as any).snornaClusterItem.deleteMany({ where: { organismId: lmOrganism.id } });
  await prisma.snoRna.deleteMany({ where: { organismId: lmOrganism.id } });

  for (const row of readCsv("all_LM_snoRNA_table.csv")) {
    const snornaId = pick(row, "snoRNA_ID");
    if (!snornaId) continue;
    const referenceUrl = pick(row, "reference", "Reference") || null;
    const tbHomologIds = parseHomologList(pick(row, "TB Homolog", "TB homolog")).join(",") || null;
    const ldHomologIds = parseHomologList(pick(row, "LD Homolog", "LD homolog")).join(",") || null;
    const primaryHomolog = tbHomologIds?.split(",")[0] || null;
    const singleCopyGene = pick(row, "Single copy gene") || "No";
    await prisma.snoRna.create({
      data: {
        organismId: lmOrganism.id,
        snornaId,
        sequence: pick(row, "Sequence"),
        length: Number(pick(row, "Length") || 0),
        type: pick(row, "Type"),
        referenceUrl,
        lmHomologIds: null,
        tbHomologIds,
        ldHomologIds,
        homologSnoRnaId: primaryHomolog,
        singleCopyGene,
      },
    });
  }

  for (const row of readXlsx("chr_locations_LM.xlsx")) {
    const snornaId = pick(row, "snoRNA_ID");
    if (!snornaId) continue;
    const sno = await prisma.snoRna.findUnique({
      where: { organismId_snornaId: { organismId: lmOrganism.id, snornaId } },
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

  for (const row of readCsv("snoRNA_LM_targets.csv")) {
    const snornaId = pick(row, "snoRNA_ID");
    if (!snornaId) continue;
    const sno = await prisma.snoRna.findUnique({
      where: { organismId_snornaId: { organismId: lmOrganism.id, snornaId } },
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

  for (const row of readXlsxSheet("TB_LM_HACA_IN_PARTS_02Oct2014.xlsx", "LM")) {
    const snornaId = pick(row, "snoRNA_ID");
    if (!snornaId) continue;
    const sno = await prisma.snoRna.findUnique({
      where: { organismId_snornaId: { organismId: lmOrganism.id, snornaId } },
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

  const lmUnits = readFastaEntries("LM_rRNA_10Oct2012.fa");
  let coordinateStart = 1;
  for (const unit of lmUnits) {
    const subunit = unit.header.split(/\s+/)[0]?.trim() || `subunit_${coordinateStart}`;
    const start = coordinateStart;
    const end = start + unit.sequence.length - 1;
    await prisma.rrnaUnit.upsert({
      where: { organismId_subunit: { organismId: lmOrganism.id, subunit } },
      update: { start, end, sequence: unit.sequence },
      create: {
        organismId: lmOrganism.id,
        subunit,
        start,
        end,
        sequence: unit.sequence,
      },
    });
    coordinateStart = end + 1;
  }
  if (lmUnits.length > 0) {
    await prisma.asset.create({
      data: {
        organismId: lmOrganism.id,
        category: "rrna_sequence",
        title: "LM_rRNA_10Oct2012_split_sequence",
        path: path.join(ROOT_DATA, "LM_rRNA_10Oct2012.fa"),
        format: "fasta",
      },
    });
  }

  for (const [fileBase, source, modType] of [
    ["LM_rRNA_annot_Nm", "Nm", "Nm"],
    ["LM_rRNA_annot_Psi", "Psi", "Psi"],
  ] as const) {
    for (const row of readRowsByExtension(fileBase)) {
      const snornaId = pick(row, "snoRNA_ID");
      if (!snornaId) continue;
      const sno = await prisma.snoRna.findUnique({
        where: { organismId_snornaId: { organismId: lmOrganism.id, snornaId } },
      });
      if (!sno) continue;
      const rrnaSubunit = pick(row, "rRNA_unit", "rRNA subunit");
      const rrnaUnit = await prisma.rrnaUnit.findFirst({
        where: { organismId: lmOrganism.id, subunit: rrnaSubunit },
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

  await importChimeraMrnaRows(lmOrganism.id, "Chimera_LM_snoRNAs_w_mRNA.csv");

  const summary = {
    trypanosomaBrucei: {
      snornas: await prisma.snoRna.count({ where: { organismId: organism.id } }),
      genomicLocations: await prisma.genomicLocation.count({ where: { snoRna: { organismId: organism.id } } }),
      modificationSites: await prisma.modificationSite.count({ where: { snoRna: { organismId: organism.id } } }),
      rrnaUnits: await prisma.rrnaUnit.count({ where: { organismId: organism.id } }),
      clusterItems: await (db as any).snornaClusterItem.count({ where: { organismId: organism.id } }),
    },
    leishmaniaMajor: {
      snornas: await prisma.snoRna.count({ where: { organismId: lmOrganism.id } }),
      genomicLocations: await prisma.genomicLocation.count({ where: { snoRna: { organismId: lmOrganism.id } } }),
      modificationSites: await prisma.modificationSite.count({ where: { snoRna: { organismId: lmOrganism.id } } }),
      rrnaUnits: await prisma.rrnaUnit.count({ where: { organismId: lmOrganism.id } }),
    },
  };
  console.log("Import summary:", JSON.stringify(summary, null, 2));
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
