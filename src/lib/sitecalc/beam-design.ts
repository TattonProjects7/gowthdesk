// Simplified steel beam design checks + auto-sizing (BS 5950 elastic/plastic
// approach). Indicative only — not a substitute for a chartered engineer.
//
// Method:
//   • Service moment Ms and shear Vs come from the beam solver (statics).
//   • ULS effects use an overall load factor γf (default ~1.5, a typical blend
//     of 1.4 dead + 1.6 imposed) on the applied loads.
//   • Moment capacity   Mc = py·Wpl, capped at 1.2·py·Wel (low-shear, Class 1/2).
//   • Shear capacity    Pv = 0.6·py·Av,  Av ≈ tw·D.
//   • Deflection checked under the (unfactored) applied service load.

import { Section } from "./sections";
import { solveBeam } from "./beam";

export interface DesignParams {
  span: number;       // m
  udl: number;        // kN/m (service)
  pointLoad: number;  // kN (service)
  pointPos: number;   // m
  E: number;          // GPa
  py: number;         // N/mm²
  gammaF: number;     // ULS load factor
  deflDenom: number;  // deflection limit denominator (span/denom)
}

export interface SectionCheck {
  section: Section;
  Med: number;     // ULS moment, kNm
  Mc: number;      // moment capacity, kNm
  bendUtil: number;
  Ved: number;     // ULS shear, kN
  Pv: number;      // shear capacity, kN
  shearUtil: number;
  defl: number;    // service deflection, mm
  deflLimit: number; // mm
  deflUtil: number;
  bendStress: number; // service bending stress σ = Ms/Wel, N/mm²
  pass: boolean;
  governs: "Bending" | "Shear" | "Deflection";
  governUtil: number;
}

export interface ServiceEffects {
  Ms: number; // kNm
  Vs: number; // kN
  reactionLeft: number;
  reactionRight: number;
}

export function serviceEffects(p: DesignParams): ServiceEffects {
  // Moment/shear are independent of I; use a nominal value.
  const r = solveBeam({
    span: p.span, udl: p.udl, pointLoad: p.pointLoad,
    pointPos: p.pointPos, E: p.E, I: 10000,
  });
  return {
    Ms: r.maxMoment,
    Vs: r.maxShear,
    reactionLeft: r.reactionLeft,
    reactionRight: r.reactionRight,
  };
}

export function checkSection(
  section: Section,
  p: DesignParams,
  s: ServiceEffects,
): SectionCheck {
  const Med = s.Ms * p.gammaF;
  const Ved = s.Vs * p.gammaF;

  // Mc = py·Wpl capped at 1.2·py·Wel.  py [N/mm²] × Wpl [cm³] / 1000 → kNm.
  const Mc = Math.min(p.py * section.Wpl, 1.2 * p.py * section.Wel) / 1000;
  // Pv = 0.6·py·tw·D  [N] → /1000 kN.
  const Pv = (0.6 * p.py * section.tw * section.D) / 1000;

  // Deflection under service loads with this section's Ix.
  const solved = solveBeam({
    span: p.span, udl: p.udl, pointLoad: p.pointLoad,
    pointPos: p.pointPos, E: p.E, I: section.Ix,
  });
  const defl = solved.maxDeflection;
  const deflLimit = (p.span * 1000) / p.deflDenom;

  const bendUtil = Mc > 0 ? Med / Mc : Infinity;
  const shearUtil = Pv > 0 ? Ved / Pv : Infinity;
  const deflUtil = deflLimit > 0 ? defl / deflLimit : Infinity;
  const bendStress = (s.Ms * 1000) / section.Wel; // kNm→Nmm /Wel mm³(×1000) = ×1000

  const utils: [SectionCheck["governs"], number][] = [
    ["Bending", bendUtil],
    ["Shear", shearUtil],
    ["Deflection", deflUtil],
  ];
  utils.sort((a, b) => b[1] - a[1]);

  return {
    section, Med, Mc, bendUtil, Ved, Pv, shearUtil,
    defl, deflLimit, deflUtil, bendStress,
    pass: bendUtil <= 1 && shearUtil <= 1 && deflUtil <= 1,
    governs: utils[0][0],
    governUtil: utils[0][1],
  };
}

/** Lightest passing section of the requested types, plus the next two up. */
export function autoSize(
  sections: Section[],
  p: DesignParams,
  s: ServiceEffects,
): { best: SectionCheck | null; alternatives: SectionCheck[] } {
  const checks = sections
    .map((sec) => checkSection(sec, p, s))
    .filter((c) => Number.isFinite(c.governUtil));
  const passing = checks
    .filter((c) => c.pass)
    .sort((a, b) => a.section.mass - b.section.mass);
  const best = passing[0] ?? null;
  // A couple of heavier passing options as alternatives.
  const alternatives = passing.slice(1, 3);
  return { best, alternatives };
}
