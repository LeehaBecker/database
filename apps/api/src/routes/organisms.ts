import { Router } from "express";
import { prisma } from "../lib/db.js";
import { organismSchema } from "../lib/schemas.js";
import { requireAdmin } from "../middleware/admin-auth.js";

export const organismsRouter = Router();

organismsRouter.get("/", async (_req, res) => {
  const rows = await prisma.organism.findMany({ orderBy: { name: "asc" } });
  res.json(rows);
});

organismsRouter.post("/", requireAdmin, async (req, res) => {
  const parsed = organismSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const created = await prisma.organism.create({ data: parsed.data });
  res.status(201).json(created);
});
