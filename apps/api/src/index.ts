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

const app = express();
app.use(helmet());
app.use(cors());
app.use(rateLimit({ windowMs: 60_000, limit: 180 }));
app.use(express.json({ limit: "2mb" }));

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

const port = Number(process.env.API_PORT ?? 4000);
app.listen(port, () => console.log(`API listening on ${port}`));
