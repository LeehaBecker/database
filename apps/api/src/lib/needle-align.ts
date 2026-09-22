/**
 * Needleman–Wunsch global alignment matching EMBOSS needle nucleotide defaults:
 * EDNAFULL (match +5, mismatch −4), gap open 10, gap extend 0.5, no end-gap penalties.
 */

const MATCH = 5;
const MISMATCH = -4;
const GAP_OPEN = 10;
const GAP_EXTEND = 0.5;
const GAP_FIRST = GAP_OPEN + GAP_EXTEND;
const NEG = Number.NEGATIVE_INFINITY;

const STATE_M = 0;
const STATE_X = 1;
const STATE_Y = 2;

export type NeedleAlignment = {
  identityPct: number;
  identities: number;
  alignmentLength: number;
  alignedA: string;
  alignedB: string;
};

export function normalizeRna(seq: string): string {
  return seq.replace(/\s+/g, "").toUpperCase().replaceAll("T", "U");
}

function pairScore(a: string, b: string): number {
  return a === b ? MATCH : MISMATCH;
}

function emptyAlignment(a: string, b: string): NeedleAlignment {
  const alignedA = a.length ? a : "-".repeat(b.length);
  const alignedB = b.length ? b : "-".repeat(a.length);
  const alignmentLength = alignedA.length;
  return {
    identityPct: 0,
    identities: 0,
    alignmentLength,
    alignedA: alignedA || "",
    alignedB: alignedB || "",
  };
}

function takeBest(m: number, x: number, y: number): { score: number; state: number } {
  let score = m;
  let state = STATE_M;
  if (x > score) {
    score = x;
    state = STATE_X;
  }
  if (y > score) {
    score = y;
    state = STATE_Y;
  }
  return { score, state };
}

export function needleAlign(seqA: string, seqB: string): NeedleAlignment {
  const a = normalizeRna(seqA);
  const b = normalizeRna(seqB);
  const n = a.length;
  const m = b.length;

  if (!n || !m) return emptyAlignment(a, b);

  const M: number[][] = Array.from({ length: n + 1 }, () => Array<number>(m + 1).fill(NEG));
  const Ix: number[][] = Array.from({ length: n + 1 }, () => Array<number>(m + 1).fill(NEG));
  const Iy: number[][] = Array.from({ length: n + 1 }, () => Array<number>(m + 1).fill(NEG));
  const ptrM: number[][] = Array.from({ length: n + 1 }, () => Array<number>(m + 1).fill(STATE_M));
  const ptrX: number[][] = Array.from({ length: n + 1 }, () => Array<number>(m + 1).fill(STATE_M));
  const ptrY: number[][] = Array.from({ length: n + 1 }, () => Array<number>(m + 1).fill(STATE_M));

  M[0][0] = 0;
  Ix[0][0] = NEG;
  Iy[0][0] = NEG;

  for (let i = 1; i <= n; i += 1) {
    M[i][0] = NEG;
    Ix[i][0] = 0;
    Iy[i][0] = NEG;
    ptrX[i][0] = i === 1 ? STATE_M : STATE_X;
  }
  for (let j = 1; j <= m; j += 1) {
    M[0][j] = NEG;
    Ix[0][j] = NEG;
    Iy[0][j] = 0;
    ptrY[0][j] = j === 1 ? STATE_M : STATE_Y;
  }

  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const diag = takeBest(M[i - 1][j - 1], Ix[i - 1][j - 1], Iy[i - 1][j - 1]);
      M[i][j] = pairScore(a[i - 1]!, b[j - 1]!) + diag.score;
      ptrM[i][j] = diag.state;

      if (j === m) {
        const fromX = takeBest(M[i - 1][j], Ix[i - 1][j], Iy[i - 1][j]);
        Ix[i][j] = fromX.score;
        ptrX[i][j] = fromX.state;
      } else {
        const openX = M[i - 1][j] - GAP_FIRST;
        const extX = Ix[i - 1][j] - GAP_EXTEND;
        if (extX > openX) {
          Ix[i][j] = extX;
          ptrX[i][j] = STATE_X;
        } else {
          Ix[i][j] = openX;
          ptrX[i][j] = STATE_M;
        }
      }

      if (i === n) {
        const fromY = takeBest(M[i][j - 1], Ix[i][j - 1], Iy[i][j - 1]);
        Iy[i][j] = fromY.score;
        ptrY[i][j] = fromY.state;
      } else {
        const openY = M[i][j - 1] - GAP_FIRST;
        const extY = Iy[i][j - 1] - GAP_EXTEND;
        if (extY > openY) {
          Iy[i][j] = extY;
          ptrY[i][j] = STATE_Y;
        } else {
          Iy[i][j] = openY;
          ptrY[i][j] = STATE_M;
        }
      }
    }
  }

  const end = takeBest(M[n][m], Ix[n][m], Iy[n][m]);
  let i = n;
  let j = m;
  let state = end.state;
  const outA: string[] = [];
  const outB: string[] = [];

  while (i > 0 || j > 0) {
    if (i === 0) {
      outA.push("-");
      outB.push(b[j - 1]!);
      j -= 1;
      continue;
    }
    if (j === 0) {
      outA.push(a[i - 1]!);
      outB.push("-");
      i -= 1;
      continue;
    }

    if (state === STATE_M) {
      const prev = ptrM[i][j]!;
      outA.push(a[i - 1]!);
      outB.push(b[j - 1]!);
      i -= 1;
      j -= 1;
      state = prev;
    } else if (state === STATE_X) {
      const prev = ptrX[i][j]!;
      outA.push(a[i - 1]!);
      outB.push("-");
      i -= 1;
      state = prev;
    } else {
      const prev = ptrY[i][j]!;
      outA.push("-");
      outB.push(b[j - 1]!);
      j -= 1;
      state = prev;
    }
  }

  const alignedA = outA.reverse().join("");
  const alignedB = outB.reverse().join("");
  let identities = 0;
  for (let k = 0; k < alignedA.length; k += 1) {
    const left = alignedA[k];
    const right = alignedB[k];
    if (left && right && left !== "-" && left === right) identities += 1;
  }
  const alignmentLength = alignedA.length;
  return {
    identityPct: alignmentLength ? Math.round((identities / alignmentLength) * 100) : 0,
    identities,
    alignmentLength,
    alignedA,
    alignedB,
  };
}
