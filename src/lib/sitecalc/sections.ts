// UK structural steel section properties (indicative "Blue Book" values).
// Used for beam design checks and auto-sizing.
//
// Fields:
//   mass  kg/m            D  overall depth (mm)        B  flange width (mm)
//   tw    web thk (mm)    tf flange thk (mm)           A  area (cm²)
//   Ix    2nd moment of area, major axis (cm⁴)
//   Wel   elastic section modulus, major (cm³)
//   Wpl   plastic section modulus, major (cm³)
//
// Properties are widely-published nominal values for planning/checking only —
// always confirm against the current Blue Book or manufacturer data.

export interface Section {
  type: "UB" | "UC" | "PFC";
  name: string;
  mass: number;
  D: number;
  B: number;
  tw: number;
  tf: number;
  A: number;
  Ix: number;
  Wel: number;
  Wpl: number;
}

export const SECTIONS: Section[] = [
  // ---- Universal Beams (primary bending members) ----
  { type: "UB", name: "127×76×13",   mass: 13,  D: 127.0, B: 76.0,  tw: 4.0,  tf: 7.6,  A: 16.5, Ix: 473,   Wel: 75,   Wpl: 84 },
  { type: "UB", name: "152×89×16",   mass: 16,  D: 152.4, B: 88.7,  tw: 4.5,  tf: 7.7,  A: 20.3, Ix: 834,   Wel: 109,  Wpl: 123 },
  { type: "UB", name: "178×102×19",  mass: 19,  D: 177.8, B: 101.2, tw: 4.8,  tf: 7.9,  A: 24.3, Ix: 1356,  Wel: 153,  Wpl: 171 },
  { type: "UB", name: "203×102×23",  mass: 23,  D: 203.2, B: 101.8, tw: 5.4,  tf: 9.3,  A: 29.4, Ix: 2105,  Wel: 207,  Wpl: 234 },
  { type: "UB", name: "203×133×25",  mass: 25,  D: 203.2, B: 133.2, tw: 5.7,  tf: 7.8,  A: 32.0, Ix: 2340,  Wel: 230,  Wpl: 258 },
  { type: "UB", name: "203×133×30",  mass: 30,  D: 206.8, B: 133.9, tw: 6.4,  tf: 9.6,  A: 38.2, Ix: 2896,  Wel: 280,  Wpl: 314 },
  { type: "UB", name: "254×102×28",  mass: 28,  D: 260.4, B: 102.2, tw: 6.3,  tf: 10.0, A: 36.1, Ix: 4005,  Wel: 308,  Wpl: 353 },
  { type: "UB", name: "254×146×31",  mass: 31,  D: 251.4, B: 146.1, tw: 6.0,  tf: 8.6,  A: 39.7, Ix: 4413,  Wel: 351,  Wpl: 393 },
  { type: "UB", name: "254×146×37",  mass: 37,  D: 256.0, B: 146.4, tw: 6.3,  tf: 10.9, A: 47.2, Ix: 5537,  Wel: 433,  Wpl: 483 },
  { type: "UB", name: "305×127×37",  mass: 37,  D: 304.4, B: 123.4, tw: 7.1,  tf: 10.7, A: 47.2, Ix: 7171,  Wel: 471,  Wpl: 539 },
  { type: "UB", name: "305×165×40",  mass: 40,  D: 303.4, B: 165.0, tw: 6.0,  tf: 10.2, A: 51.3, Ix: 8503,  Wel: 560,  Wpl: 623 },
  { type: "UB", name: "305×165×46",  mass: 46,  D: 306.6, B: 165.7, tw: 6.7,  tf: 11.8, A: 58.7, Ix: 9899,  Wel: 646,  Wpl: 720 },
  { type: "UB", name: "356×171×45",  mass: 45,  D: 351.4, B: 171.1, tw: 7.0,  tf: 9.7,  A: 57.3, Ix: 12070, Wel: 687,  Wpl: 775 },
  { type: "UB", name: "356×171×51",  mass: 51,  D: 355.0, B: 171.5, tw: 7.4,  tf: 11.5, A: 64.9, Ix: 14140, Wel: 796,  Wpl: 896 },
  { type: "UB", name: "406×178×54",  mass: 54,  D: 402.6, B: 177.7, tw: 7.7,  tf: 10.9, A: 69.0, Ix: 18720, Wel: 930,  Wpl: 1055 },
  { type: "UB", name: "406×178×60",  mass: 60,  D: 406.4, B: 177.9, tw: 7.9,  tf: 12.8, A: 76.5, Ix: 21600, Wel: 1063, Wpl: 1199 },
  { type: "UB", name: "457×191×67",  mass: 67,  D: 453.4, B: 189.9, tw: 8.5,  tf: 12.7, A: 85.5, Ix: 29380, Wel: 1296, Wpl: 1471 },
  { type: "UB", name: "457×191×74",  mass: 74,  D: 457.0, B: 190.4, tw: 9.0,  tf: 14.5, A: 94.6, Ix: 33320, Wel: 1458, Wpl: 1653 },
  { type: "UB", name: "533×210×82",  mass: 82,  D: 528.3, B: 208.8, tw: 9.6,  tf: 13.2, A: 105,  Ix: 47540, Wel: 1800, Wpl: 2059 },
  { type: "UB", name: "533×210×92",  mass: 92,  D: 533.1, B: 209.3, tw: 10.1, tf: 15.6, A: 117,  Ix: 55230, Wel: 2072, Wpl: 2360 },
  { type: "UB", name: "610×229×101", mass: 101, D: 602.6, B: 227.6, tw: 10.5, tf: 14.8, A: 129,  Ix: 75780, Wel: 2515, Wpl: 2881 },
  { type: "UB", name: "610×229×113", mass: 113, D: 607.6, B: 228.2, tw: 11.1, tf: 17.3, A: 144,  Ix: 87320, Wel: 2874, Wpl: 3281 },
  { type: "UB", name: "686×254×125", mass: 125, D: 677.9, B: 253.0, tw: 11.7, tf: 16.2, A: 159,  Ix: 118000,Wel: 3481, Wpl: 3994 },
  { type: "UB", name: "762×267×147", mass: 147, D: 754.0, B: 265.2, tw: 12.8, tf: 17.5, A: 187,  Ix: 168500,Wel: 4470, Wpl: 5156 },

  // ---- Universal Columns (also used as stocky beams / posts) ----
  { type: "UC", name: "152×152×23",  mass: 23,  D: 152.4, B: 152.2, tw: 5.8,  tf: 6.8,  A: 29.2, Ix: 1250,  Wel: 164,  Wpl: 182 },
  { type: "UC", name: "152×152×30",  mass: 30,  D: 157.6, B: 152.9, tw: 6.5,  tf: 9.4,  A: 38.3, Ix: 1748,  Wel: 222,  Wpl: 248 },
  { type: "UC", name: "203×203×46",  mass: 46,  D: 203.2, B: 203.6, tw: 7.2,  tf: 11.0, A: 58.7, Ix: 4568,  Wel: 450,  Wpl: 497 },
  { type: "UC", name: "203×203×52",  mass: 52,  D: 206.2, B: 204.3, tw: 7.9,  tf: 12.5, A: 66.3, Ix: 5259,  Wel: 510,  Wpl: 567 },
  { type: "UC", name: "254×254×73",  mass: 73,  D: 254.1, B: 254.6, tw: 8.6,  tf: 14.2, A: 93.1, Ix: 11410, Wel: 898,  Wpl: 992 },

  // ---- Parallel Flange Channels ----
  { type: "PFC", name: "150×75×18",  mass: 18,  D: 150.0, B: 75.0,  tw: 5.5,  tf: 10.0, A: 23.0, Ix: 861,   Wel: 115,  Wpl: 132 },
  { type: "PFC", name: "200×75×23",  mass: 23,  D: 200.0, B: 75.0,  tw: 6.0,  tf: 12.5, A: 29.2, Ix: 1960,  Wel: 196,  Wpl: 227 },
  { type: "PFC", name: "230×90×32",  mass: 32,  D: 230.0, B: 90.0,  tw: 7.5,  tf: 14.0, A: 40.8, Ix: 3520,  Wel: 306,  Wpl: 355 },
];

export const STEEL_GRADES = [
  { name: "S275", py: 275 }, // design strength py for ≤16mm flange (BS 5950)
  { name: "S355", py: 355 },
];

export const DEFLECTION_LIMITS = [
  { label: "L/360 — floors (brittle finishes)", denom: 360 },
  { label: "L/250 — general beams", denom: 250 },
  { label: "L/200 — roofs / no finishes", denom: 200 },
  { label: "L/180 — purlins", denom: 180 },
];
