import { Router } from "express";
import { prisma } from "../lib/db.js";
import { snornaFilterSchema } from "../lib/schemas.js";

export const snornaRouter = Router();

function parseCsvIds(value: string | null | undefined): string[] {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item, index, arr) => item.length > 0 && arr.indexOf(item) === index);
}

function getSnornaLinkCandidates(snornaId: string): string[] {
  const base = snornaId.trim();
  const variants = [
    base,
    base.replace(/_g\d+$/i, ""),
    base.replace(/-\d+$/, ""),
    base.replace(/_copy\d+$/i, ""),
  ].filter(Boolean);
  return variants.filter((value, index) => variants.indexOf(value) === index);
}

snornaRouter.get("/", async (req, res) => {
  const parsed = snornaFilterSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { species, type, search, page, pageSize } = parsed.data;
  const where = {
    ...(type ? { type } : {}),
    ...(search ? { snornaId: { contains: search, mode: "insensitive" as const } } : {}),
    ...(species ? { organism: { slug: species } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.snoRna.findMany({
      where,
      include: { targets: true, modificationSites: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { snornaId: "asc" },
    }),
    prisma.snoRna.count({ where }),
  ]);
  res.json({
    items: items.map((item) => ({
      id: item.id,
      snoRNAId: item.snornaId,
      boxType: item.type,
      targetType: item.type === "C/D" ? "Nm" : "Psi",
      targetCount: item.targets.length,
    })),
    total,
    page,
    pageSize,
  });
});

snornaRouter.get("/clusters", async (req, res) => {
  const species = String(req.query.species ?? "trypanosoma-brucei");
  const organism = await prisma.organism.findUnique({ where: { slug: species } });
  if (!organism) {
    res.status(404).json({ error: "organism not found" });
    return;
  }

  const [clusterItems, snornas] = await Promise.all([
    prisma.snornaClusterItem.findMany({
      where: { organismId: organism.id },
      orderBy: [{ clusterId: "asc" }, { itemOrder: "asc" }],
    }),
    prisma.snoRna.findMany({
      where: { organismId: organism.id },
      select: { snornaId: true },
    }),
  ]);

  const existingIds = new Set(snornas.map((row) => row.snornaId));
  const grouped = new Map<
    number,
    {
      clusterId: number;
      coordinates: string | null;
      repeatedInGenome: number | null;
      referenceUrl: string | null;
      items: Array<{
        snornaId: string;
        linkedSnornaId: string | null;
        isAvailable: boolean;
        boxType: string | null;
        geneLengthNt: number | null;
        intergenicLengthNt: string | null;
      }>;
    }
  >();

  for (const row of clusterItems) {
    const matchedId = getSnornaLinkCandidates(row.snornaId).find((candidate) => existingIds.has(candidate)) ?? null;
    if (!grouped.has(row.clusterId)) {
      grouped.set(row.clusterId, {
        clusterId: row.clusterId,
        coordinates: row.coordinates ?? null,
        repeatedInGenome: row.clusterRepeatInGenome ?? null,
        referenceUrl: row.referenceUrl ?? null,
        items: [],
      });
    }
    grouped.get(row.clusterId)!.items.push({
      snornaId: row.snornaId,
      linkedSnornaId: matchedId,
      isAvailable: !!matchedId,
      boxType: row.boxType ?? null,
      geneLengthNt: row.geneLengthNt ?? null,
      intergenicLengthNt: row.intergenicLengthNt ?? null,
    });
  }

  res.json({
    organism: { slug: organism.slug, name: organism.name },
    clusters: Array.from(grouped.values()),
  });
});

snornaRouter.get("/:id", async (req, res) => {
  const item = await prisma.snoRna.findFirst({
    where: { snornaId: req.params.id },
    include: {
      genomicLocations: true,
      targets: true,
      modificationSites: { include: { rrnaUnit: true } },
      organism: true,
    },
  });
  if (!item) {
    res.status(404).json({ error: "snoRNA not found" });
    return;
  }

  const highlightFragments = item.targets
    .flatMap((target) => [
      { label: "cBox", value: target.cBox, priority: 5 },
      { label: "cBox2", value: target.cBox2, priority: 5 },
      { label: "dBox", value: target.dBox, priority: 5 },
      { label: "dBox2", value: target.dBox2, priority: 5 },
      { label: "dBox3", value: target.dBox3, priority: 5 },
      { label: "target1", value: target.targetSequence1, priority: 4 },
      { label: "target2", value: target.targetSequence2, priority: 4 },
      { label: "osLeft", value: target.osLeft, priority: 3 },
      { label: "leftPocket", value: target.leftPocket, priority: 3 },
      { label: "innerStem", value: target.innerStem, priority: 2 },
      { label: "rightPocket", value: target.rightPocket, priority: 3 },
      { label: "outerStemRight", value: target.outerStemRight, priority: 2 },
    ])
    .filter((fragment) => !!fragment.value);

  const filteredModificationSites = item.modificationSites
    .filter((site) => {
    if (item.type === "H/ACA") return site.source === "Psi" || site.modType === "Psi";
    if (item.type === "C/D") return site.source === "Nm" || site.modType === "Nm";
    return true;
  })
    .map((site) => ({
      ...site,
      rrnaUnitLabel: site.rrnaSubunit || site.rrnaUnit?.subunit || "Not Known",
    }));

  res.json({
    ...item,
    referenceUrl: item.referenceUrl ?? null,
    lmHomologIds: parseCsvIds(item.lmHomologIds),
    tbHomologIds: parseCsvIds(item.tbHomologIds),
    ldHomologIds: parseCsvIds(item.ldHomologIds),
    modificationSites: filteredModificationSites,
    highlightFragments,
  });
});
