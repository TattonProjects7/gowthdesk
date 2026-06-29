// Engineering unit converter. Each category defines units by their factor to a
// base SI unit; conversion is value × fromFactor ÷ toFactor. Temperature is a
// special case handled separately.

export interface UnitDef { name: string; symbol: string; factor: number }
export interface Category { name: string; units: UnitDef[] }

export const CATEGORIES: Category[] = [
  {
    name: "Length",
    units: [
      { name: "Millimetre", symbol: "mm", factor: 0.001 },
      { name: "Centimetre", symbol: "cm", factor: 0.01 },
      { name: "Metre", symbol: "m", factor: 1 },
      { name: "Inch", symbol: "in", factor: 0.0254 },
      { name: "Foot", symbol: "ft", factor: 0.3048 },
      { name: "Yard", symbol: "yd", factor: 0.9144 },
    ],
  },
  {
    name: "Area",
    units: [
      { name: "Square mm", symbol: "mm²", factor: 1e-6 },
      { name: "Square metre", symbol: "m²", factor: 1 },
      { name: "Square foot", symbol: "ft²", factor: 0.092903 },
      { name: "Acre", symbol: "acre", factor: 4046.86 },
      { name: "Hectare", symbol: "ha", factor: 10000 },
    ],
  },
  {
    name: "Volume",
    units: [
      { name: "Litre", symbol: "L", factor: 0.001 },
      { name: "Cubic metre", symbol: "m³", factor: 1 },
      { name: "Cubic foot", symbol: "ft³", factor: 0.0283168 },
      { name: "Cubic yard", symbol: "yd³", factor: 0.764555 },
      { name: "UK gallon", symbol: "gal", factor: 0.00454609 },
    ],
  },
  {
    name: "Force",
    units: [
      { name: "Newton", symbol: "N", factor: 1 },
      { name: "Kilonewton", symbol: "kN", factor: 1000 },
      { name: "Kilogram-force", symbol: "kgf", factor: 9.80665 },
      { name: "Pound-force", symbol: "lbf", factor: 4.44822 },
      { name: "Tonne-force", symbol: "tonf", factor: 9806.65 },
    ],
  },
  {
    name: "Pressure / Stress",
    units: [
      { name: "Pascal", symbol: "Pa", factor: 1 },
      { name: "Kilopascal", symbol: "kPa", factor: 1000 },
      { name: "Megapascal", symbol: "MPa = N/mm²", factor: 1e6 },
      { name: "Bar", symbol: "bar", factor: 1e5 },
      { name: "PSI", symbol: "psi", factor: 6894.76 },
    ],
  },
  {
    name: "Bending moment",
    units: [
      { name: "Newton-metre", symbol: "Nm", factor: 1 },
      { name: "Kilonewton-metre", symbol: "kNm", factor: 1000 },
      { name: "Pound-foot", symbol: "lb·ft", factor: 1.35582 },
    ],
  },
  {
    name: "Mass",
    units: [
      { name: "Kilogram", symbol: "kg", factor: 1 },
      { name: "Tonne", symbol: "t", factor: 1000 },
      { name: "Pound", symbol: "lb", factor: 0.453592 },
      { name: "US/UK ton", symbol: "ton", factor: 1016.05 },
    ],
  },
];

export function convert(value: number, from: UnitDef, to: UnitDef): number {
  return (value * from.factor) / to.factor;
}

// Temperature handled out-of-band (offset scales).
export const TEMP_UNITS = ["°C", "°F", "K"] as const;
export type TempUnit = (typeof TEMP_UNITS)[number];

export function convertTemp(value: number, from: TempUnit, to: TempUnit): number {
  let c: number; // to Celsius
  if (from === "°C") c = value;
  else if (from === "°F") c = (value - 32) * (5 / 9);
  else c = value - 273.15;

  if (to === "°C") return c;
  if (to === "°F") return c * (9 / 5) + 32;
  return c + 273.15;
}
