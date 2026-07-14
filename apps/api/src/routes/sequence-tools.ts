import { Router } from "express";
import { prisma } from "../lib/db.js";

export const sequenceToolsRouter = Router();

const ACA_MOTIF = /ACA/g;

sequenceToolsRouter.post("/fasta-fetch", async (req, res) => {
  const ids = Array.isArray(req.body?.ids)
    ? req.body.ids.map((id: unknown) => String(id).trim()).filter(Boolean)
    : String(req.body?.ids ?? "")
        .split(/[\s,]+/)
        .map((id) => id.trim())
        .filter(Boolean);

  if (!ids.length) {
    res.status(400).json({ error: "At least one snoRNA ID is required" });
    return;
  }

  const snornas = await prisma.snoRna.findMany({
    where: { snornaId: { in: ids } },
    orderBy: { snornaId: "asc" },
  });

  const found = new Set(snornas.map((s) => s.snornaId));
  const missing = ids.filter((id: string) => !found.has(id));

  const fasta = snornas.map((s) => `>${s.snornaId}\n${s.sequence.replaceAll("T", "U")}`).join("\n");

  res.json({ fasta, found: [...found], missing });
});

sequenceToolsRouter.get("/motif-search", async (req, res) => {
  const motifType = String(req.query.type ?? "cd-box");
  const customQuery = typeof req.query.q === "string" ? req.query.q.trim().toUpperCase() : "";
  const species = typeof req.query.species === "string" ? req.query.species : undefined;

  const snornas = await prisma.snoRna.findMany({
    where: species ? { organism: { slug: species } } : undefined,
    include: { organism: true },
    orderBy: { snornaId: "asc" },
  });

  const results: Array<{ snornaId: string; organism: string; type: string; matches: string[] }> = [];

  for (const snorna of snornas) {
    const seq = snorna.sequence.toUpperCase().replaceAll("T", "U");
    let matches: string[] = [];

    if (motifType === "custom" && customQuery) {
      if (seq.includes(customQuery)) matches = [customQuery];
    } else if (motifType === "aca") {
      const acaMatches = seq.match(new RegExp(ACA_MOTIF.source, "g"));
      matches = acaMatches ?? [];
    } else {
      const normalized = seq.replaceAll("T", "U");
      const cdMatches = normalized.match(/[AGU][UGA][AGU]AUGA/gi);
      matches = cdMatches ?? [];
    }

    if (matches.length) {
      results.push({
        snornaId: snorna.snornaId,
        organism: snorna.organism.slug,
        type: snorna.type,
        matches: [...new Set(matches)],
      });
    }
  }

  res.json({ motifType, total: results.length, results });
});

sequenceToolsRouter.get("/coordinate-converter", async (req, res) => {
  const species = String(req.query.species ?? "trypanosoma-brucei");
  const subunit = String(req.query.subunit ?? "").trim();
  const position = req.query.position ? Number(req.query.position) : undefined;
  const absolutePosition = req.query.absolutePosition ? Number(req.query.absolutePosition) : undefined;

  const organism = await prisma.organism.findUnique({ where: { slug: species } });
  if (!organism) {
    res.status(404).json({ error: "organism not found" });
    return;
  }

  const units = await prisma.rrnaUnit.findMany({
    where: { organismId: organism.id },
    orderBy: { start: "asc" },
  });

  if (subunit && position) {
    const unit = units.find((u) => u.subunit === subunit);
    if (!unit) {
      res.status(404).json({ error: "subunit not found" });
      return;
    }
    const absolute = unit.start + position - 1;
    res.json({
      mode: "subunitToAbsolute",
      subunit,
      relativePosition: position,
      absoluteRrnaPosition: absolute,
      unitRange: { start: unit.start, end: unit.end },
      note: "Absolute position is within the concatenated rRNA sequence. For genomic coordinates on chromosome, use the genome browser.",
    });
    return;
  }

  if (absolutePosition) {
    const unit = units.find((u) => absolutePosition >= u.start && absolutePosition <= u.end);
    if (!unit) {
      res.status(404).json({ error: "position not within any subunit range" });
      return;
    }
    res.json({
      mode: "absoluteToSubunit",
      absoluteRrnaPosition: absolutePosition,
      subunit: unit.subunit,
      relativePosition: absolutePosition - unit.start + 1,
      unitRange: { start: unit.start, end: unit.end },
    });
    return;
  }

  res.status(400).json({
    error: "Provide subunit+position or absolutePosition",
    availableSubunits: units.map((u) => ({ subunit: u.subunit, start: u.start, end: u.end })),
  });
});
