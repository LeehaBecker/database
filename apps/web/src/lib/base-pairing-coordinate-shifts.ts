export type CoordinateShiftDirection = "upstream" | "downstream";

export type CoordinateShift = {
  direction: CoordinateShiftDirection;
  nucleotides: number;
};

/** One shift on every base-pairing image, or a shift for picture 1 and/or picture 2. */
type CoordinateShiftEntry = CoordinateShift | { pictures: Partial<Record<1 | 2, CoordinateShift>> };

const all = (nucleotides: number, direction: CoordinateShiftDirection): CoordinateShift => ({ nucleotides, direction });

const pictures = (first?: CoordinateShift, second?: CoordinateShift): CoordinateShiftEntry => ({
  pictures: {
    ...(first ? { 1: first } : {}),
    ...(second ? { 2: second } : {}),
  },
});

export const basePairingCoordinateShifts: Record<string, CoordinateShiftEntry> = {
  TB5Cs1C1: all(62, "downstream"),
  TB6Cs1C1: all(62, "downstream"),
  TB6Cs1C2: pictures(all(58, "downstream"), all(62, "downstream")),
  TB6Cs1C3: all(63, "downstream"),
  TB8Cs1C1: pictures(undefined, all(164, "upstream")),
  TB8Cs1C3: pictures(all(66, "downstream"), all(164, "upstream")),
  TB9Cs1C1: all(60, "downstream"),
  TB9Cs2C1: all(62, "downstream"),
  TB9Cs2C2: pictures(all(182, "upstream"), all(164, "downstream")),
  TB9Cs2C3: pictures(all(163, "upstream"), all(164, "upstream")),
  TB9Cs2C5: all(110, "upstream"),
  TB9Cs2C7: all(63, "downstream"),
  TB9Cs4C1: all(164, "upstream"),
  TB9Cs4C3: all(58, "downstream"),
  TB9Cs5C1: all(164, "upstream"),
  TB9Cs5C2: all(164, "upstream"),
  TB10Cs1C1: all(63, "downstream"),
  TB10Cs1C4: all(63, "downstream"),
  TB10Cs2C2: all(164, "upstream"),
  TB10Cs3C1: all(62, "downstream"),
  TB10Cs3C2: all(166, "upstream"),
  TB10Cs3C4: all(164, "upstream"),
  TB10Cs3C5: all(63, "downstream"),
  TB10Cs4C5: all(164, "upstream"),
  TB11Cs1C2: pictures(all(62, "downstream"), all(64, "downstream")),
  TB11Cs1C3: all(164, "upstream"),
  TB11Cs2C1: all(62, "downstream"),
  TB11Cs3C1: all(63, "upstream"),
  TB11Cs4C1: all(62, "downstream"),
  TB11Cs4C2: all(164, "upstream"),
  TB11Cs4C3: all(61, "downstream"),
};

export function coordinateShiftForImage(snornaId: string, imageIndex: number): CoordinateShift | null {
  const entry = basePairingCoordinateShifts[snornaId];
  if (!entry) return null;
  if ("pictures" in entry) {
    const picture = (imageIndex + 1) as 1 | 2;
    return entry.pictures[picture] ?? null;
  }
  return entry;
}

export function coordinateShiftNote(shift: CoordinateShift): string {
  const unit = shift.nucleotides === 1 ? "nucleotide" : "nucleotides";
  return `There is a ${shift.nucleotides}-${unit} ${shift.direction} shift in the modification site coordinates.`;
}
