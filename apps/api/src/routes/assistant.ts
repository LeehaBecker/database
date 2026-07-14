import { Router } from "express";
import { z } from "zod";
import { getGeminiClient, runAssistantChat } from "../lib/gemini-client.js";

export const assistantRouter = Router();

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(30),
});

assistantRouter.post("/chat", async (req, res) => {
  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const gemini = getGeminiClient();
  if (!gemini) {
    res.status(503).json({
      error: "Assistant unavailable",
      message: "GEMINI_API_KEY is not configured on the server.",
    });
    return;
  }

  try {
    const { message, tables } = await runAssistantChat(parsed.data.messages);
    res.json({
      message,
      tables: tables?.length ? tables : undefined,
    });
  } catch (error) {
    console.error("Assistant chat error:", error);
    res.status(500).json({
      error: "Assistant request failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
