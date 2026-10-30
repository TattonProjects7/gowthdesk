// Brick / block wall estimator (UK standard sizes, 10mm mortar joints).

export type Unit = "brick" | "block";

export interface MasonryInput {
  wallLength: number;  // m
  wallHeight: number;  // m
  openings: number;    // m^2 total to subtract (doors/windows)
  unit: Unit;
  skins: number;       // 1 = single skin, 2 = cavity (two leaves)
  wastePct: number;    // %
  pricePerUnit: number; // £
}

export interface MasonryResult {
  netArea: number;     // m^2
  unitsPerM2: number;
  units: number;       // total incl. waste, rounded up
  mortarM3: number;    // incl. waste
  sandTonnes: number;
  cementBags: number;  // 25kg
  totalCost: number;
}

// Units per m^2 of single skin (face area), incl. 10mm joints.
//   Brick 215×102.5×65 laid stretcher  -> 60 / m^2
//   Block 440×215×100                  -> ~10 / m^2
const UNITS_PER_M2: Record<Unit, number> = { brick: 60, block: 10 };
// Mortar volume per m^2 of single skin (m^3). Typical allowances.
const MORTAR_PER_M2: Record<Unit, number> = { brick: 0.022, block: 0.012 };

const SAND_DENSITY = 1600; // kg/m^3
const CEMENT_DENSITY = 1440;
const BAG_KG = 25;
// Mortar mix 1:4 cement:sand by volume, with dry bulking.
const DRY_FACTOR = 1.3;

export function calcMasonry(input: MasonryInput): MasonryResult {
  const grossArea = input.wallLength * input.wallHeight;
  const netArea = Math.max(grossArea - input.openings, 0);
  const skins = Math.max(input.skins, 1);

  const unitsPerM2 = UNITS_PER_M2[input.unit] * skins;
  const rawUnits = netArea * unitsPerM2;
  const units = Math.ceil(rawUnits * (1 + input.wastePct / 100));

  const mortarM3 =
    netArea * MORTAR_PER_M2[input.unit] * skins * (1 + input.wastePct / 100);

  // 1:4 mortar -> cement 1 part, sand 4 parts of dry volume.
  const dryVol = mortarM3 * DRY_FACTOR;
  const cementVol = dryVol / 5;
  const sandVol = (dryVol * 4) / 5;
  const cementBags = (cementVol * CEMENT_DENSITY) / BAG_KG;
  const sandTonnes = (sandVol * SAND_DENSITY) / 1000;

  return {
    netArea,
    unitsPerM2,
    units,
    mortarM3,
    sandTonnes,
    cementBags,
    totalCost: units * input.pricePerUnit,
  };
}
