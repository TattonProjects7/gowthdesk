// Load build-up helper: turn area loads (dead + imposed/snow) and a tributary
// width into a UDL (kN/m) on a beam. Indicative characteristic values — confirm
// against EN 1991-1-1 / BS 6399 and project-specific loads.

export interface LoadBuildup {
  tributary: number; // m, width of floor/roof the beam supports
  dead: number;      // kN/m², permanent (gk)
  imposed: number;   // kN/m², variable (qk)
  lineLoad: number;  // kN/m, additional line load (e.g. wall over) applied directly
}

export interface LoadResult {
  deadUdl: number;    // kN/m
  imposedUdl: number; // kN/m
  totalUdl: number;   // kN/m (service)
}

export function buildUdl(b: LoadBuildup): LoadResult {
  const deadUdl = b.dead * b.tributary + b.lineLoad;
  const imposedUdl = b.imposed * b.tributary;
  return { deadUdl, imposedUdl, totalUdl: deadUdl + imposedUdl };
}

// Typical characteristic dead loads (kN/m²) for common build-ups.
export const DEAD_PRESETS = [
  { name: "Timber floor + finishes", value: 0.5 },
  { name: "Timber floor + screed/ceiling", value: 0.9 },
  { name: "150 RC slab + finishes", value: 4.5 },
  { name: "200 RC slab + finishes", value: 5.7 },
  { name: "Pitched roof (tiles)", value: 0.9 },
  { name: "Flat roof (warm deck)", value: 1.2 },
];

// Imposed (variable) loads (kN/m²) by use — EN 1991-1-1 categories.
export const IMPOSED_PRESETS = [
  { name: "Domestic / residential (A)", value: 1.5 },
  { name: "Office (B)", value: 2.5 },
  { name: "Assembly / shops (C/D)", value: 4.0 },
  { name: "Storage (E)", value: 7.5 },
  { name: "Roof — access for maintenance", value: 0.75 },
  { name: "Roof — snow (typical UK)", value: 0.6 },
];
