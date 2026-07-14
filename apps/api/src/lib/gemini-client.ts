import {
  GoogleGenerativeAI,
  type Content,
  type FunctionDeclaration,
  type Part,
} from "@google/generative-ai";
import {
  executeAssistantTool,
  GEMINI_FUNCTION_DECLARATIONS,
  type AssistantTable,
} from "./assistant-tools.js";

export const ASSISTANT_SYSTEM_PROMPT = `You are Snopy (סנופי), the personal research assistant for snoRNA-BIU, a non-coding RNA sequence database focused on Trypanosoma brucei and Leishmania major.

Your role:
- Answer questions about snoRNAs, homologs, box types (C/D and H/ACA), modification types (Nm for C/D, Psi/pseudouridylation for H/ACA), and related database content.
- ALWAYS use the provided tools for factual database queries. Never invent snoRNA IDs, lengths, or homolog relationships.
- When tool results include tabular data, give a brief summary in natural language and tell the user the table is shown below.
- Respond in the SAME language the user writes (Hebrew or English). If the user mixes languages, prefer the dominant language of their latest message.
- For homolog comparison queries across species, use find_homolog_pairs with the correct species slugs: "trypanosoma-brucei" and "leishmania-major".
- Length constraints: "under 80" means maxLength 79; "over 170" means minLength 171; "at least N" means minLength N; "at most N" means maxLength N.
- Be concise and scientific. Use proper organism names: Trypanosoma brucei (T. brucei), Leishmania major (L. major).`;

export type AssistantChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const MAX_TOOL_ITERATIONS = 5;
const MAX_RATE_LIMIT_RETRIES = 2;

function parseRetryDelaySeconds(message: string): number | null {
  const match = message.match(/retry in ([\d.]+)s/i);
  if (!match?.[1]) return null;
  const seconds = Math.ceil(Number(match[1]));
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

function formatGeminiError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes("429") ||
    message.includes("quota") ||
    message.includes("QuotaFailure") ||
    message.includes("retry in")
  ) {
    const delay = parseRetryDelaySeconds(message);
    if (message.includes("PerDay") || message.includes("PerProjectPerDay")) {
      return "Daily Gemini free-tier limit reached. Try again tomorrow, or set GEMINI_MODEL=gemini-2.0-flash-lite in .env for a separate quota pool.";
    }
    if (delay) {
      return `Gemini rate limit reached (free tier). Wait about ${delay} seconds and try again. Each bot reply may use several API calls when querying the database.`;
    }
    return "Gemini rate limit reached (free tier). Wait a minute and try again, or set GEMINI_MODEL=gemini-2.0-flash-lite in .env.";
  }

  if (message.length > 200 && message.includes("@type")) {
    return "Gemini API error. Wait a minute and try again, or switch to GEMINI_MODEL=gemini-2.0-flash-lite.";
  }

  return message;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRateLimitRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const delaySeconds = parseRetryDelaySeconds(message);
      if (!delaySeconds || attempt === MAX_RATE_LIMIT_RETRIES) {
        break;
      }
      await sleep(delaySeconds * 1000);
    }
  }

  throw new Error(formatGeminiError(lastError));
}

export function getGeminiClient(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
}

function toGeminiRole(role: AssistantChatMessage["role"]): "user" | "model" {
  return role === "user" ? "user" : "model";
}

function toGeminiHistory(messages: AssistantChatMessage[]): Content[] {
  return messages.map((message) => ({
    role: toGeminiRole(message.role),
    parts: [{ text: message.content }],
  }));
}

function getResponseText(parts: Part[]): string {
  return parts
    .map((part) => part.text)
    .filter((text): text is string => typeof text === "string" && text.length > 0)
    .join("\n")
    .trim();
}

function getFunctionCalls(parts: Part[]) {
  return parts
    .map((part) => part.functionCall)
    .filter((call): call is NonNullable<Part["functionCall"]> => Boolean(call?.name));
}

export async function runAssistantChat(
  messages: AssistantChatMessage[],
): Promise<{ message: string; tables?: AssistantTable[] }> {
  const client = getGeminiClient();
  if (!client) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  if (messages.length === 0) {
    throw new Error("At least one message is required.");
  }

  const modelName = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash-lite";
  const tables: AssistantTable[] = [];

  const model = client.getGenerativeModel({
    model: modelName,
    systemInstruction: ASSISTANT_SYSTEM_PROMPT,
    tools: [
      {
        functionDeclarations: GEMINI_FUNCTION_DECLARATIONS as FunctionDeclaration[],
      },
    ],
  });

  const history = toGeminiHistory(messages.slice(0, -1));
  const latestMessage = messages[messages.length - 1];
  if (!latestMessage || latestMessage.role !== "user") {
    throw new Error("The latest message must be from the user.");
  }

  const chat = model.startChat({ history });
  let response = await withRateLimitRetry(() => chat.sendMessage(latestMessage.content));

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const candidate = response.response.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    const functionCalls = getFunctionCalls(parts);

    if (!functionCalls.length) {
      const message = getResponseText(parts);
      if (!message) {
        throw new Error("Empty response from language model");
      }
      return { message, tables: tables.length ? tables : undefined };
    }

    const functionResponseParts: Part[] = [];

    for (const functionCall of functionCalls) {
      const name = functionCall.name;
      if (!name) continue;

      let toolResult: unknown;
      try {
        const args = functionCall.args ?? {};
        const { result, table } = await executeAssistantTool(name, args);
        toolResult = result;
        if (table) tables.push(table);
      } catch (error) {
        toolResult = {
          error: error instanceof Error ? error.message : "Tool execution failed",
        };
      }

      functionResponseParts.push({
        functionResponse: {
          name,
          response: toolResult as Record<string, unknown>,
        },
      });
    }

    if (!functionResponseParts.length) {
      throw new Error("Model returned tool calls without valid function names.");
    }

    response = await withRateLimitRetry(() => chat.sendMessage(functionResponseParts));
  }

  throw new Error("Assistant exceeded maximum tool iterations");
}
