// Concrete volume + materials estimator.

export type ConcreteShape = "slab" | "footing" | "column-rect" | "column-circ";

export interface ConcreteInput {
  shape: ConcreteShape;
  length: number;    // m  (slab/footing length)
  width: number;     // m  (slab/footing width, or column side)
  thickness: number; // m  (slab thickness / footing depth / column side b)
  diameter: number;  // m  (circular column)
  height: number;    // m  (column height)
  quantity: number;  // number of identical elements
  wastePct: number;  // %
  pricePerM3: number; // £ ready-mix
  // Mix design (by volume), e.g. 1:2:4 cement:sand:aggregate
  cementRatio: number;
  sandRatio: number;
  aggRatio: number;
}

export interface ConcreteResult {
  unitVolume: number;   // m^3 per element
  netVolume: number;    // m^3 total before waste
  grossVolume: number;  // m^3 total incl. waste
  cementBags: number;   // 25kg bags
  sandTonnes: number;
  aggTonnes: number;
  totalCost: number;    // £ (ready-mix gross volume × price)
}

// Dry volume factor: loose dry materials compact when mixed/wet (~54% bulking).
const DRY_FACTOR = 1.54;
const CEMENT_DENSITY = 1440; // kg/m^3
const SAND_DENSITY = 1600;   // kg/m^3
const AGG_DENSITY = 1500;    // kg/m^3
const BAG_KG = 25;

export function calcConcrete(input: ConcreteInput): ConcreteResult {
  let unitVolume = 0;
  switch (input.shape) {
    case "slab":
      unitVolume = input.length * input.width * input.thickness;
      break;
    case "footing":
      unitVolume = input.length * input.width * input.thickness;
      break;
    case "column-rect":
      unitVolume = input.width * input.thickness * input.height;
      break;
    case "column-circ":
      unitVolume =
        Math.PI * Math.pow(input.diameter / 2, 2) * input.height;
      break;
  }

  const qty = Math.max(input.quantity, 0);
  const netVolume = unitVolume * qty;
  const grossVolume = netVolume * (1 + input.wastePct / 100);

  // Materials from mix ratio, based on gross (wet) volume.
  const sum = input.cementRatio + input.sandRatio + input.aggRatio || 1;
  const dryVol = grossVolume * DRY_FACTOR;
  const cementVol = (dryVol * input.cementRatio) / sum;
  const sandVol = (dryVol * input.sandRatio) / sum;
  const aggVol = (dryVol * input.aggRatio) / sum;

  const cementBags = (cementVol * CEMENT_DENSITY) / BAG_KG;
  const sandTonnes = (sandVol * SAND_DENSITY) / 1000;
  const aggTonnes = (aggVol * AGG_DENSITY) / 1000;

  const totalCost = grossVolume * input.pricePerM3;

  return {
    unitVolume,
    netVolume,
    grossVolume,
    cementBags,
    sandTonnes,
    aggTonnes,
    totalCost,
  };
}

export const CONCRETE_MIXES: {
  name: string;
  label: string;
  c: number; s: number; a: number;
}[] = [
  { name: "C7.5 (1:3:6)", label: "Blinding / kerb backing", c: 1, s: 3, a: 6 },
  { name: "C15 (1:2.5:5)", label: "Mass fill / oversite", c: 1, s: 2.5, a: 5 },
  { name: "C20 (1:2:4)", label: "Foundations / general", c: 1, s: 2, a: 4 },
  { name: "C25 (1:1.5:3)", label: "Slabs / footings", c: 1, s: 1.5, a: 3 },
  { name: "C30 (1:1:2)", label: "Structural / paving", c: 1, s: 1, a: 2 },
];
