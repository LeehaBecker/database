import { Router } from "express";
import { prisma } from "../lib/db.js";

export const interactionsRouter = Router();

async function resolveOrganism(slug: string) {
  return prisma.organism.findUnique({ where: { slug } });
}

interactionsRouter.get("/", async (req, res) => {
  const mode = String(req.query.mode ?? "byPosition");
  const species = String(req.query.species ?? "trypanosoma-brucei");
  const organism = await resolveOrganism(species);
  if (!organism) {
    res.status(404).json({ error: "organism not found" });
    return;
  }

  if (mode === "bySnorna") {
    const snornaId = String(req.query.snornaId ?? "").trim();
    if (!snornaId) {
      res.status(400).json({ error: "snornaId is required" });
      return;
    }

    const snorna = await prisma.snoRna.findFirst({
      where: { organismId: organism.id, snornaId },
      include: {
        targets: true,
        modificationSites: { include: { rrnaUnit: true } },
      },
    });
    if (!snorna) {
      res.status(404).json({ error: "snoRNA not found" });
      return;
    }

    res.json({
      mode: "bySnorna",
      snorna: {
        snornaId: snorna.snornaId,
        type: snorna.type,
        sequence: snorna.sequence,
        length: snorna.length,
      },
      targets: snorna.modificationSites.map((site) => ({
        rrnaSubunit: site.rrnaSubunit,
        rrnaUnitLabel: site.rrnaSubunit || site.rrnaUnit?.subunit || "Not Known",
        position: site.count,
        modType: site.modType ?? site.source,
        bp: site.bp,
      })),
      boxInfo: snorna.targets,
    });
    return;
  }

  const subunit = String(req.query.subunit ?? "").trim();
  const position = Number(req.query.position ?? 0);
  if (!subunit || !position) {
    res.status(400).json({ error: "subunit and position are required" });
    return;
  }

  const sites = await prisma.modificationSite.findMany({
    where: {
      rrnaSubunit: subunit,
      count: position,
      snoRna: { organismId: organism.id },
    },
    include: {
      snoRna: { include: { targets: true } },
      rrnaUnit: true,
    },
  });

  const rrnaUnit = await prisma.rrnaUnit.findFirst({
    where: { organismId: organism.id, subunit },
  });

  res.json({
    mode: "byPosition",
    subunit,
    position,
    rrnaUnit: rrnaUnit
      ? { subunit: rrnaUnit.subunit, start: rrnaUnit.start, end: rrnaUnit.end }
      : null,
    guidingSnornas: sites.map((site) => ({
      snornaId: site.snoRna.snornaId,
      type: site.snoRna.type,
      modType: site.modType ?? site.source,
      bp: site.bp,
      targets: site.snoRna.targets,
    })),
  });
});
