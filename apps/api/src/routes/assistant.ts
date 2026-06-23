import { Router } from "express";
import OpenAI from "openai";
import { z } from "zod";
import {
  ASSISTANT_TOOL_DEFINITIONS,
  executeAssistantTool,
  type AssistantTable,
} from "../lib/assistant-tools.js";

export const assistantRouter = Router();

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(30),
});

const SYSTEM_PROMPT = `You are Snopy (סנופי), the personal research assistant for snoRNA-BIU, a non-coding RNA sequence database focused on Trypanosoma brucei and Leishmania major.

Your role:
- Answer questions about snoRNAs, homologs, box types (C/D and H/ACA), modification types (Nm for C/D, Psi/pseudouridylation for H/ACA), and related database content.
- ALWAYS use the provided tools for factual database queries. Never invent snoRNA IDs, lengths, or homolog relationships.
- When tool results include tabular data, give a brief summary in natural language and tell the user the table is shown below.
- Respond in the SAME language the user writes (Hebrew or English). If the user mixes languages, prefer the dominant language of their latest message.
- For homolog comparison queries across species, use find_homolog_pairs with the correct species slugs: "trypanosoma-brucei" and "leishmania-major".
- Length constraints: "under 80" means maxLength 79; "over 170" means minLength 171; "at least N" means minLength N; "at most N" means maxLength N.
- Be concise and scientific. Use proper organism names: Trypanosoma brucei (T. brucei), Leishmania major (L. major).`;

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

assistantRouter.post("/chat", async (req, res) => {
  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const openai = getOpenAIClient();
  if (!openai) {
    res.status(503).json({
      error: "Assistant unavailable",
      message: "OPENAI_API_KEY is not configured on the server.",
    });
    return;
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o";
  const tables: AssistantTable[] = [];

  const conversationMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...parsed.data.messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  try {
    for (let iteration = 0; iteration < 5; iteration++) {
      const completion = await openai.chat.completions.create({
        model,
        messages: conversationMessages,
        tools: ASSISTANT_TOOL_DEFINITIONS,
        tool_choice: "auto",
      });

      const choice = completion.choices[0];
      if (!choice?.message) {
        res.status(502).json({ error: "Empty response from language model" });
        return;
      }

      const assistantMessage = choice.message;
      conversationMessages.push(assistantMessage);

      if (!assistantMessage.tool_calls?.length) {
        res.json({
          message: assistantMessage.content ?? "",
          tables: tables.length ? tables : undefined,
        });
        return;
      }

      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.type !== "function") continue;

        let toolResult: unknown;
        try {
          const args = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};
          const { result, table } = await executeAssistantTool(toolCall.function.name, args);
          toolResult = result;
          if (table) tables.push(table);
        } catch (error) {
          toolResult = {
            error: error instanceof Error ? error.message : "Tool execution failed",
          };
        }

        conversationMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }
    }

    res.status(502).json({ error: "Assistant exceeded maximum tool iterations" });
  } catch (error) {
    console.error("Assistant chat error:", error);
    res.status(500).json({
      error: "Assistant request failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
