import { NextRequest } from "next/server";

const API_BASE =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "production" ? "http://api:4000" : "http://localhost:4000");

export async function GET(_request: NextRequest, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  const decoded = decodeURIComponent(file);
  const target = `${API_BASE}/rrna/secondary-structure/${encodeURIComponent(decoded)}`;
  const response = await fetch(target, { cache: "no-store" });
  if (!response.ok) {
    return new Response("File not found", { status: response.status });
  }
  const arrayBuffer = await response.arrayBuffer();
  return new Response(arrayBuffer, {
    status: 200,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/octet-stream",
      "cache-control": "public, max-age=60",
    },
  });
}
