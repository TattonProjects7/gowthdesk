// Simplified steel beam design checks + auto-sizing (BS 5950 elastic/plastic
// approach). Indicative only — not a substitute for a chartered engineer.
//
// Analysis now uses the general FE beam solver, so the same checks apply to
// simply-supported, cantilever, propped-cantilever and multi-span continuous
// beams. Effects (moment/shear/reactions) are taken at ULS via the load factor
// γf; deflection is checked under the unfactored applied loads.

import { Section } from "./sections";
import {
  analyzeBeam, configGeometry, BeamConfig, BeamModel, BeamReaction, BeamAnalysis,
} from "./beam-fe";

export interface DesignParams {
  config: BeamConfig;
  span: number;       // m, per-span length
  udl: number;        // kN/m (service)
  pointLoad: number;  // kN (service)
  pointPos: number;   // m from left end
  E: number;          // GPa
  py: number;         // N/mm²
  gammaF: number;     // ULS load factor
  deflDenom: number;  // deflection limit denominator (span/denom)
}

export interface SectionCheck {
  section: Section;
  Med: number; Mc: number; bendUtil: number;
  Ved: number; Pv: number; shearUtil: number;
  defl: number; deflLimit: number; deflUtil: number;
  bendStress: number;
  pass: boolean;
  governs: "Bending" | "Shear" | "Deflection";
  governUtil: number;
}

export interface ServiceEffects {
  Ms: number; // kNm
  Vs: number; // kN
  reactions: BeamReaction[];
}

// EI in kN·m² from E (GPa) and I (cm⁴):  E·1e6 · I·1e-8 = E·I·1e-2.
function eiOf(E: number, Icm4: number): number {
  return E * Icm4 * 1e-2;
}

export function modelFor(p: DesignParams, Icm4: number): BeamModel {
  const { length, supports } = configGeometry(p.config, p.span);
  const pointLoads =
    p.pointLoad > 0 ? [{ x: Math.min(Math.max(p.pointPos, 0), length), P: p.pointLoad }] : [];
  return { length, supports, udl: p.udl, pointLoads, EI: eiOf(p.E, Icm4) };
}

export function analysisFor(p: DesignParams, Icm4: number): BeamAnalysis {
  return analyzeBeam(modelFor(p, Icm4));
}

export function serviceEffects(p: DesignParams): ServiceEffects {
  // Moments/shears for a uniform-EI beam are independent of the EI magnitude
  // (continuous-beam distribution depends only on relative stiffness), so any
  // nominal I gives the correct effects here.
  const a = analysisFor(p, 10000);
  return { Ms: a.maxMoment, Vs: a.maxShear, reactions: a.reactions };
}

export function checkSection(section: Section, p: DesignParams, s: ServiceEffects): SectionCheck {
  const Med = s.Ms * p.gammaF;
  const Ved = s.Vs * p.gammaF;

  const Mc = Math.min(p.py * section.Wpl, 1.2 * p.py * section.Wel) / 1000;
  const Pv = (0.6 * p.py * section.tw * section.D) / 1000;

  const defl = analysisFor(p, section.Ix).maxDeflection;
  const deflLimit = (p.span * 1000) / p.deflDenom;

  const bendUtil = Mc > 0 ? Med / Mc : Infinity;
  const shearUtil = Pv > 0 ? Ved / Pv : Infinity;
  const deflUtil = deflLimit > 0 ? defl / deflLimit : Infinity;
  const bendStress = (s.Ms * 1000) / section.Wel;

  const utils: [SectionCheck["governs"], number][] = [
    ["Bending", bendUtil], ["Shear", shearUtil], ["Deflection", deflUtil],
  ];
  utils.sort((a, b) => b[1] - a[1]);

  return {
    section, Med, Mc, bendUtil, Ved, Pv, shearUtil,
    defl, deflLimit, deflUtil, bendStress,
    pass: bendUtil <= 1 && shearUtil <= 1 && deflUtil <= 1,
    governs: utils[0][0], governUtil: utils[0][1],
  };
}

export function autoSize(
  sections: Section[], p: DesignParams, s: ServiceEffects,
): { best: SectionCheck | null; alternatives: SectionCheck[] } {
  const checks = sections
    .map((sec) => checkSection(sec, p, s))
    .filter((c) => Number.isFinite(c.governUtil));
  const passing = checks.filter((c) => c.pass).sort((a, b) => a.section.mass - b.section.mass);
  return { best: passing[0] ?? null, alternatives: passing.slice(1, 3) };
}
