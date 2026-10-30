// Data model for the steel markup tool. All mark coordinates are stored in the
// drawing's natural pixel space so they stay locked to the drawing at any zoom.

export type SheetKind = "plan" | "elevation" | "section" | "detail";
export type MarkType = "steel" | "column" | "note";

export interface Mark {
  id: string;
  type: MarkType;
  x1: number;
  y1: number;
  x2?: number; // steel members only (line end)
  y2?: number;
  ref?: string;     // schedule reference, e.g. "B1" / "C3"
  section?: string; // e.g. "UB 203x133x25"
  note?: string;
  color: string;
  // Optional quick-size inputs (steel members) — used by the in-panel sizer.
  span?: number;    // m
  udl?: number;     // kN/m
  point?: number;   // kN point load at mid-span
}

export interface Sheet {
  id: string;
  name: string;
  kind: SheetKind;
  src: string; // image data URL (PDF pages are rasterised on import)
  w: number;
  h: number;
  marks: Mark[];
}

export interface Project {
  name: string;
  sheets: Sheet[];
  updated: number;
}

export const SHEET_KINDS: { value: SheetKind; label: string }[] = [
  { value: "plan", label: "Plan" },
  { value: "elevation", label: "Elevation" },
  { value: "section", label: "Section" },
  { value: "detail", label: "Detail" },
];

export const MARK_COLORS = [
  "#f59e0b", // amber — steel default
  "#ef4444", // red
  "#22d3ee", // cyan
  "#a855f7", // violet
  "#22c55e", // green
  "#ffffff", // white
];

// Common UK sections for the section-size autocomplete.
export const COMMON_SECTIONS = [
  "UB 152x89x16", "UB 178x102x19", "UB 203x133x25", "UB 254x146x31",
  "UB 305x165x40", "UB 356x171x51", "UB 406x178x60", "UB 457x191x74",
  "UB 533x210x92", "UC 152x152x23", "UC 203x203x46", "UC 254x254x73",
  "PFC 150x75x18", "PFC 200x75x23", "SHS 100x100x5", "RHS 150x100x6",
  "RSA 100x100x10", "C24 47x150", "C24 47x200", "C24 47x225", "Padstone",
];
