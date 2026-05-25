"use client";

import { useMemo, useState } from "react";
import {
  buildSequenceSegments,
  labelToCategory,
  labelToClass,
  type HighlightCategory,
  type HighlightFragment,
} from "@/lib/sequence-highlights";

const CATEGORY_META: Array<{ key: HighlightCategory; label: string; dotClass: string }> = [
  { key: "cBox", label: "C box", dotClass: "bg-teal-500" },
  { key: "dBox", label: "D box", dotClass: "bg-blue-500" },
  { key: "target1", label: "Target 1", dotClass: "bg-green-500" },
  { key: "target2", label: "Target 2", dotClass: "bg-red-500" },
  { key: "hacaPocket", label: "H/ACA pockets", dotClass: "bg-amber-400" },
  { key: "hacaStem", label: "H/ACA stems", dotClass: "bg-purple-400" },
];

type Props = {
  sequence: string;
  fragments: HighlightFragment[];
};

export function SnornaSequenceViewer({ sequence, fragments }: Props) {
  const [enabled, setEnabled] = useState<Record<HighlightCategory, boolean>>({
    cBox: true,
    dBox: true,
    target1: true,
    target2: true,
    hacaPocket: true,
    hacaStem: true,
  });

  const activeFragments = useMemo(
    () =>
      fragments.filter((fragment) => {
        const category = labelToCategory(fragment.label);
        return category ? enabled[category] : true;
      }),
    [fragments, enabled],
  );

  const segments = useMemo(
    () => buildSequenceSegments(sequence, activeFragments),
    [sequence, activeFragments],
  );

  const toggle = (key: HighlightCategory) => {
    setEnabled((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        {CATEGORY_META.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => toggle(item.key)}
            className={`inline-flex items-center gap-1 rounded border px-2 py-1 ${
              enabled[item.key] ? "bg-white" : "bg-slate-100 text-slate-400"
            }`}
          >
            <i className={`h-3 w-3 inline-block ${item.dotClass}`} />
            {item.label}
          </button>
        ))}
      </div>
      <div className="rounded bg-slate-100 p-3 text-xs overflow-auto font-mono leading-6 break-all">
        {segments.map((segment, index) => (
          <span key={`${segment.label}-${index}`} className={`${labelToClass(segment.label)} px-[1px]`}>
            {segment.text}
          </span>
        ))}
      </div>
    </div>
  );
}
