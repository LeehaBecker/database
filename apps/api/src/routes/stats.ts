import { Router } from "express";
import { prisma } from "../lib/db.js";

export const statsRouter = Router();

statsRouter.get("/", async (_req, res) => {
  const organisms = await prisma.organism.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          snornas: true,
          rrnaUnits: true,
          snornaClusterItems: true,
          articles: true,
        },
      },
    },
  });

  const organismStats = await Promise.all(
    organisms.map(async (org) => {
      const [cdCount, hacaCount, nmCount, psiCount] = await Promise.all([
        prisma.snoRna.count({ where: { organismId: org.id, type: "C/D" } }),
        prisma.snoRna.count({ where: { organismId: org.id, type: "H/ACA" } }),
        prisma.modificationSite.count({
          where: { snoRna: { organismId: org.id }, OR: [{ modType: "Nm" }, { source: "Nm" }] },
        }),
        prisma.modificationSite.count({
          where: { snoRna: { organismId: org.id }, OR: [{ modType: "Psi" }, { source: "Psi" }] },
        }),
      ]);

      return {
        slug: org.slug,
        name: org.name,
        snornaTotal: org._count.snornas,
        snornaCd: cdCount,
        snornaHaca: hacaCount,
        modificationNm: nmCount,
        modificationPsi: psiCount,
        clusterItems: org._count.snornaClusterItems,
        articles: org._count.articles,
      };
    }),
  );

  const tbOrg = organisms.find((o) => o.slug === "trypanosoma-brucei");
  const lmOrg = organisms.find((o) => o.slug === "leishmania-major");

  let homologPairs = 0;
  if (tbOrg && lmOrg) {
    const tbWithLm = await prisma.snoRna.count({
      where: { organismId: tbOrg.id, lmHomologIds: { not: null } },
    });
    homologPairs = tbWithLm;
  }

  const ldHomologRefs = await prisma.snoRna.count({
    where: { ldHomologIds: { not: null } },
  });

  res.json({
    datasetVersion: process.env.DATASET_VERSION ?? "TriTrypDB-68",
    lastUpdated: process.env.DATASET_LAST_UPDATED ?? null,
    organisms: organismStats,
    homologPairsTbLm: homologPairs,
    ldHomologReferences: ldHomologRefs,
  });
});
