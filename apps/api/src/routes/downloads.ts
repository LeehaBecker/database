import { Router } from "express";
import { prisma } from "../lib/db.js";

export const downloadsRouter = Router();

async function resolveOrganism(slug: string) {
  return prisma.organism.findUnique({ where: { slug } });
}

function toFasta(entries: Array<{ id: string; sequence: string }>) {
  return entries.map((e) => `>${e.id}\n${e.sequence.replaceAll("T", "U")}`).join("\n");
}

function toCsv(rows: string[][]) {
  return rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
}

downloadsRouter.get("/snorna.fasta", async (req, res) => {
  const species = String(req.query.organism ?? req.query.species ?? "trypanosoma-brucei");
  const organism = await resolveOrganism(species);
  if (!organism) {
    res.status(404).json({ error: "organism not found" });
    return;
  }
  const snornas = await prisma.snoRna.findMany({
    where: { organismId: organism.id },
    orderBy: { snornaId: "asc" },
  });
  const fasta = toFasta(snornas.map((s) => ({ id: s.snornaId, sequence: s.sequence })));
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${species}-snornas.fasta"`);
  res.send(fasta);
});

downloadsRouter.get("/modifications.csv", async (req, res) => {
  const species = String(req.query.organism ?? req.query.species ?? "trypanosoma-brucei");
  const organism = await resolveOrganism(species);
  if (!organism) {
    res.status(404).json({ error: "organism not found" });
    return;
  }
  const sites = await prisma.modificationSite.findMany({
    where: { snoRna: { organismId: organism.id } },
    include: { snoRna: true },
    orderBy: [{ rrnaSubunit: "asc" }, { count: "asc" }],
  });
  const csv = toCsv([
    ["rRNA_subunit", "position", "mod_type", "base", "snorna_id"],
    ...sites.map((s) => [
      s.rrnaSubunit,
      String(s.count),
      s.modType ?? s.source,
      s.bp ?? "",
      s.snoRna.snornaId,
    ]),
  ]);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${species}-modifications.csv"`);
  res.send(csv);
});

downloadsRouter.get("/clusters.csv", async (req, res) => {
  const species = String(req.query.organism ?? req.query.species ?? "trypanosoma-brucei");
  const organism = await resolveOrganism(species);
  if (!organism) {
    res.status(404).json({ error: "organism not found" });
    return;
  }
  const clusters = await prisma.snornaClusterItem.findMany({
    where: { organismId: organism.id },
    orderBy: [{ clusterId: "asc" }, { itemOrder: "asc" }],
  });
  const csv = toCsv([
    ["cluster_id", "snorna_id", "box_type", "coordinates", "gene_length_nt", "intergenic_length_nt"],
    ...clusters.map((c) => [
      String(c.clusterId),
      c.snornaId,
      c.boxType ?? "",
      c.coordinates ?? "",
      c.geneLengthNt != null ? String(c.geneLengthNt) : "",
      c.intergenicLengthNt ?? "",
    ]),
  ]);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${species}-clusters.csv"`);
  res.send(csv);
});

downloadsRouter.get("/bundle.txt", async (req, res) => {
  const species = String(req.query.organism ?? req.query.species ?? "trypanosoma-brucei");
  const organism = await resolveOrganism(species);
  if (!organism) {
    res.status(404).json({ error: "organism not found" });
    return;
  }

  const [snornas, sites, clusters] = await Promise.all([
    prisma.snoRna.findMany({ where: { organismId: organism.id }, orderBy: { snornaId: "asc" } }),
    prisma.modificationSite.findMany({
      where: { snoRna: { organismId: organism.id } },
      include: { snoRna: true },
      orderBy: [{ rrnaSubunit: "asc" }, { count: "asc" }],
    }),
    prisma.snornaClusterItem.findMany({
      where: { organismId: organism.id },
      orderBy: [{ clusterId: "asc" }, { itemOrder: "asc" }],
    }),
  ]);

  const parts = [
    `# snoRNA-BIU data bundle: ${organism.name}`,
    `# Generated from database export`,
    "",
    "=== snornas.fasta ===",
    toFasta(snornas.map((s) => ({ id: s.snornaId, sequence: s.sequence }))),
    "",
    "=== modifications.csv ===",
    toCsv([
      ["rRNA_subunit", "position", "mod_type", "base", "snorna_id"],
      ...sites.map((s) => [s.rrnaSubunit, String(s.count), s.modType ?? s.source, s.bp ?? "", s.snoRna.snornaId]),
    ]),
    "",
    "=== clusters.csv ===",
    toCsv([
      ["cluster_id", "snorna_id", "box_type", "coordinates"],
      ...clusters.map((c) => [String(c.clusterId), c.snornaId, c.boxType ?? "", c.coordinates ?? ""]),
    ]),
  ];

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${species}-bundle.txt"`);
  res.send(parts.join("\n"));
});
