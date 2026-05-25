import { Router } from "express";
import { getGenomeCache, queryFeatures, querySequence, searchGenome } from "../lib/genome-browser-data.js";

export const genomeBrowserRouter = Router();

genomeBrowserRouter.get("/chromosomes", (_req, res) => {
  const data = getGenomeCache();
  res.json({ items: data.chromosomes });
});

genomeBrowserRouter.get("/features", (req, res) => {
  const chrom = String(req.query.chrom ?? "");
  const start = Number(req.query.start ?? 1);
  const end = Number(req.query.end ?? start + 5000);
  const search = typeof req.query.search === "string" ? req.query.search : "";
  if (!chrom) {
    res.status(400).json({ error: "chrom is required" });
    return;
  }
  const items = queryFeatures(chrom, start, end, search).slice(0, 2000);
  res.json({ items });
});

genomeBrowserRouter.get("/sequence", (req, res) => {
  const chrom = String(req.query.chrom ?? "");
  const start = Number(req.query.start ?? 1);
  const end = Number(req.query.end ?? start + 1000);
  if (!chrom) {
    res.status(400).json({ error: "chrom is required" });
    return;
  }
  const sequence = querySequence(chrom, start, end);
  res.json({ chrom, start, end, sequence });
});

genomeBrowserRouter.get("/search", (req, res) => {
  const q = String(req.query.q ?? "");
  res.json({ items: searchGenome(q) });
});
