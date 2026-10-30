// Drainage pipe fall / gradient calculator.
//
// Relationships:  gradient 1:X  ->  fall = length / X
//                 fall (mm)     ->  gradient = length / fall
// Invert levels: downstream invert = upstream invert - fall.

export type DrainSolveFor = "fall" | "gradient";

export interface DrainInput {
  solveFor: DrainSolveFor;
  length: number;        // m (pipe run)
  gradientX: number;     // the X in 1:X (used when solving for fall)
  fallMm: number;        // mm (used when solving for gradient)
  upstreamInvert: number; // m AOD/site datum
}

export interface DrainResult {
  fallMm: number;
  gradientX: number;        // 1 : gradientX
  gradientPct: number;
  downstreamInvert: number; // m
}

export function calcDrainage(input: DrainInput): DrainResult {
  const lengthMm = input.length * 1000;
  let fallMm: number;
  let gradientX: number;

  if (input.solveFor === "fall") {
    gradientX = input.gradientX;
    fallMm = gradientX > 0 ? lengthMm / gradientX : 0;
  } else {
    fallMm = input.fallMm;
    gradientX = fallMm > 0 ? lengthMm / fallMm : 0;
  }

  const gradientPct = gradientX > 0 ? (1 / gradientX) * 100 : 0;
  const downstreamInvert = input.upstreamInvert - fallMm / 1000;

  return { fallMm, gradientX, gradientPct, downstreamInvert };
}

// UK Building Regs (Approved Document H) recommended gradients (foul drainage).
export const RECOMMENDED_GRADIENTS: {
  pipe: string; min: string; note: string;
}[] = [
  { pipe: "100mm foul", min: "1:40", note: "Min for ≤1 WC; 1:80 with adequate flow" },
  { pipe: "150mm foul", min: "1:150", note: "1:60 to 1:150 typical" },
  { pipe: "100mm surface water", min: "1:100", note: "Self-cleansing target" },
  { pipe: "150mm surface water", min: "1:150", note: "Self-cleansing target" },
];
