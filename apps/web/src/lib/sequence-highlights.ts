export type HighlightFragment = {
  label: string;
  value: string;
  priority: number;
};

export type HighlightCategory =
  | "cBox"
  | "dBox"
  | "target1"
  | "target2"
  | "hacaPocket"
  | "hacaStem";

export type SequenceSegment = {
  text: string;
  label: string | null;
};

export function buildSequenceSegments(
  sequence: string,
  fragments: HighlightFragment[],
): SequenceSegment[] {
  const seq = sequence.toUpperCase();
  const normalizedSeq = seq.replaceAll("U", "T");
  const marks: Array<{ start: number; end: number; label: string; priority: number }> = [];

  for (const fragment of fragments) {
    const token = fragment.value.replace(/\s+/g, "").toUpperCase().replaceAll("U", "T");
    if (!token) continue;
    let offset = 0;
    while (offset < normalizedSeq.length) {
      const idx = normalizedSeq.indexOf(token, offset);
      if (idx < 0) break;
      marks.push({ start: idx, end: idx + token.length, label: fragment.label, priority: fragment.priority });
      offset = idx + 1;
    }
  }

  const owner: Array<{ label: string | null; priority: number }> = Array.from(
    { length: seq.length },
    () => ({ label: null, priority: -1 }),
  );

  for (const mark of marks) {
    for (let i = mark.start; i < mark.end && i < seq.length; i += 1) {
      if (mark.priority >= owner[i].priority) {
        owner[i] = { label: mark.label, priority: mark.priority };
      }
    }
  }

  const segments: SequenceSegment[] = [];
  let currentLabel: string | null = owner[0]?.label ?? null;
  let currentText = "";

  for (let i = 0; i < seq.length; i += 1) {
    const label = owner[i]?.label ?? null;
    if (label !== currentLabel && currentText.length > 0) {
      segments.push({ text: currentText, label: currentLabel });
      currentText = "";
    }
    currentLabel = label;
    currentText += seq[i];
  }
  if (currentText.length > 0) segments.push({ text: currentText, label: currentLabel });

  return segments;
}

export function labelToClass(label: string | null): string {
  if (!label) return "text-slate-900";
  if (label.startsWith("cBox")) return "bg-teal-200 text-teal-950";
  if (label.startsWith("dBox")) return "bg-blue-200 text-blue-950";
  if (label === "target1") return "bg-green-200 text-green-950";
  if (label === "target2") return "bg-red-200 text-red-950";
  if (label === "leftPocket" || label === "rightPocket") return "bg-amber-200 text-amber-950";
  if (label === "osLeft" || label === "outerStemRight" || label === "innerStem") return "bg-purple-200 text-purple-950";
  return "bg-slate-200 text-slate-950";
}

export function labelToCategory(label: string): HighlightCategory | null {
  if (label.startsWith("cBox")) return "cBox";
  if (label.startsWith("dBox")) return "dBox";
  if (label === "target1") return "target1";
  if (label === "target2") return "target2";
  if (label === "leftPocket" || label === "rightPocket") return "hacaPocket";
  if (label === "osLeft" || label === "outerStemRight" || label === "innerStem") return "hacaStem";
  return null;
}
