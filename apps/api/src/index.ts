import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { snornaRouter } from "./routes/snorna.js";
import { rrnaRouter } from "./routes/rrna.js";
import { organismsRouter } from "./routes/organisms.js";
import { contentRouter } from "./routes/content.js";
import { adminRouter } from "./routes/admin.js";
import { blastRouter } from "./routes/blast.js";
import { genomeBrowserRouter } from "./routes/genome-browser.js";
import { chimeraRouter } from "./routes/chimera.js";
import { assistantRouter } from "./routes/assistant.js";
import { statsRouter } from "./routes/stats.js";
import { interactionsRouter } from "./routes/interactions.js";
import { homologsRouter } from "./routes/homologs.js";
import { downloadsRouter } from "./routes/downloads.js";
import { sequenceToolsRouter } from "./routes/sequence-tools.js";

const app = express();
app.use(helmet());
app.use(cors());
app.use(rateLimit({ windowMs: 60_000, limit: 180 }));
app.use(express.json({ limit: "2mb" }));

const assistantRateLimit = rateLimit({ windowMs: 60_000, limit: 20 });

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.get("/ready", (_req, res) => res.json({ status: "ready" }));
app.use("/snorna", snornaRouter);
app.use("/rrna", rrnaRouter);
app.use("/organisms", organismsRouter);
app.use("/", contentRouter);
app.use("/admin", adminRouter);
app.use("/tools/blast", blastRouter);
app.use("/tools/genome-browser", genomeBrowserRouter);
app.use("/chimera", chimeraRouter);
app.use("/stats", statsRouter);
app.use("/tools/interactions", interactionsRouter);
app.use("/tools/homologs", homologsRouter);
app.use("/downloads", downloadsRouter);
app.use("/tools/sequence", sequenceToolsRouter);
if (process.env.ENABLE_ASSISTANT !== "false") {
  app.use("/assistant", assistantRateLimit, assistantRouter);
}

const port = Number(process.env.API_PORT ?? 4000);
app.listen(port, () => console.log(`API listening on ${port}`));
