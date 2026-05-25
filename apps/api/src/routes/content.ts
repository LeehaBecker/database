import { Router } from "express";
import { prisma } from "../lib/db.js";

export const contentRouter = Router();

contentRouter.get("/tools", async (_req, res) => {
  res.json(await prisma.tool.findMany({ orderBy: { name: "asc" } }));
});

contentRouter.get("/articles", async (_req, res) => {
  res.json(await prisma.article.findMany({ orderBy: { publicationYear: "desc" } }));
});

contentRouter.get("/libraries", async (_req, res) => {
  res.json(await prisma.sequencingLibrary.findMany({ orderBy: { name: "asc" } }));
});
