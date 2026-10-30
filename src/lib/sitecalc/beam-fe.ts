// General 1-D Euler-Bernoulli beam solver (finite-element, 2 DOF/node: vertical
// translation + rotation). Handles any arrangement of pinned/fixed supports, so
// it covers simply-supported, cantilever, propped-cantilever and multi-span
// continuous beams. A full-span UDL and any number of point loads are supported.
//
// Strategy: solve the FE system for nodal displacements and the support
// reactions (correct even when statically indeterminate, e.g. continuous spans),
// then derive shear and moment by statics marching from the left (exact), and
// deflection by Hermite interpolation of the FE solution.
//
// Units (consistent): length m, load kN & kN/m, EI kN·m², displacement m.

export type Fixity = "pinned" | "fixed";

export interface Support {
  x: number;      // position along the beam, m
  fixity: Fixity; // pinned restrains translation; fixed restrains translation + rotation
}

export interface BeamModel {
  length: number;
  supports: Support[];
  udl: number;                          // kN/m, downward, over the full length
  pointLoads: { x: number; P: number }[]; // kN, downward
  EI: number;                           // kN·m²
}

export interface BeamReaction { x: number; R: number; M: number } // kN, kNm

export interface BeamAnalysis {
  maxMoment: number; maxMomentPos: number;   // kNm (max absolute, signed value kept)
  maxShear: number;                          // kN (max absolute)
  maxDeflection: number; maxDeflPos: number; // mm (downward positive)
  reactions: BeamReaction[];
  samples: { x: number; shear: number; moment: number; defl: number }[];
}

const EPS = 1e-9;

export function analyzeBeam(model: BeamModel): BeamAnalysis {
  const { length: L, EI } = model;

  // --- Build the node mesh: critical points + subdivisions for smoothness ---
  const critical = new Set<number>([0, L]);
  for (const s of model.supports) critical.add(clamp(s.x, 0, L));
  for (const pl of model.pointLoads) critical.add(clamp(pl.x, 0, L));
  const pts = [...critical].sort((a, b) => a - b);

  const nodeX: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const segs = Math.max(1, Math.ceil((b - a) / (L / 48)));
    for (let j = 0; j < segs; j++) nodeX.push(a + ((b - a) * j) / segs);
  }
  nodeX.push(L);
  const nNodes = nodeX.length;
  const nDof = nNodes * 2;
  const nodeAt = (x: number) => {
    let best = 0, bd = Infinity;
    for (let i = 0; i < nNodes; i++) {
      const d = Math.abs(nodeX[i] - x);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  };

  // --- Assemble global stiffness K and load vector f (w positive up) ---
  const K = zeros(nDof, nDof);
  const f = new Array(nDof).fill(0);

  for (let e = 0; e < nNodes - 1; e++) {
    const le = nodeX[e + 1] - nodeX[e];
    if (le < EPS) continue;
    const c = EI / (le * le * le);
    const ke = [
      [12 * c, 6 * le * c, -12 * c, 6 * le * c],
      [6 * le * c, 4 * le * le * c, -6 * le * c, 2 * le * le * c],
      [-12 * c, -6 * le * c, 12 * c, -6 * le * c],
      [6 * le * c, 2 * le * le * c, -6 * le * c, 4 * le * le * c],
    ];
    const map = [e * 2, e * 2 + 1, (e + 1) * 2, (e + 1) * 2 + 1];
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) K[map[i]][map[j]] += ke[i][j];

    // Consistent nodal loads for a downward UDL (load up-positive ⇒ -w).
    const q = -model.udl;
    const fe = [q * le / 2, (q * le * le) / 12, q * le / 2, (-q * le * le) / 12];
    for (let i = 0; i < 4; i++) f[map[i]] += fe[i];
  }

  // Point loads (downward ⇒ negative in up-positive convention) at nearest node.
  for (const pl of model.pointLoads) {
    f[nodeAt(clamp(pl.x, 0, L)) * 2] += -pl.P;
  }

  // --- Boundary conditions ---
  const constrained = new Set<number>();
  for (const s of model.supports) {
    const n = nodeAt(clamp(s.x, 0, L));
    constrained.add(n * 2);                    // vertical
    if (s.fixity === "fixed") constrained.add(n * 2 + 1); // rotation
  }

  // Solve for the free DOFs.
  const freeDofs: number[] = [];
  for (let i = 0; i < nDof; i++) if (!constrained.has(i)) freeDofs.push(i);
  const Kff = freeDofs.map((r) => freeDofs.map((cc) => K[r][cc]));
  const ff = freeDofs.map((r) => f[r]);
  const dFree = solveLinear(Kff, ff);

  const d = new Array(nDof).fill(0);
  freeDofs.forEach((dof, i) => { d[dof] = dFree[i]; });

  // --- Reactions: (K·d − f) at constrained DOFs ---
  const reactions: BeamReaction[] = [];
  for (const s of model.supports) {
    const n = nodeAt(clamp(s.x, 0, L));
    let R = -f[n * 2];
    for (let j = 0; j < nDof; j++) R += K[n * 2][j] * d[j];
    let M = 0;
    if (s.fixity === "fixed") {
      M = -f[n * 2 + 1];
      for (let j = 0; j < nDof; j++) M += K[n * 2 + 1][j] * d[j];
    }
    reactions.push({ x: s.x, R, M });
  }

  // --- Shear & moment by statics marching from the left ---
  const N = 200;
  const samples: BeamAnalysis["samples"] = [];
  let maxMoment = 0, maxMomentPos = 0, maxShear = 0;
  for (let i = 0; i <= N; i++) {
    const x = (L * i) / N;
    let V = 0, M = 0;
    for (const r of reactions) {
      if (r.x <= x + EPS) {
        V += r.R;                 // upward reaction
        M += r.R * (x - r.x);     // sagging positive
        M -= r.M;                 // fixed-end reaction moment (sign to sagging convention)
      }
    }
    V -= model.udl * x;
    M -= (model.udl * x * x) / 2;
    for (const pl of model.pointLoads) {
      if (pl.x <= x + EPS) { V -= pl.P; M -= pl.P * (x - pl.x); }
    }
    const defl = -deflectionAt(x, nodeX, d) * 1000; // up-positive → downward-positive mm
    samples.push({ x, shear: V, moment: M, defl });
    if (Math.abs(M) > Math.abs(maxMoment)) { maxMoment = M; maxMomentPos = x; }
    if (Math.abs(V) > Math.abs(maxShear)) maxShear = V;
  }

  let maxDeflection = 0, maxDeflPos = 0;
  for (const s of samples) {
    if (Math.abs(s.defl) > Math.abs(maxDeflection)) { maxDeflection = s.defl; maxDeflPos = s.x; }
  }

  return {
    maxMoment: Math.abs(maxMoment), maxMomentPos,
    maxShear: Math.abs(maxShear),
    maxDeflection: Math.abs(maxDeflection), maxDeflPos,
    reactions,
    samples: samples.filter((_, i) => i % 4 === 0 || i === N),
  };
}

// Hermite interpolation of the deflected shape within the element containing x.
function deflectionAt(x: number, nodeX: number[], d: number[]): number {
  let e = 0;
  for (let i = 0; i < nodeX.length - 1; i++) {
    if (x >= nodeX[i] - EPS && x <= nodeX[i + 1] + EPS) { e = i; break; }
    if (i === nodeX.length - 2) e = i;
  }
  const x1 = nodeX[e], x2 = nodeX[e + 1];
  const le = x2 - x1 || EPS;
  const t = (x - x1) / le; // 0..1
  const w1 = d[e * 2], th1 = d[e * 2 + 1], w2 = d[(e + 1) * 2], th2 = d[(e + 1) * 2 + 1];
  const H1 = 1 - 3 * t * t + 2 * t * t * t;
  const H2 = le * (t - 2 * t * t + t * t * t);
  const H3 = 3 * t * t - 2 * t * t * t;
  const H4 = le * (-t * t + t * t * t);
  return H1 * w1 + H2 * th1 + H3 * w2 + H4 * th2;
}

function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }
function zeros(r: number, c: number) { return Array.from({ length: r }, () => new Array(c).fill(0)); }

// Gaussian elimination with partial pivoting.
function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  if (n === 0) return [];
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    [M[col], M[piv]] = [M[piv], M[col]];
    const d = M[col][col];
    if (Math.abs(d) < 1e-30) continue;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col] / d;
      for (let k = col; k <= n; k++) M[r][k] -= factor * M[col][k];
    }
  }
  return M.map((row, i) => row[n] / (M[i][i] || 1));
}

// Preset support layouts derived from a base span length (per span).
export type BeamConfig =
  | "simple" | "cantilever" | "propped" | "two-span" | "three-span";

export const BEAM_CONFIGS: { value: BeamConfig; label: string }[] = [
  { value: "simple", label: "Simply supported" },
  { value: "cantilever", label: "Cantilever (fixed one end)" },
  { value: "propped", label: "Propped cantilever" },
  { value: "two-span", label: "Two-span continuous" },
  { value: "three-span", label: "Three-span continuous" },
];

/** Build supports + total length for a configuration from one span length. */
export function configGeometry(config: BeamConfig, span: number): { length: number; supports: Support[] } {
  switch (config) {
    case "cantilever":
      return { length: span, supports: [{ x: 0, fixity: "fixed" }] };
    case "propped":
      return { length: span, supports: [{ x: 0, fixity: "fixed" }, { x: span, fixity: "pinned" }] };
    case "two-span":
      return { length: 2 * span, supports: [0, span, 2 * span].map((x) => ({ x, fixity: "pinned" as Fixity })) };
    case "three-span":
      return { length: 3 * span, supports: [0, span, 2 * span, 3 * span].map((x) => ({ x, fixity: "pinned" as Fixity })) };
    case "simple":
    default:
      return { length: span, supports: [{ x: 0, fixity: "pinned" }, { x: span, fixity: "pinned" }] };
  }
}
