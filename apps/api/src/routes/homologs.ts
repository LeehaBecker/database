import { Router } from "express";
import { prisma } from "../lib/db.js";

export const homologsRouter = Router();

function parseCsvIds(value: string | null | undefined): string[] {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item, index, arr) => item.length > 0 && arr.indexOf(item) === index);
}

function percentIdentity(a: string, b: string): number {
  const left = a.toUpperCase().replaceAll("T", "U");
  const right = b.toUpperCase().replaceAll("T", "U");
  const len = Math.max(left.length, right.length);
  if (!len) return 0;
  let matches = 0;
  const minLen = Math.min(left.length, right.length);
  for (let i = 0; i < minLen; i += 1) {
    if (left[i] === right[i]) matches += 1;
  }
  return Math.round((matches / len) * 100);
}

homologsRouter.get("/", async (req, res) => {
  const boxType = typeof req.query.boxType === "string" ? req.query.boxType : undefined;
  const minLength = req.query.minLength ? Number(req.query.minLength) : undefined;
  const maxLength = req.query.maxLength ? Number(req.query.maxLength) : undefined;
  const singleCopyOnly = req.query.singleCopyOnly === "true";
  const hasLmHomolog = req.query.hasLmHomolog === "true";
  const hasTbHomolog = req.query.hasTbHomolog === "true";
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

  const [tbOrg, lmOrg] = await Promise.all([
    prisma.organism.findUnique({ where: { slug: "trypanosoma-brucei" } }),
    prisma.organism.findUnique({ where: { slug: "leishmania-major" } }),
  ]);
  if (!tbOrg || !lmOrg) {
    res.status(404).json({ error: "organisms not found" });
    return;
  }

  const tbSnornas = await prisma.snoRna.findMany({
    where: { organismId: tbOrg.id },
    select: {
      snornaId: true,
      sequence: true,
      length: true,
      type: true,
      singleCopyGene: true,
      lmHomologIds: true,
      ldHomologIds: true,
    },
  });

  const lmById = new Map(
    (
      await prisma.snoRna.findMany({
        where: { organismId: lmOrg.id },
        select: {
          snornaId: true,
          sequence: true,
          length: true,
          type: true,
          singleCopyGene: true,
          tbHomologIds: true,
          ldHomologIds: true,
        },
      })
    ).map((row) => [row.snornaId, row]),
  );

  const pairs: Array<{
    tbId: string;
    lmId: string | null;
    ldIds: string[];
    boxType: string;
    tbLength: number;
    lmLength: number | null;
    identity: number | null;
    tbSingleCopy: string | null;
    lmSingleCopy: string | null;
  }> = [];

  const seen = new Set<string>();

  for (const tb of tbSnornas) {
    const lmIds = parseCsvIds(tb.lmHomologIds);
    const ldIds = parseCsvIds(tb.ldHomologIds);
    const primaryLm = lmIds[0] ?? null;
    const lm = primaryLm ? lmById.get(primaryLm) : undefined;
    const pairKey = `${tb.snornaId}|${primaryLm ?? ""}`;
    if (seen.has(pairKey)) continue;
    seen.add(pairKey);

    pairs.push({
      tbId: tb.snornaId,
      lmId: primaryLm,
      ldIds,
      boxType: tb.type,
      tbLength: tb.length,
      lmLength: lm?.length ?? null,
      identity: lm ? percentIdentity(tb.sequence, lm.sequence) : null,
      tbSingleCopy: tb.singleCopyGene,
      lmSingleCopy: lm?.singleCopyGene ?? null,
    });
  }

  let filtered = pairs;
  if (boxType) filtered = filtered.filter((p) => p.boxType === boxType);
  if (minLength !== undefined) filtered = filtered.filter((p) => p.tbLength >= minLength);
  if (maxLength !== undefined) filtered = filtered.filter((p) => p.tbLength <= maxLength);
  if (singleCopyOnly) filtered = filtered.filter((p) => p.tbSingleCopy?.toLowerCase() === "yes");
  if (hasLmHomolog) filtered = filtered.filter((p) => !!p.lmId);
  if (hasTbHomolog) filtered = filtered.filter((p) => !!p.lmId);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.tbId.toLowerCase().includes(q) ||
        (p.lmId?.toLowerCase().includes(q) ?? false) ||
        p.ldIds.some((id) => id.toLowerCase().includes(q)),
    );
  }

  res.json({
    total: filtered.length,
    pairs: filtered,
    note: "LD homolog IDs are shown as text; organism page coming soon.",
  });
});

homologsRouter.get("/compare", async (req, res) => {
  const tbId = String(req.query.tbId ?? "").trim();
  const lmId = String(req.query.lmId ?? "").trim();
  if (!tbId || !lmId) {
    res.status(400).json({ error: "tbId and lmId are required" });
    return;
  }

  const [tb, lm] = await Promise.all([
    prisma.snoRna.findFirst({ where: { snornaId: tbId }, include: { organism: true } }),
    prisma.snoRna.findFirst({ where: { snornaId: lmId }, include: { organism: true } }),
  ]);
  if (!tb || !lm) {
    res.status(404).json({ error: "one or both snoRNAs not found" });
    return;
  }

  res.json({
    tb: {
      snornaId: tb.snornaId,
      sequence: tb.sequence,
      type: tb.type,
      length: tb.length,
      organism: tb.organism.slug,
    },
    lm: {
      snornaId: lm.snornaId,
      sequence: lm.sequence,
      type: lm.type,
      length: lm.length,
      organism: lm.organism.slug,
    },
    identity: percentIdentity(tb.sequence, lm.sequence),
  });
});
