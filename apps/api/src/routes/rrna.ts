import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/db.js";

export const rrnaRouter = Router();
const ROOT_DATA = process.env.DATA_PATH ?? "C:/Users/ALEXANDER/Desktop/transfer-snorna-extracted/Site-db-data";

rrnaRouter.get("/", async (req, res) => {
  const species = String(req.query.species ?? "trypanosoma-brucei");
  const organism = await prisma.organism.findUnique({ where: { slug: species } });
  if (!organism) {
    res.status(404).json({ error: "organism not found" });
    return;
  }
  const units = await prisma.rrnaUnit.findMany({
    where: { organismId: organism.id },
    orderBy: { start: "asc" },
  });
  const assets = await prisma.asset.findMany({
    where: { organismId: organism.id, category: "rrna_secondary_structure" },
  });
  const rrnaSequence = units
    .map((unit) => unit.sequence ?? "")
    .filter((sequence) => sequence.length > 0)
    .join("");
  const assetsWithUrls = assets.map((asset) => ({
    ...asset,
    publicUrl: `/rrna/secondary-structure/${path.basename(asset.path)}`,
  }));
  const structure3dUrl = species === "leishmania-major" ? null : "/rrna/3d/cif";
  const structure3dExternalUrl = species === "leishmania-major" ? "https://www.rcsb.org/3d-view/9FXO" : null;
  res.json({ organism, units, assets: assetsWithUrls, rrnaSequence, structure3dUrl, structure3dExternalUrl });
});

rrnaRouter.get("/modifications", async (_req, res) => {
  const species = typeof _req.query.species === "string" ? _req.query.species : undefined;
  const rows = await prisma.modificationSite.findMany({
    where: species
      ? {
          snoRna: {
            organism: { slug: species },
          },
        }
      : undefined,
    include: { snoRna: true },
    orderBy: [{ rrnaSubunit: "asc" }, { count: "asc" }],
  });
  res.json(rows);
});

rrnaRouter.get("/secondary-structure/:fileName", (req, res) => {
  const fileName = path.basename(String(req.params.fileName ?? ""));
  const pdfPath = path.join(ROOT_DATA, "Secondary structure", fileName);
  if (!fs.existsSync(pdfPath)) {
    res.status(404).json({ error: "secondary structure file not found" });
    return;
  }
  res.sendFile(pdfPath);
});

rrnaRouter.get("/3d/cif", (_req, res) => {
  const cifPath = path.join(ROOT_DATA, "8ova.cif");
  if (!fs.existsSync(cifPath)) {
    res.status(404).json({ error: "3d structure file not found" });
    return;
  }
  res.sendFile(cifPath);
});
