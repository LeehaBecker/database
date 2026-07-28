import Link from "next/link";
import type { ReactNode } from "react";

export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

export function formatModificationCell(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed || "—";
}

export function ModificationSiteReference({ value }: { value: string | null | undefined }): ReactNode {
  const trimmed = value?.trim();
  if (!trimmed) return "—";
  if (isHttpUrl(trimmed)) {
    return (
      <Link href={trimmed} target="_blank" rel="noreferrer" className="text-blue-700 underline">
        Reference
      </Link>
    );
  }
  return trimmed;
}
