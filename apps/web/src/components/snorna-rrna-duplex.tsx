"use client";

import { useState } from "react";

export type PairKind = "wc" | "wobble" | "mismatch" | "unpaired";

export type PairColumn = {
  snoBase: string | null;
  snoPosition: number | null;
  rrnaBase: string | null;
  rrnaPosition: number | null;
  pair: PairKind;
  isModification: boolean;
};

export type InteractionDuplex = {
  kind: "CD" | "HACA";
  guideLabel: string;
  snornaId: string;
  subunit: string;
  modificationPosition: number;
  modificationLabel: string;
  modType: string | null;
  anchor: "d-box" | "pocket" | "alignment";
  snoFivePrime: "left" | "right";
  columns: PairColumn[];
  upstream: PairColumn[] | null;
  downstream: PairColumn[] | null;
  loopLabel: string | null;
  note: string | null;
};

const PAIR_MARK: Record<PairKind, string> = {
  wc: "|",
  wobble: ":",
  mismatch: "·",
  unpaired: " ",
};

const ANCHOR_TEXT: Record<InteractionDuplex["anchor"], string> = {
  "d-box": "Anchored with the D-box register, 5 nt upstream of the D box.",
  pocket: "Pockets placed on either side of the modification.",
  alignment: "Placed by matching the guide to the rRNA around this coordinate.",
};

function columnDetail(column: PairColumn, duplex: InteractionDuplex): string {
  const rrna = `${duplex.subunit}:${column.rrnaPosition ?? "unknown"} (${column.rrnaBase ?? "unknown"})`;
  const modification = column.isModification
    ? duplex.modType?.toLowerCase() === "psi"
      ? " · pseudouridine"
      : " · 2′-O-methyl"
    : "";
  if (!column.snoBase) {
    return `Unpaired rRNA ${rrna}${modification}`;
  }
  const sno = `snoRNA${column.snoPosition ? ` nt ${column.snoPosition}` : ""} (${column.snoBase})`;
  const kind = {
    wc: "Watson–Crick pair",
    wobble: "G–U wobble",
    mismatch: "mismatch",
    unpaired: "unpaired",
  }[column.pair];
  return `${sno} pairs with ${rrna} · ${kind}${modification}`;
}

function baseClass(column: PairColumn): string {
  if (column.isModification) return "bg-amber-200 font-semibold text-slate-950";
  if (column.pair === "mismatch") return "text-rose-700";
  if (column.pair === "wobble") return "text-amber-700";
  return "text-slate-900";
}

function rrnaGlyph(column: PairColumn, duplex: InteractionDuplex): string {
  if (column.isModification && duplex.modType?.toLowerCase() === "psi") return "Ψ";
  return column.rrnaBase ?? "·";
}

function ColumnButton({
  column,
  duplex,
  active,
  onActivate,
}: {
  column: PairColumn;
  duplex: InteractionDuplex;
  active: boolean;
  onActivate: (detail: string) => void;
}) {
  const detail = columnDetail(column, duplex);
  return (
    <button
      type="button"
      className={`flex w-6 flex-col items-center rounded-sm leading-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-600 ${
        active ? "ring-1 ring-cyan-500" : ""
      } ${baseClass(column)}`}
      aria-label={detail}
      onMouseEnter={() => onActivate(detail)}
      onFocus={() => onActivate(detail)}
    >
      <span>{column.snoBase ?? "·"}</span>
      <span className="text-slate-500">{PAIR_MARK[column.pair]}</span>
      <span>{rrnaGlyph(column, duplex)}</span>
      <span className="h-3 text-[9px] leading-3 text-slate-500">{column.isModification ? column.rrnaPosition : ""}</span>
    </button>
  );
}

function strandEnds(duplex: InteractionDuplex) {
  const snoLeft = duplex.snoFivePrime === "left" ? "5′" : "3′";
  const snoRight = duplex.snoFivePrime === "left" ? "3′" : "5′";
  const rrnaLeft = duplex.snoFivePrime === "left" ? "3′" : "5′";
  const rrnaRight = duplex.snoFivePrime === "left" ? "5′" : "3′";
  return { snoLeft, snoRight, rrnaLeft, rrnaRight };
}

function EndCap({ sno, rrna }: { sno: string; rrna: string }) {
  return (
    <span className="flex flex-col items-center px-1 text-[10px] leading-5 text-slate-500">
      <span>{sno}</span>
      <span className="invisible">|</span>
      <span>{rrna}</span>
      <span className="h-3" />
    </span>
  );
}

export function SnornaRrnaDuplex({ duplex }: { duplex: InteractionDuplex }) {
  const [detail, setDetail] = useState("Hover or focus a base to see its pair.");
  const [active, setActive] = useState<string | null>(null);
  const ends = strandEnds(duplex);
  const modification = duplex.columns.find((column) => column.isModification) ?? null;
  const activate = (key: string, text: string) => {
    setActive(key);
    setDetail(text);
  };

  const tracks = duplex.kind === "HACA"
    ? (
      <>
        {(duplex.upstream ?? []).map((column, index) => (
          <ColumnButton
            key={`up-${index}`}
            column={column}
            duplex={duplex}
            active={active === `up-${index}`}
            onActivate={(text) => activate(`up-${index}`, text)}
          />
        ))}
        <span className="mx-1 flex w-10 flex-col items-center leading-5">
          <span className="text-[10px] text-slate-500">{duplex.loopLabel ? `(${duplex.loopLabel})` : ""}</span>
          <span className="text-slate-300">⌒</span>
          {modification ? (
            <button
              type="button"
              className={`rounded-sm px-1 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-600 ${baseClass(modification)} ${
                active === "mod" ? "ring-1 ring-cyan-500" : ""
              }`}
              aria-label={columnDetail(modification, duplex)}
              onMouseEnter={() => activate("mod", columnDetail(modification, duplex))}
              onFocus={() => activate("mod", columnDetail(modification, duplex))}
            >
              {rrnaGlyph(modification, duplex)}
            </button>
          ) : (
            <span>·</span>
          )}
          <span className="h-3 text-[9px] leading-3 text-slate-500">{duplex.modificationPosition}</span>
        </span>
        {(duplex.downstream ?? []).map((column, index) => (
          <ColumnButton
            key={`down-${index}`}
            column={column}
            duplex={duplex}
            active={active === `down-${index}`}
            onActivate={(text) => activate(`down-${index}`, text)}
          />
        ))}
      </>
    )
    : duplex.columns.map((column, index) => (
      <ColumnButton
        key={`col-${index}`}
        column={column}
        duplex={duplex}
        active={active === `col-${index}`}
        onActivate={(text) => activate(`col-${index}`, text)}
      />
    ));

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold">{duplex.snornaId} · {duplex.guideLabel}</h3>
        <p className="text-sm text-slate-600">{duplex.modificationLabel}</p>
      </div>
      <div className="overflow-x-auto rounded-xl bg-slate-50 p-3">
        <div className="flex w-max items-end font-mono text-sm">
          <EndCap sno={ends.snoLeft} rrna={ends.rrnaLeft} />
          {tracks}
          <EndCap sno={ends.snoRight} rrna={ends.rrnaRight} />
        </div>
        <p className="mt-2 text-[11px] text-slate-500">Top: snoRNA. Bottom: rRNA. The strands run in opposite directions.</p>
      </div>
      <p className="min-h-5 text-sm text-slate-700" aria-live="polite">{detail}</p>
      <p className="text-xs text-slate-500">{ANCHOR_TEXT[duplex.anchor]}</p>
      {duplex.note ? <p className="text-sm text-amber-800">{duplex.note}</p> : null}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        <li><span className="font-mono">|</span> Watson–Crick</li>
        <li><span className="font-mono text-amber-700">:</span> G–U wobble</li>
        <li><span className="font-mono text-rose-700">·</span> mismatch</li>
        <li><span className="rounded bg-amber-200 px-1">N</span> modified nucleotide</li>
      </ul>
    </div>
  );
}
