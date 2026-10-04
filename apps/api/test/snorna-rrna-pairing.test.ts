import assert from "node:assert/strict";
import test from "node:test";
import { buildSiteDuplexes, buildSubunitMap, toRna, type SiteInput, type TargetMotifs } from "../src/lib/snorna-rrna-pairing.ts";

const TB10CS1C1 = toRna(
  "GTGTATGATGAGAAACCTATTTTTATGTAACTCGGGAGAACTGAGCATATTACCTGATGAGTAAACAATCAATCGTTAGATAGTAGCACTGATGT",
);
const TARGET_1 = "GUAACUCGGGAGAA";
const TARGET_2 = "UUAGAUAGUAGCA";
const CD_TARGETS: TargetMotifs[] = [
  {
    targetSequence1: TARGET_1,
    targetSequence2: TARGET_2,
    dBox: "CUGA",
    dBox2: "CUGA",
    dBox3: null,
    leftPocket: null,
    rightPocket: null,
    innerStem: null,
  },
];

const TB10CS1H1 = toRna("TCATCCCCTTTAATAGCGAGTGGTCTTTGTGTGCATCTCCGCAAACCACTCGTCTACACCGGGGGAAAGATAA");
const LEFT_POCKET = "UA";
const RIGHT_POCKET = "CUACACC";
const INNER_STEM = toRna("ATAGCGAGTGGTCTTTGTGTGCATCTCCGCAAACCACTCGT");
const HACA_TARGETS: TargetMotifs[] = [
  {
    targetSequence1: null,
    targetSequence2: null,
    dBox: null,
    dBox2: null,
    dBox3: null,
    leftPocket: "TA",
    rightPocket: "CTACACC",
    innerStem: INNER_STEM,
  },
];

const COMPLEMENT: Record<string, string> = { A: "U", U: "A", G: "C", C: "G" };

function complementWindow(length: number, guide: string, position: number, registerOffset: number): string {
  const bases = Array.from({ length }, () => "A");
  for (let index = 0; index < guide.length; index++) {
    const rrnaPosition = position + (registerOffset - index);
    bases[rrnaPosition - 1] = COMPLEMENT[guide[index] ?? ""] ?? "A";
  }
  return bases.join("");
}

test("C/D guide uses the base five nucleotides upstream of the D box", () => {
  const registerOffset = TARGET_1.length - 5;
  const position = 538;
  const placed = complementWindow(800, TARGET_1, position, registerOffset).split("");
  const wobbleIndex = 7;
  const wobblePosition = position + (registerOffset - wobbleIndex);
  placed[wobblePosition - 1] = "U";

  const [result] = buildSiteDuplexes({
    snornaId: "TB10Cs1C1",
    type: "C/D",
    sequence: TB10CS1C1,
    targets: CD_TARGETS,
    sites: [{ subunit: "LSU3", position, modType: "Nm", bp: "C", rrnaSequence: placed.join("") }],
  });

  assert.ok(result);
  assert.equal(result.duplex?.guideLabel, "Target 1");
  assert.equal(result.duplex?.anchor, "d-box");
  assert.equal(result.duplex?.modificationLabel, "LSU3-Cm538");
  const modification = result.duplex?.columns.find((column) => column.isModification);
  assert.equal(modification?.snoBase, "G");
  assert.equal(modification?.rrnaBase, "C");
  assert.equal(modification?.rrnaPosition, 538);
  assert.equal(modification?.pair, "wc");
  assert.equal(result.duplex?.columns[0]?.rrnaPosition, position + registerOffset);
  assert.equal(result.duplex?.columns[wobbleIndex]?.pair, "wobble");
  assert.equal(TB10CS1C1.slice(TB10CS1C1.indexOf(TARGET_1) + TARGET_1.length, TB10CS1C1.indexOf(TARGET_1) + TARGET_1.length + 4), "CUGA");
});

test("two C/D guides are assigned to the sites they match", () => {
  const first = complementWindow(800, TARGET_1, 538, TARGET_1.length - 5);
  const secondGuideAt = TB10CS1C1.indexOf(TARGET_2);
  assert.ok(secondGuideAt >= 0);
  assert.equal(TB10CS1C1.slice(secondGuideAt + TARGET_2.length, secondGuideAt + TARGET_2.length + 4), "CUGA");
  const second = complementWindow(800, TARGET_2, 200, TARGET_2.length - 5);

  const results = buildSiteDuplexes({
    snornaId: "TB10Cs1C1",
    type: "C/D",
    sequence: TB10CS1C1,
    targets: CD_TARGETS,
    sites: [
      { subunit: "LSU3", position: 538, modType: "Nm", bp: "C", rrnaSequence: first },
      { subunit: "SSU", position: 200, modType: "Nm", bp: null, rrnaSequence: second },
    ],
  });

  assert.equal(results[0]?.duplex?.guideLabel, "Target 1");
  assert.equal(results[0]?.duplex?.modificationPosition, 538);
  assert.equal(results[1]?.duplex?.guideLabel, "Target 2");
  assert.equal(results[1]?.duplex?.columns.find((column) => column.isModification)?.rrnaPosition, 200);
  assert.ok(results[1]?.duplex?.columns.every((column) => !column.snoBase || column.pair === "wc" || column.isModification));
});

test("a short spacer still anchors the modification five nucleotides upstream of the D box", () => {
  const guide = "ACGUACGU";
  const sequence = `GGG${guide}UUCUGAAAA`;
  const registerIndex = sequence.indexOf("CUGA") - 5;
  const windowStart = sequence.indexOf(guide);
  const displayed = sequence.slice(Math.min(windowStart, registerIndex), sequence.indexOf("CUGA"));
  const registerOffset = registerIndex - Math.min(windowStart, registerIndex);
  const position = 40;
  const rrna = complementWindow(80, displayed, position, registerOffset);
  const [result] = buildSiteDuplexes({
    snornaId: "spacer",
    type: "C/D",
    sequence,
    targets: [{ ...CD_TARGETS[0], targetSequence1: guide, targetSequence2: null, dBox: "CUGA", dBox2: null }],
    sites: [{ subunit: "SSU", position, modType: "Nm", bp: null, rrnaSequence: rrna }],
  });
  const modification = result?.duplex?.columns.find((column) => column.isModification);
  assert.equal(result?.duplex?.anchor, "d-box");
  assert.equal(modification?.snoBase, sequence[registerIndex]);
  assert.equal(modification?.rrnaPosition, position);
  assert.equal(sequence.slice(registerIndex + 1, sequence.indexOf("CUGA")).length, 4);
});

test("missing targets and missing rRNA keep a note instead of a duplex", () => {
  const sites: SiteInput[] = [{ subunit: "LSU3", position: 10, modType: "Nm", bp: "A", rrnaSequence: "ACGUACGUACGUACGUACGU" }];
  const [noTarget] = buildSiteDuplexes({
    snornaId: "none",
    type: "C/D",
    sequence: "ACGUACGUACGUACGUACGU",
    targets: [],
    sites,
  });
  assert.equal(noTarget?.duplex, null);
  assert.match(noTarget?.note ?? "", /target sequence/i);

  const [noRrna] = buildSiteDuplexes({
    snornaId: "TB10Cs1C1",
    type: "C/D",
    sequence: TB10CS1C1,
    targets: CD_TARGETS,
    sites: [{ subunit: "LSU3", position: 538, modType: "Nm", bp: "C", rrnaSequence: null }],
  });
  assert.equal(noRrna?.duplex, null);
  assert.match(noRrna?.note ?? "", /rRNA subunit sequence/);
});

test("H/ACA pockets flank the pseudouridine and leave it unpaired", () => {
  const position = 659;
  const rrna = Array.from({ length: 900 }, () => "A");
  const upstream = "GGUGUAG";
  for (let index = 0; index < upstream.length; index++) rrna[position - upstream.length - 1 + index] = upstream[index] ?? "A";
  rrna[position - 1] = "U";
  rrna[position] = "U";
  rrna[position + 1] = "A";

  const [result] = buildSiteDuplexes({
    snornaId: "TB10Cs1H1",
    type: "H/ACA",
    sequence: TB10CS1H1,
    targets: HACA_TARGETS,
    sites: [{ subunit: "LSU3", position, modType: "Psi", bp: "U", rrnaSequence: rrna.join("") }],
  });

  assert.equal(result?.duplex?.kind, "HACA");
  assert.equal(result?.duplex?.anchor, "pocket");
  assert.equal(result?.duplex?.loopLabel, String(INNER_STEM.length));
  assert.equal(result?.duplex?.modificationLabel, "LSU3-Ψ659");
  assert.equal(result?.duplex?.upstream?.map((column) => column.rrnaBase).join(""), upstream);
  assert.equal(result?.duplex?.upstream?.map((column) => column.snoBase).join(""), [...RIGHT_POCKET].reverse().join(""));
  assert.equal(result?.duplex?.downstream?.map((column) => column.rrnaBase).join(""), "UA");
  assert.equal(result?.duplex?.downstream?.map((column) => column.snoBase).join(""), [...LEFT_POCKET].reverse().join(""));
  const modification = result?.duplex?.columns.find((column) => column.isModification);
  assert.equal(modification?.pair, "unpaired");
  assert.equal(modification?.snoBase, null);
  assert.equal(modification?.rrnaPosition, position);
  assert.equal(result?.duplex?.upstream?.[0]?.snoPosition, TB10CS1H1.indexOf(RIGHT_POCKET) + RIGHT_POCKET.length);
  assert.equal(result?.note, null);
});

test("subunit map groups guides by position and keeps only the requested subunit", () => {
  const ssu = complementWindow(800, TARGET_1, 538, TARGET_1.length - 5);
  const lsu = "ACGU".repeat(100);
  const site = (subunit: string, position: number, rrnaSequence: string): SiteInput => ({
    subunit,
    position,
    modType: "Nm",
    bp: null,
    rrnaSequence,
  });

  const map = buildSubunitMap(
    [
      {
        snornaId: "first",
        type: "C/D",
        sequence: TB10CS1C1,
        targets: CD_TARGETS,
        sites: [site("SSU", 538, ssu), site("LSU1", 20, lsu)],
      },
      {
        snornaId: "second",
        type: "C/D",
        sequence: TB10CS1C1,
        targets: CD_TARGETS,
        sites: [site("SSU", 538, ssu), site("SSU", 120, ssu)],
      },
      {
        snornaId: "other-subunit",
        type: "C/D",
        sequence: TB10CS1C1,
        targets: CD_TARGETS,
        sites: [site("LSU1", 30, lsu)],
      },
    ],
    "SSU",
    ssu,
  );

  assert.deepEqual(map.map((entry) => entry.position), [120, 538]);
  assert.deepEqual(map[1]?.guides.map((guide) => guide.snornaId), ["first", "second"]);
  assert.equal(map[1]?.base, ssu[537]);
  assert.equal(map[1]?.modType, "Nm");
  assert.equal(map[1]?.guides[0]?.duplex?.columns.find((column) => column.isModification)?.rrnaPosition, 538);
  assert.deepEqual(map[0]?.guides.map((guide) => guide.snornaId), ["second"]);
  assert.ok(map.every((entry) => entry.guides.every((guide) => guide.snornaId !== "other-subunit")));
});
