// Simply-supported beam solver.
//
// A numerical solver is used so that any combination of a full-span UDL plus a
// single point load is handled consistently. Shear and moment come from
// statics; deflection comes from double-integrating curvature (M/EI) with the
// two simple-support boundary conditions v(0) = v(L) = 0.
//
// Working units (SI, consistent):
//   length  m
//   load    kN (UDL kN/m, point load kN)
//   E       converted from GPa -> kN/m^2  (1 GPa = 1e6 kN/m^2)
//   I       converted from cm^4 -> m^4     (1 cm^4 = 1e-8 m^4)
// Results are reported in kN, kNm and mm.

export interface BeamInput {
  span: number;        // m
  udl: number;         // kN/m over full span
  pointLoad: number;   // kN
  pointPos: number;    // m from left support
  E: number;           // GPa
  I: number;           // cm^4
}

export interface BeamResult {
  reactionLeft: number;   // kN
  reactionRight: number;  // kN
  maxShear: number;       // kN (max absolute)
  maxMoment: number;      // kNm
  maxMomentPos: number;   // m from left
  maxDeflection: number;  // mm (downward positive)
  maxDeflectionPos: number; // m from left
  spanOverDefl: number | null; // L / deflection ratio (null if deflection ~0)
  samples: { x: number; shear: number; moment: number; defl: number }[]; // for charts
}

const N = 200; // discretisation steps

export function solveBeam(input: BeamInput): BeamResult {
  const { span: L, udl: w, pointLoad: P, E, I } = input;
  const a = Math.min(Math.max(input.pointPos, 0), L); // clamp position to beam

  // Reactions (downward loads positive, sum of moments about supports).
  const reactionLeft = (w * L) / 2 + (P * (L - a)) / L;
  const reactionRight = (w * L) / 2 + (P * a) / L;

  const dx = L / N;
  const xs: number[] = [];
  const shear: number[] = [];
  const moment: number[] = [];

  for (let i = 0; i <= N; i++) {
    const x = i * dx;
    xs.push(x);
    // Shear just to the right of x: left reaction minus load to the left.
    let V = reactionLeft - w * x;
    if (x > a) V -= P;
    shear.push(V);
    // Moment from statics about the cut.
    let M = reactionLeft * x - (w * x * x) / 2;
    if (x > a) M -= P * (x - a);
    moment.push(M);
  }

  // Curvature = M / (EI). Convert E (GPa) and I (cm^4) to SI.
  const EI = E * 1e6 * (I * 1e-8); // kN·m^2
  const curvature = moment.map((M) => (EI > 0 ? M / EI : 0));

  // Integrate curvature -> slope -> deflection (trapezoidal), then apply
  // boundary conditions v(0) = 0 and v(L) = 0 to recover the integration
  // constants. theta0 (slope at left) is the free constant.
  const slopeRel: number[] = [0]; // slope relative to theta0
  for (let i = 1; i <= N; i++) {
    slopeRel.push(
      slopeRel[i - 1] + ((curvature[i] + curvature[i - 1]) / 2) * dx,
    );
  }
  const deflRel: number[] = [0]; // deflection assuming theta0 = 0, v(0) = 0
  for (let i = 1; i <= N; i++) {
    deflRel.push(
      deflRel[i - 1] + ((slopeRel[i] + slopeRel[i - 1]) / 2) * dx,
    );
  }
  // v(x) = deflRel(x) + theta0 * x ; enforce v(L) = 0.
  const theta0 = L > 0 ? -deflRel[N] / L : 0;
  const defl = deflRel.map((d, i) => d + theta0 * xs[i]); // m, sagging negative

  // Find peaks.
  let maxMoment = 0, maxMomentPos = 0;
  for (let i = 0; i <= N; i++) {
    if (Math.abs(moment[i]) > Math.abs(maxMoment)) {
      maxMoment = moment[i];
      maxMomentPos = xs[i];
    }
  }
  let maxShear = 0;
  for (const V of shear) if (Math.abs(V) > Math.abs(maxShear)) maxShear = V;

  let maxDeflM = 0, maxDeflPos = 0;
  for (let i = 0; i <= N; i++) {
    if (Math.abs(defl[i]) > Math.abs(maxDeflM)) {
      maxDeflM = defl[i];
      maxDeflPos = xs[i];
    }
  }
  const maxDeflection = Math.abs(maxDeflM) * 1000; // mm, downward positive
  const spanOverDefl =
    maxDeflection > 1e-6 ? (L * 1000) / maxDeflection : null;

  // Down-sample for charts (every 4th point keeps it light).
  const samples = xs
    .map((x, i) => ({
      x,
      shear: shear[i],
      moment: moment[i],
      defl: -defl[i] * 1000, // mm, downward positive for display
    }))
    .filter((_, i) => i % 4 === 0 || i === N);

  return {
    reactionLeft,
    reactionRight,
    maxShear: Math.abs(maxShear),
    maxMoment: Math.abs(maxMoment),
    maxMomentPos,
    maxDeflection,
    maxDeflectionPos: maxDeflPos,
    spanOverDefl,
    samples,
  };
}

// Common UK steel sections (I in cm^4, for quick selection). Indicative.
export const STEEL_SECTIONS: { name: string; I: number }[] = [
  { name: "Timber C24 47×200", I: 3133 },
  { name: "203×133×25 UB", I: 2340 },
  { name: "254×146×31 UB", I: 4413 },
  { name: "305×165×40 UB", I: 8503 },
  { name: "356×171×51 UB", I: 14140 },
  { name: "406×178×60 UB", I: 21600 },
  { name: "457×191×74 UB", I: 33300 },
  { name: "533×210×92 UB", I: 55200 },
];
