// Beam end-bearing / padstone check.
// Bearing stress = ULS end reaction / contact area; compared to an allowable
// bearing stress for the material the beam (or its padstone) sits on.
// Indicative — for masonry, confirm against BS 5628 / EC6 bearing provisions.

export interface BearingInput {
  reaction: number;  // kN, ULS end reaction
  width: number;     // mm, bearing width (often the beam flange width B)
  length: number;    // mm, bearing length along the support
  allow: number;     // N/mm², allowable bearing stress
}

export interface BearingResult {
  area: number;      // mm²
  stress: number;    // N/mm²
  util: number;
  reqLength: number; // mm, length needed at the given width to just pass
  pass: boolean;
}

export function checkBearing(i: BearingInput): BearingResult {
  const area = Math.max(i.width * i.length, 1);
  const stress = (i.reaction * 1000) / area; // kN→N over mm²
  const util = i.allow > 0 ? stress / i.allow : Infinity;
  const reqLength =
    i.allow > 0 && i.width > 0 ? (i.reaction * 1000) / (i.allow * i.width) : Infinity;
  return { area, stress, util, reqLength, pass: util <= 1 };
}

// Indicative allowable bearing stresses (N/mm²) for the support material.
export const BEARING_PRESETS = [
  { name: "Aircrete blockwork", stress: 0.9 },
  { name: "Medium-dense block", stress: 1.75 },
  { name: "Dense concrete block", stress: 3.5 },
  { name: "Brickwork (typical)", stress: 2.0 },
  { name: "C20 concrete padstone", stress: 8.0 },
  { name: "C30 concrete padstone", stress: 12.0 },
];

// Common off-the-shelf concrete padstone plan sizes (width × length, mm).
export const STANDARD_PADSTONES = [
  "100×100", "140×100", "215×100", "215×140", "215×215", "300×215", "440×215",
];
