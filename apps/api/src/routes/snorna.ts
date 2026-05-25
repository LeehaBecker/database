import { Router } from "express";
import { prisma } from "../lib/db.js";
import { snornaFilterSchema } from "../lib/schemas.js";

export const snornaRouter = Router();

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

  res.json({ ...item, modificationSites: filteredModificationSites, highlightFragments });
});
