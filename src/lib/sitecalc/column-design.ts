// Simplified axial column / post design (BS 5950 compression buckling via the
// Perry-Robertson formula). Indicative only — concentric axial load, no applied
// moments; combined axial + bending and connection design are not covered.

import { Section } from "./sections";

// Effective-length factors for standard end conditions (LE = k · L).
export const END_CONDITIONS = [
  { label: "Pinned – pinned (k = 1.0)", k: 1.0 },
  { label: "Fixed – pinned (k = 0.85)", k: 0.85 },
  { label: "Fixed – fixed (k = 0.7)", k: 0.7 },
  { label: "Fixed – free / cantilever (k = 2.0)", k: 2.0 },
];

// Robertson constant for the BS 5950 compression curves a/b/c/d.
export const STRUT_CURVES = [
  { label: "Curve a (a = 2.0)", a: 2.0 },
  { label: "Curve b (a = 3.5)", a: 3.5 },
  { label: "Curve c (a = 5.5) — typical H-section, minor axis", a: 5.5 },
  { label: "Curve d (a = 8.0)", a: 8.0 },
];

const E = 205000; // N/mm², BS 5950 value for structural steel

export interface ColumnParams {
  height: number; // m (actual length)
  axial: number;  // kN (applied compression)
  py: number;     // N/mm²
  k: number;      // effective length factor
  a: number;      // Robertson constant
}

export interface ColumnCheck {
  section: Section;
  slenderness: number; // λ = LE / ry
  pe: number;          // Euler strength, N/mm²
  pc: number;          // compressive strength, N/mm²
  Pc: number;          // compression resistance, kN
  util: number;
  pass: boolean;
}

/** Compressive strength pc from the Perry-Robertson formulation (BS 5950). */
export function compressiveStrength(lambda: number, py: number, a: number): number {
  if (lambda <= 0) return py;
  const pe = (Math.PI * Math.PI * E) / (lambda * lambda); // Euler stress
  const lambda0 = 0.2 * Math.sqrt((Math.PI * Math.PI * E) / py); // limiting slenderness
  const eta = Math.max(0, (a * (lambda - lambda0)) / 1000); // Perry factor
  const phi = (py + (eta + 1) * pe) / 2;
  const pc = (pe * py) / (phi + Math.sqrt(Math.max(phi * phi - pe * py, 0)));
  return Math.min(pc, py);
}

export function checkColumn(section: Section, p: ColumnParams): ColumnCheck {
  const LE = p.k * p.height * 1000; // mm
  const ry = section.ry * 10;       // cm → mm
  const slenderness = LE / ry;
  const pe = (Math.PI * Math.PI * E) / (slenderness * slenderness);
  const pc = compressiveStrength(slenderness, p.py, p.a);
  const Pc = (pc * section.A * 100) / 1000; // A cm²→mm² (×100), N→kN (/1000)
  const util = Pc > 0 ? p.axial / Pc : Infinity;
  return { section, slenderness, pe, pc, Pc, util, pass: util <= 1 };
}

export function autoSizeColumn(
  sections: Section[],
  p: ColumnParams,
): { best: ColumnCheck | null; alternatives: ColumnCheck[] } {
  const passing = sections
    .map((s) => checkColumn(s, p))
    .filter((c) => c.pass)
    .sort((a, b) => a.section.mass - b.section.mass);
  return { best: passing[0] ?? null, alternatives: passing.slice(1, 3) };
}
