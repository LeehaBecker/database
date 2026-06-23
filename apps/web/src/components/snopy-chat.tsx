"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, ChevronDown, Send } from "lucide-react";
import { ChatResultTable, type ChatTableData } from "./chat-result-table";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  tables?: ChatTableData[];
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "production" ? "http://api:4000" : "http://localhost:4000");

const GREETING_HE =
  "שלום! אני סנופי, העוזר האישי שלך. איך אוכל לעזור לך היום בחקר ה-snoRNA?";

const GREETING_EN =
  "Hello! I'm Snopy, your personal research assistant. How can I help you today with your snoRNA research?";

const SUGGESTED_PROMPTS = [
  "חיפוש גנים",
  "השוואה למינים אחרים",
  "snoRNAs involved in pseudouridylation",
];

function isHebrew(text: string): boolean {
  return /[\u0590-\u05FF]/.test(text);
}

function detectDirection(text: string): "rtl" | "ltr" {
  return isHebrew(text) ? "rtl" : "ltr";
}

export function SnopyChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: GREETING_HE },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [open, messages, loading, scrollToBottom]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const apiMessages = nextMessages
        .filter(
          (m) =>
            m.role === "user" ||
            (m.role === "assistant" && m.content !== GREETING_HE && m.content !== GREETING_EN),
        )
        .map((m) => ({ role: m.role, content: m.content }));

      const payloadMessages =
        apiMessages.length > 0 ? apiMessages : [{ role: "user" as const, content: trimmed }];

      const response = await fetch(`${API_BASE}/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payloadMessages }),
      });

      const data = (await response.json()) as {
        message?: string;
        tables?: ChatTableData[];
        error?: string;
      };

      if (!response.ok) {
        const errorText = data.message ?? data.error ?? `Request failed (${response.status})`;
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: isHebrew(trimmed)
              ? `מצטער, אירעה שגיאה: ${errorText}`
              : `Sorry, an error occurred: ${errorText}`,
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message ?? "",
          tables: data.tables,
        },
      ]);
    } catch (error) {
      const errorText = error instanceof Error ? error.message : "Network error";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: isHebrew(trimmed)
            ? `מצטער, לא הצלחתי להתחבר לשרת: ${errorText}`
            : `Sorry, could not reach the server: ${errorText}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void sendMessage(input);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-700 text-white shadow-lg transition hover:bg-indigo-800 hover:shadow-xl"
        aria-label="Open Snopy research assistant"
      >
        <Bot className="h-7 w-7" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex w-[min(100vw-2rem,24rem)] flex-col overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-2xl sm:w-96">
      <header className="flex items-center gap-2 bg-indigo-800 px-4 py-3 text-white">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded p-1 hover:bg-indigo-700"
          aria-label="Close chat"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
        <h2 className="flex-1 text-center text-sm font-semibold">עוזר מחקר אישי: סנופי</h2>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600">
          <Bot className="h-5 w-5" />
        </div>
      </header>

      <div className="flex max-h-[28rem] min-h-[20rem] flex-1 flex-col overflow-y-auto bg-slate-50 p-3">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-3 flex gap-2 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {message.role === "assistant" && (
              <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                <Bot className="h-4 w-4" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                message.role === "user"
                  ? "bg-indigo-700 text-white"
                  : "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200"
              }`}
              dir={detectDirection(message.content)}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.tables?.map((table, tableIndex) => (
                <ChatResultTable key={tableIndex} table={table} />
              ))}
            </div>
          </div>
        ))}

        {loading && (
          <div className="mb-3 flex gap-2">
            <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl bg-white px-3 py-2 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
              <span className="inline-flex gap-1">
                <span className="animate-bounce">·</span>
                <span className="animate-bounce [animation-delay:0.1s]">·</span>
                <span className="animate-bounce [animation-delay:0.2s]">·</span>
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-slate-200 bg-white p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                setInput(prompt);
                inputRef.current?.focus();
              }}
              className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs text-indigo-800 transition hover:bg-indigo-100"
              dir={detectDirection(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="הזינו שאלת מחקר..."
            className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
            dir={detectDirection(input || GREETING_HE)}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-700 text-white transition hover:bg-indigo-800 disabled:bg-slate-300"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
