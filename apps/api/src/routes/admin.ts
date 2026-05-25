import { Router } from "express";
import multer from "multer";
import { requireAdmin } from "../middleware/admin-auth.js";

const upload = multer({ dest: "uploads/" });
export const adminRouter = Router();

adminRouter.post("/import", requireAdmin, upload.single("file"), async (req, res) => {
  res.json({
    message: "File uploaded for validation/import pipeline",
    fileName: req.file?.originalname ?? null,
  });
});
