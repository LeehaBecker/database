import { genomeVersionLabel } from "@/lib/site-config";

export function GenomeVersionBadge({ organismSlug, className = "text-sm" }: { organismSlug: string; className?: string }) {
  const version = genomeVersionLabel(organismSlug);
  if (!version) return null;
  return <span className={`italic font-normal text-slate-600 ${className}`}>Genome version: {version}</span>;
}
