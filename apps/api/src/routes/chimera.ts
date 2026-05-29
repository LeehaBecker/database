import { Router } from "express";
import { prisma } from "../lib/db.js";
import { chimeraFilterSchema } from "../lib/schemas.js";

export const chimeraRouter = Router();

chimeraRouter.get("/mrna", async (req, res) => {
  const parsed = chimeraFilterSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const species = parsed.data.species ?? "trypanosoma-brucei";
  const page = parsed.data.page;
  const pageSize = parsed.data.pageSize;
  const search = parsed.data.search?.trim() ?? "";
  const organism = await prisma.organism.findUnique({ where: { slug: species } });
  if (!organism) {
    res.status(404).json({ error: "organism not found" });
    return;
  }

  const meta = await prisma.chimeraDatasetMeta.findUnique({
    where: {
      organismId_datasetKey: {
        organismId: organism.id,
        datasetKey: "snorna-mrna",
      },
    },
  });
  const columns = meta?.columns ?? [];

  if (search) {
    const allItems = await prisma.chimeraMrnaEntry.findMany({
      where: { organismId: organism.id },
      orderBy: { rowOrder: "asc" },
    });
    const loweredSearch = search.toLowerCase();
    const searchedRows = allItems
      .map((item) => (item.rowData ?? {}) as Record<string, string>)
      .filter((row) =>
        columns.some((column) => String(row[column] ?? "").toLowerCase().includes(loweredSearch)),
      );
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const rows = searchedRows.slice(start, end);
    res.json({
      columns,
      rows,
      total: searchedRows.length,
      page,
      pageSize,
    });
    return;
  }

  const [items, total] = await Promise.all([
    prisma.chimeraMrnaEntry.findMany({
      where: { organismId: organism.id },
      orderBy: { rowOrder: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.chimeraMrnaEntry.count({ where: { organismId: organism.id } }),
  ]);
  const rows = items.map((item) => (item.rowData ?? {}) as Record<string, string>);

  res.json({
    columns,
    rows,
    total,
    page,
    pageSize,
  });
});
