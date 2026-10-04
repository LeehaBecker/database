import { Router } from "express";
import { prisma } from "../lib/db.js";
import { buildSiteDuplexes, buildSubunitMap, toRna, type TargetMotifs } from "../lib/snorna-rrna-pairing.js";

export const interactionsRouter = Router();

async function resolveOrganism(slug: string) {
  return prisma.organism.findUnique({ where: { slug } });
}

function toMotifs(targets: TargetMotifs[]): TargetMotifs[] {
  return targets.map((target) => ({
    targetSequence1: target.targetSequence1,
    targetSequence2: target.targetSequence2,
    dBox: target.dBox,
    dBox2: target.dBox2,
    dBox3: target.dBox3,
    leftPocket: target.leftPocket,
    rightPocket: target.rightPocket,
    innerStem: target.innerStem,
  }));
}

interactionsRouter.get("/map", async (req, res) => {
  const species = String(req.query.species ?? "trypanosoma-brucei");
  const organism = await resolveOrganism(species);
  if (!organism) {
    res.status(404).json({ error: "organism not found" });
    return;
  }

  const units = await prisma.rrnaUnit.findMany({
    where: { organismId: organism.id },
    orderBy: { start: "asc" },
  });
  const withSequence = units.filter((unit) => toRna(unit.sequence).length > 0);
  const subunits = withSequence.map((unit) => unit.subunit);
  const counts = await prisma.modificationSite.groupBy({
    by: ["rrnaSubunit"],
    where: { snoRna: { organismId: organism.id } },
    _count: { _all: true },
  });
  const siteCounts = Object.fromEntries(counts.map((entry) => [entry.rrnaSubunit, entry._count._all]));
  const requested = String(req.query.subunit ?? "").trim();
  const unit = requested
    ? withSequence.find((entry) => entry.subunit === requested)
    : withSequence.find((entry) => siteCounts[entry.subunit]) ?? withSequence[0];
  if (!unit) {
    res.status(404).json({ error: requested ? `rRNA subunit "${requested}" not found` : "no rRNA sequence for this organism", subunits, siteCounts });
    return;
  }

  const sequenceBySubunit = new Map(units.map((entry) => [entry.subunit, entry.sequence]));
  const snornas = await prisma.snoRna.findMany({
    where: { organismId: organism.id, modificationSites: { some: { rrnaSubunit: unit.subunit } } },
    include: {
      targets: true,
      modificationSites: { include: { rrnaUnit: true } },
    },
  });

  const sites = buildSubunitMap(
    snornas.map((snorna) => ({
      snornaId: snorna.snornaId,
      type: snorna.type,
      sequence: snorna.sequence,
      targets: toMotifs(snorna.targets),
      sites: snorna.modificationSites.map((site) => ({
        subunit: site.rrnaSubunit,
        position: site.count,
        modType: site.modType ?? site.source,
        bp: site.bp,
        rrnaSequence: site.rrnaUnit?.sequence ?? sequenceBySubunit.get(site.rrnaSubunit) ?? null,
      })),
    })),
    unit.subunit,
    unit.sequence,
  );

  res.json({
    subunit: unit.subunit,
    subunits,
    siteCounts,
    sequence: toRna(unit.sequence),
    sites,
  });
});

interactionsRouter.get("/", async (req, res) => {
  const mode = String(req.query.mode ?? "byPosition");
  const species = String(req.query.species ?? "trypanosoma-brucei");
  const organism = await resolveOrganism(species);
  if (!organism) {
    res.status(404).json({ error: "organism not found" });
    return;
  }

  const units = await prisma.rrnaUnit.findMany({ where: { organismId: organism.id } });
  const sequenceBySubunit = new Map(units.map((unit) => [unit.subunit, unit.sequence]));

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

    const paired = buildSiteDuplexes({
      snornaId: snorna.snornaId,
      type: snorna.type,
      sequence: snorna.sequence,
      targets: toMotifs(snorna.targets),
      sites: snorna.modificationSites.map((site) => ({
        subunit: site.rrnaSubunit,
        position: site.count,
        modType: site.modType ?? site.source,
        bp: site.bp,
        rrnaSequence: site.rrnaUnit?.sequence ?? sequenceBySubunit.get(site.rrnaSubunit) ?? null,
      })),
    });

    res.json({
      mode: "bySnorna",
      snorna: {
        snornaId: snorna.snornaId,
        type: snorna.type,
        sequence: snorna.sequence,
        length: snorna.length,
      },
      targets: snorna.modificationSites.map((site, index) => ({
        rrnaSubunit: site.rrnaSubunit,
        rrnaUnitLabel: site.rrnaSubunit || site.rrnaUnit?.subunit || "Not Known",
        position: site.count,
        modType: site.modType ?? site.source,
        bp: site.bp,
        duplex: paired[index]?.duplex ?? null,
        duplexNote: paired[index]?.note ?? null,
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

  const rrnaUnit = units.find((unit) => unit.subunit === subunit) ?? null;

  res.json({
    mode: "byPosition",
    subunit,
    position,
    rrnaUnit: rrnaUnit
      ? { subunit: rrnaUnit.subunit, start: rrnaUnit.start, end: rrnaUnit.end }
      : null,
    guidingSnornas: sites.map((site) => {
      const [paired] = buildSiteDuplexes({
        snornaId: site.snoRna.snornaId,
        type: site.snoRna.type,
        sequence: site.snoRna.sequence,
        targets: toMotifs(site.snoRna.targets),
        sites: [
          {
            subunit: site.rrnaSubunit,
            position: site.count,
            modType: site.modType ?? site.source,
            bp: site.bp,
            rrnaSequence: site.rrnaUnit?.sequence ?? sequenceBySubunit.get(site.rrnaSubunit) ?? null,
          },
        ],
      });
      return {
        snornaId: site.snoRna.snornaId,
        type: site.snoRna.type,
        modType: site.modType ?? site.source,
        bp: site.bp,
        duplex: paired?.duplex ?? null,
        duplexNote: paired?.note ?? null,
        targets: site.snoRna.targets,
      };
    }),
  });
});
