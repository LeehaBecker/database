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

export type TargetMotifs = {
  targetSequence1: string | null;
  targetSequence2: string | null;
  dBox: string | null;
  dBox2: string | null;
  dBox3: string | null;
  leftPocket: string | null;
  rightPocket: string | null;
  innerStem: string | null;
};

export type SiteInput = {
  subunit: string;
  position: number;
  modType: string | null;
  bp: string | null;
  rrnaSequence: string | null;
};

export type PairingInput = {
  snornaId: string;
  type: string;
  sequence: string;
  targets: TargetMotifs[];
  sites: SiteInput[];
};

export type SiteDuplexResult = {
  subunit: string;
  position: number;
  modType: string | null;
  bp: string | null;
  duplex: InteractionDuplex | null;
  note: string | null;
};

export type SubunitMapGuide = {
  snornaId: string;
  type: string;
  modType: string | null;
  duplex: InteractionDuplex | null;
  note: string | null;
};

export type SubunitMapSite = {
  position: number;
  base: string | null;
  modType: string | null;
  guides: SubunitMapGuide[];
};

const MAX_D_BOX_GAP = 5;
const HACA_WINDOW = 25;
const LOW_CONFIDENCE = 0.5;

const COMPLEMENT: Record<string, string> = { A: "U", U: "A", G: "C", C: "G" };

export function toRna(value: string | null | undefined): string {
  return (value ?? "")
    .toUpperCase()
    .replace(/T/g, "U")
    .replace(/[^ACGU]/g, "");
}

export function pairKind(snoBase: string, rrnaBase: string): PairKind {
  if (COMPLEMENT[snoBase] === rrnaBase) return "wc";
  if ((snoBase === "G" && rrnaBase === "U") || (snoBase === "U" && rrnaBase === "G")) return "wobble";
  return "mismatch";
}

type CdGuide = {
  label: string;
  bases: string;
  windowStart: number | null;
  registerOffset: number | null;
  anchor: "d-box" | "alignment";
};

type Hairpin = {
  left: string;
  right: string;
  innerLength: number | null;
  leftStart: number;
  rightStart: number;
};

export function buildSiteDuplexes(input: PairingInput): SiteDuplexResult[] {
  const sequence = toRna(input.sequence);
  const strategy = chooseStrategy(input.type, input.targets);
  const blockers = new Map<number, string>();

  input.sites.forEach((site, index) => {
    const reason = siteBlocker(site);
    if (reason) blockers.set(index, reason);
  });

  if (strategy === "HACA") {
    return assignHairpins(input, sequence, blockers);
  }
  return assignCdGuides(input, sequence, blockers);
}

export function buildSubunitMap(snornas: PairingInput[], subunit: string, rrnaSequence: string | null): SubunitMapSite[] {
  const rrna = toRna(rrnaSequence);
  const byPosition = new Map<number, SubunitMapSite>();

  for (const snorna of snornas) {
    if (!snorna.sites.some((site) => site.subunit === subunit)) continue;
    const results = buildSiteDuplexes(snorna);
    for (const result of results) {
      if (result.subunit !== subunit) continue;
      let site = byPosition.get(result.position);
      if (!site) {
        site = {
          position: result.position,
          base: baseAt(rrna, result.position) ?? (toRna(result.bp) || null),
          modType: result.modType,
          guides: [],
        };
        byPosition.set(result.position, site);
      }
      if (!site.modType && result.modType) site.modType = result.modType;
      if (site.guides.some((guide) => guide.snornaId === snorna.snornaId)) continue;
      site.guides.push({
        snornaId: snorna.snornaId,
        type: snorna.type,
        modType: result.modType,
        duplex: result.duplex,
        note: result.note,
      });
    }
  }

  return [...byPosition.values()].sort((a, b) => a.position - b.position);
}

function chooseStrategy(type: string, targets: TargetMotifs[]): "HACA" | "CD" {
  const normalized = type.toUpperCase();
  const haca = normalized.includes("H/ACA") || normalized.includes("HACA");
  const hasPockets = targets.some((target) => toRna(target.leftPocket) || toRna(target.rightPocket));
  const hasTargets = targets.some((target) => toRna(target.targetSequence1) || toRna(target.targetSequence2));
  if (haca && (hasPockets || !hasTargets)) return "HACA";
  return "CD";
}

function siteBlocker(site: SiteInput): string | null {
  const rrna = toRna(site.rrnaSequence);
  if (!rrna) return "rRNA subunit sequence is not available, so the duplex cannot be placed.";
  if (!Number.isInteger(site.position) || site.position < 1 || site.position > rrna.length) {
    return "Modification coordinate is outside the rRNA subunit sequence.";
  }
  return null;
}

function assignCdGuides(input: PairingInput, sequence: string, blockers: Map<number, string>): SiteDuplexResult[] {
  const guides = collectCdGuides(sequence, input.targets);
  const missing = "No target sequence is available for this snoRNA.";
  return assignBest(
    input,
    blockers,
    guides.length ? null : missing,
    guides.map((guide, guideIndex) => ({ guideIndex, guide })),
    (guide, site) => renderCd(input.snornaId, guide, site),
  );
}

function assignHairpins(input: PairingInput, sequence: string, blockers: Map<number, string>): SiteDuplexResult[] {
  const hairpins = collectHairpins(sequence, input.targets);
  const missing = "No H/ACA pocket sequences are available for this snoRNA.";
  return assignBest(
    input,
    blockers,
    hairpins.length ? null : missing,
    hairpins.map((hairpin, guideIndex) => ({ guideIndex, guide: hairpin })),
    (hairpin, site) => renderHaca(input.snornaId, hairpin, site),
  );
}

function assignBest<T>(
  input: PairingInput,
  blockers: Map<number, string>,
  missingGuideNote: string | null,
  guides: Array<{ guideIndex: number; guide: T }>,
  render: (guide: T, site: SiteInput) => { duplex: InteractionDuplex; score: number },
): SiteDuplexResult[] {
  const assigned = new Map<number, InteractionDuplex>();

  if (!missingGuideNote && guides.length) {
    const candidates: Array<{ siteIndex: number; guideIndex: number; score: number; duplex: InteractionDuplex }> = [];
    input.sites.forEach((site, siteIndex) => {
      if (blockers.has(siteIndex)) return;
      for (const guide of guides) {
        const rendered = render(guide.guide, site);
        candidates.push({ siteIndex, guideIndex: guide.guideIndex, score: rendered.score, duplex: rendered.duplex });
      }
    });
    candidates.sort((a, b) => b.score - a.score || a.siteIndex - b.siteIndex || a.guideIndex - b.guideIndex);
    const usedSites = new Set<number>();
    const usedGuides = new Set<number>();
    for (const candidate of candidates) {
      if (usedSites.has(candidate.siteIndex) || usedGuides.has(candidate.guideIndex)) continue;
      usedSites.add(candidate.siteIndex);
      usedGuides.add(candidate.guideIndex);
      assigned.set(candidate.siteIndex, candidate.duplex);
    }
  }

  return input.sites.map((site, index) => ({
    subunit: site.subunit,
    position: site.position,
    modType: site.modType,
    bp: site.bp,
    duplex: assigned.get(index) ?? null,
    note: blockers.get(index) ?? (assigned.has(index) ? null : missingGuideNote ?? "No guide sequence matched this modification."),
  }));
}

function collectCdGuides(sequence: string, targets: TargetMotifs[]): CdGuide[] {
  const motifs = dBoxMotifs(targets);
  const boxStarts = motifs.flatMap((motif) => findMotifStarts(sequence, motif));
  const usedBoxes = new Set<number>();
  const hits = [
    ...targetHits(sequence, "Target 1", targets.map((target) => target.targetSequence1)),
    ...targetHits(sequence, "Target 2", targets.map((target) => target.targetSequence2)),
  ];

  const links: Array<{ hitIndex: number; boxStart: number; gap: number }> = [];
  hits.forEach((hit, hitIndex) => {
    const targetEnd = hit.start + hit.bases.length;
    for (const boxStart of boxStarts) {
      const gap = boxStart - targetEnd;
      if (gap < 0 || gap > MAX_D_BOX_GAP || boxStart < 5) continue;
      links.push({ hitIndex, boxStart, gap });
    }
  });
  links.sort((a, b) => a.gap - b.gap || a.hitIndex - b.hitIndex);

  const usedHits = new Set<number>();
  const anchored = new Map<number, number>();
  for (const link of links) {
    if (usedHits.has(link.hitIndex) || usedBoxes.has(link.boxStart)) continue;
    usedHits.add(link.hitIndex);
    usedBoxes.add(link.boxStart);
    anchored.set(link.hitIndex, link.boxStart);
  }

  const guides: CdGuide[] = [];
  const seen = new Set<string>();
  hits.forEach((hit, hitIndex) => {
    const boxStart = anchored.get(hitIndex);
    if (boxStart == null) return;
    const key = `${hit.label}:${hit.start}`;
    if (seen.has(key)) return;
    seen.add(key);
    const registerIndex = boxStart - 5;
    const windowStart = Math.min(hit.start, registerIndex);
    const bases = sequence.slice(windowStart, boxStart);
    guides.push({
      label: hit.label,
      bases,
      windowStart,
      registerOffset: registerIndex - windowStart,
      anchor: "d-box",
    });
  });
  hits.forEach((hit) => {
    if (guides.some((guide) => guide.label === hit.label)) return;
    guides.push({ label: hit.label, bases: hit.bases, windowStart: hit.start, registerOffset: null, anchor: "alignment" });
  });

  for (const [label, raws] of [
    ["Target 1", targets.map((target) => target.targetSequence1)],
    ["Target 2", targets.map((target) => target.targetSequence2)],
  ] as const) {
    if (guides.some((guide) => guide.label === label)) continue;
    const bases = raws.map((raw) => toRna(raw)).find((value) => value.length >= 5);
    if (!bases) continue;
    guides.push({ label, bases, windowStart: null, registerOffset: null, anchor: "alignment" });
  }

  return guides;
}

function targetHits(sequence: string, label: string, raws: Array<string | null>): Array<{ label: string; start: number; bases: string }> {
  const hits: Array<{ label: string; start: number; bases: string }> = [];
  const seen = new Set<string>();
  for (const raw of raws) {
    const bases = toRna(raw);
    if (bases.length < 5 || seen.has(bases)) continue;
    seen.add(bases);
    for (const start of findMotifStarts(sequence, bases)) {
      hits.push({ label, start, bases });
    }
  }
  return hits;
}

function dBoxMotifs(targets: TargetMotifs[]): string[] {
  const motifs = new Set<string>();
  for (const target of targets) {
    for (const raw of [target.dBox, target.dBox2, target.dBox3]) {
      const motif = toRna(raw);
      if (motif.length >= 3) motifs.add(motif);
    }
  }
  return [...motifs];
}

function findMotifStarts(sequence: string, motif: string): number[] {
  if (!motif) return [];
  const starts: number[] = [];
  let from = 0;
  while (from <= sequence.length - motif.length) {
    const at = sequence.indexOf(motif, from);
    if (at < 0) break;
    starts.push(at);
    from = at + 1;
  }
  return starts;
}

function renderCd(snornaId: string, guide: CdGuide, site: SiteInput): { duplex: InteractionDuplex; score: number } {
  const placed = guide.registerOffset == null ? placeByAlignment(guide, site) : guide;
  const rrna = toRna(site.rrnaSequence);
  const columns: PairColumn[] = [...placed.bases].map((snoBase, index) => {
    const register = placed.registerOffset ?? 0;
    const rrnaPosition = site.position + (register - index);
    const rrnaBase = baseAt(rrna, rrnaPosition);
    return {
      snoBase,
      snoPosition: placed.windowStart == null ? null : placed.windowStart + index + 1,
      rrnaBase,
      rrnaPosition,
      pair: rrnaBase ? pairKind(snoBase, rrnaBase) : "unpaired",
      isModification: index === register,
    };
  });
  return finishDuplex(snornaId, site, {
    kind: "CD",
    guideLabel: placed.label,
    anchor: placed.anchor,
    snoFivePrime: "left",
    columns,
    upstream: null,
    downstream: null,
    loopLabel: null,
  });
}

function placeByAlignment(guide: CdGuide, site: SiteInput): CdGuide {
  const rrna = toRna(site.rrnaSequence);
  let bestOffset = Math.max(guide.bases.length - 5, 0);
  let bestScore = Number.NEGATIVE_INFINITY;
  const canonical = Math.max(guide.bases.length - 5, 0);
  for (let offset = 0; offset < guide.bases.length; offset++) {
    const score = scoreOffset(guide.bases, offset, site.position, rrna);
    const canonicalBias = Math.abs(offset - canonical);
    const bestBias = Math.abs(bestOffset - canonical);
    if (score > bestScore || (score === bestScore && canonicalBias < bestBias)) {
      bestScore = score;
      bestOffset = offset;
    }
  }
  return { ...guide, registerOffset: bestOffset, anchor: "alignment" };
}

function scoreOffset(bases: string, registerOffset: number, position: number, rrna: string): number {
  let score = 0;
  for (let index = 0; index < bases.length; index++) {
    const rrnaBase = baseAt(rrna, position + (registerOffset - index));
    if (!rrnaBase) continue;
    const kind = pairKind(bases[index] ?? "", rrnaBase);
    if (kind === "wc") score += 2;
    else if (kind === "wobble") score += 1;
    else score -= 1;
    if (index === registerOffset && (kind === "wc" || kind === "wobble")) score += 10;
  }
  return score;
}

function collectHairpins(sequence: string, targets: TargetMotifs[]): Hairpin[] {
  const hairpins: Hairpin[] = [];
  const seen = new Set<string>();
  for (const target of targets) {
    const left = toRna(target.leftPocket);
    const right = toRna(target.rightPocket);
    if (!left && !right) continue;
    const key = `${left}|${right}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const inner = toRna(target.innerStem);
    const innerAt = inner ? sequence.indexOf(inner) : -1;
    hairpins.push({
      left,
      right,
      innerLength: inner ? inner.length : null,
      leftStart: locatePocket(sequence, left, innerAt, inner.length, "left"),
      rightStart: locatePocket(sequence, right, innerAt, inner.length, "right"),
    });
  }
  return hairpins;
}

function locatePocket(sequence: string, pocket: string, innerAt: number, innerLength: number, side: "left" | "right"): number {
  if (!pocket) return -1;
  const hits = findMotifStarts(sequence, pocket);
  if (!hits.length) return -1;
  if (innerAt >= 0) {
    if (side === "left") {
      const preferred = hits.filter((start) => start + pocket.length <= innerAt && innerAt - (start + pocket.length) <= 3);
      if (preferred.length) return preferred[preferred.length - 1] ?? -1;
    } else {
      const stemEnd = innerAt + innerLength;
      const preferred = hits.filter((start) => start >= stemEnd && start - stemEnd <= 3);
      if (preferred.length) return preferred[0] ?? -1;
    }
  }
  return hits[0] ?? -1;
}

function renderHaca(snornaId: string, hairpin: Hairpin, site: SiteInput): { duplex: InteractionDuplex; score: number } {
  const rrna = toRna(site.rrnaSequence);
  const upstream = placePocket(hairpin.right, hairpin.rightStart, rrna, site.position, "upstream");
  const downstream = placePocket(hairpin.left, hairpin.leftStart, rrna, site.position, "downstream");
  const modification = modificationColumn(rrna, site.position);
  const columns = [...(upstream ?? []), modification, ...(downstream ?? [])];
  return finishDuplex(snornaId, site, {
    kind: "HACA",
    guideLabel: "Pockets",
    anchor: "pocket",
    snoFivePrime: "right",
    columns,
    upstream,
    downstream,
    loopLabel: hairpin.innerLength == null ? null : String(hairpin.innerLength),
  });
}

function placePocket(
  pocket: string,
  pocketStart: number,
  rrna: string,
  position: number,
  side: "upstream" | "downstream",
): PairColumn[] | null {
  if (!pocket) return null;
  let best: { score: number; distance: number; columns: PairColumn[] } | null = null;
  if (side === "upstream") {
    for (let endPos = position - 1; endPos >= Math.max(pocket.length, position - HACA_WINDOW); endPos--) {
      const columns = pocketColumns(pocket, pocketStart, rrna, endPos, "upstream");
      const score = columnScore(columns);
      const distance = position - 1 - endPos;
      if (!best || score > best.score || (score === best.score && distance < best.distance)) {
        best = { score, distance, columns };
      }
    }
  } else {
    const lastStart = Math.min(rrna.length - pocket.length + 1, position + HACA_WINDOW);
    for (let startPos = position + 1; startPos <= lastStart; startPos++) {
      const columns = pocketColumns(pocket, pocketStart, rrna, startPos, "downstream");
      const score = columnScore(columns);
      const distance = startPos - (position + 1);
      if (!best || score > best.score || (score === best.score && distance < best.distance)) {
        best = { score, distance, columns };
      }
    }
  }
  return best?.columns ?? null;
}

function pocketColumns(
  pocket: string,
  pocketStart: number,
  rrna: string,
  anchorPosition: number,
  side: "upstream" | "downstream",
): PairColumn[] {
  const length = pocket.length;
  const columns: PairColumn[] = [];
  for (let step = 0; step < length; step++) {
    const pocketIndex = length - 1 - step;
    const rrnaPosition = side === "upstream" ? anchorPosition - pocketIndex : anchorPosition + step;
    const snoBase = pocket[pocketIndex] ?? "";
    const rrnaBase = baseAt(rrna, rrnaPosition);
    columns.push({
      snoBase,
      snoPosition: pocketStart >= 0 ? pocketStart + pocketIndex + 1 : null,
      rrnaBase,
      rrnaPosition,
      pair: rrnaBase ? pairKind(snoBase, rrnaBase) : "unpaired",
      isModification: false,
    });
  }
  return columns;
}

function modificationColumn(rrna: string, position: number): PairColumn {
  return {
    snoBase: null,
    snoPosition: null,
    rrnaBase: baseAt(rrna, position),
    rrnaPosition: position,
    pair: "unpaired",
    isModification: true,
  };
}

function finishDuplex(
  snornaId: string,
  site: SiteInput,
  partial: Omit<InteractionDuplex, "snornaId" | "subunit" | "modificationPosition" | "modificationLabel" | "modType" | "note">,
): { duplex: InteractionDuplex; score: number } {
  const paired = partial.columns.filter((column) => column.snoBase && column.rrnaBase);
  const supportive = paired.filter((column) => column.pair === "wc" || column.pair === "wobble").length;
  const ratio = paired.length ? supportive / paired.length : 0;
  const note = paired.length && ratio < LOW_CONFIDENCE
    ? "Low-confidence placement: the guide does not match this rRNA window well."
    : null;
  const rrnaBase = partial.columns.find((column) => column.isModification)?.rrnaBase ?? toRna(site.bp);
  return {
    score: columnScore(partial.columns),
    duplex: {
      ...partial,
      snornaId,
      subunit: site.subunit,
      modificationPosition: site.position,
      modificationLabel: modificationLabel(site.subunit, site.modType, rrnaBase, site.position),
      modType: site.modType,
      note,
    },
  };
}

function columnScore(columns: PairColumn[]): number {
  let score = 0;
  for (const column of columns) {
    if (!column.snoBase || !column.rrnaBase) continue;
    if (column.pair === "wc") score += 2;
    else if (column.pair === "wobble") score += 1;
    else score -= 1;
    if (column.isModification && (column.pair === "wc" || column.pair === "wobble")) score += 10;
  }
  return score;
}

function modificationLabel(subunit: string, modType: string | null, base: string, position: number): string {
  const normalized = (modType ?? "").toLowerCase();
  if (normalized === "nm") {
    const letter = toRna(base);
    return `${subunit}-${letter ? `${letter}m` : "Nm"}${position}`;
  }
  if (normalized === "psi") return `${subunit}-Ψ${position}`;
  return `${subunit}-${modType ?? "mod"}${position}`;
}

function baseAt(sequence: string, position: number): string | null {
  if (position < 1 || position > sequence.length) return null;
  return sequence[position - 1] ?? null;
}
