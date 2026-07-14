const API_BASE =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "production" ? "http://api:4000" : "http://localhost:4000");

export const PUBLIC_API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  (typeof window !== "undefined" ? "http://localhost:4000" : API_BASE);

export async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`API error ${response.status}: ${path}`);
  return (await response.json()) as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`API error ${response.status}: ${path}`);
  return (await response.json()) as T;
}

export function downloadUrl(path: string) {
  return `${PUBLIC_API_BASE}${path}`;
}

export const DATASET_VERSION = process.env.NEXT_PUBLIC_DATASET_VERSION ?? "TriTrypDB-68";
