// Steel & metal weight calculator (also covers rebar).
// Mass = density × cross-sectional area × length × quantity.

export type SteelShape =
  | "round"   // solid round bar (diameter)
  | "square"  // solid square bar (side)
  | "flat"    // flat bar (width × thickness)
  | "plate"   // plate (width × thickness)  — same maths as flat, named for clarity
  | "rhs"     // rectangular/square hollow (width × height × wall)
  | "chs"     // circular hollow (outer dia × wall)
  | "rebar";  // reinforcement bar (diameter)

export interface SteelInput {
  shape: SteelShape;
  d1: number;   // mm — diameter / side / width / outer dia
  d2: number;   // mm — height (RHS) / width (flat,plate)
  wall: number; // mm — wall thickness (RHS/CHS)
  length: number; // m
  quantity: number;
  density: number; // kg/m^3 (default steel 7850)
  pricePerKg: number; // £
}

export interface SteelResult {
  areaMm2: number;    // cross-sectional area
  massPerM: number;   // kg/m
  totalMass: number;  // kg (× length × qty)
  totalCost: number;
}

export function calcSteel(input: SteelInput): SteelResult {
  const { d1, d2, wall } = input;
  let areaMm2 = 0;

  switch (input.shape) {
    case "round":
    case "rebar":
      areaMm2 = Math.PI * Math.pow(d1 / 2, 2);
      break;
    case "square":
      areaMm2 = d1 * d1;
      break;
    case "flat":
    case "plate":
      areaMm2 = d1 * d2;
      break;
    case "rhs": {
      const outer = d1 * d2;
      const inner = (d1 - 2 * wall) * (d2 - 2 * wall);
      areaMm2 = outer - Math.max(inner, 0);
      break;
    }
    case "chs": {
      const ro = d1 / 2;
      const ri = Math.max(ro - wall, 0);
      areaMm2 = Math.PI * (ro * ro - ri * ri);
      break;
    }
  }

  // area (mm^2 -> m^2) × density = kg/m
  const massPerM = (areaMm2 * 1e-6) * input.density;
  const totalMass = massPerM * input.length * Math.max(input.quantity, 0);

  return {
    areaMm2,
    massPerM,
    totalMass,
    totalCost: totalMass * input.pricePerKg,
  };
}

export const DENSITIES: { name: string; value: number }[] = [
  { name: "Steel", value: 7850 },
  { name: "Stainless 304", value: 8000 },
  { name: "Aluminium", value: 2700 },
  { name: "Brass", value: 8500 },
  { name: "Copper", value: 8960 },
  { name: "Cast iron", value: 7200 },
];

// Standard UK rebar diameters and mass/m (≈ d²/162 kg/m).
export const REBAR_SIZES = [8, 10, 12, 16, 20, 25, 32, 40];
