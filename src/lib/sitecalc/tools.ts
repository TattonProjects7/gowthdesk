// SiteCalc tool registry — drives the hub grid and the in-app navigation.

export interface Tool {
  slug: string;
  name: string;
  tagline: string;
  icon: string;   // lucide-react icon name
  accent: string; // tailwind colour key, e.g. "amber"
}

export const TOOLS: Tool[] = [
  {
    slug: "markup",
    name: "Steel Markup",
    tagline: "Upload plans & elevations, mark where the steels go and build a schedule",
    icon: "PencilRuler",
    accent: "amber",
  },
  {
    slug: "beam",
    name: "Beam Designer",
    tagline: "Auto-size the steel from span & load — capacity checks, stress and diagrams",
    icon: "Ruler",
    accent: "amber",
  },
  {
    slug: "column",
    name: "Column Designer",
    tagline: "Auto-size a steel post from axial load & height — buckling capacity check",
    icon: "Columns3",
    accent: "rose",
  },
  {
    slug: "concrete",
    name: "Concrete Estimator",
    tagline: "Volume, cement / sand / aggregate quantities and ready-mix cost",
    icon: "Box",
    accent: "sky",
  },
  {
    slug: "masonry",
    name: "Brick & Block",
    tagline: "Units, mortar and materials for a wall, with waste allowance",
    icon: "BrickWall",
    accent: "rose",
  },
  {
    slug: "drainage",
    name: "Pipe Fall & Gradient",
    tagline: "Convert between gradient, fall and invert levels for drainage runs",
    icon: "Waves",
    accent: "cyan",
  },
  {
    slug: "steel",
    name: "Metal Weight",
    tagline: "Weight & cost of bars, plates, hollow sections and rebar",
    icon: "Weight",
    accent: "violet",
  },
  {
    slug: "convert",
    name: "Unit Converter",
    tagline: "Length, force, pressure, moment, mass and temperature",
    icon: "ArrowLeftRight",
    accent: "emerald",
  },
  {
    slug: "project",
    name: "Job",
    tagline: "Saved beam & column designs — print the whole job as one PDF",
    icon: "FolderOpen",
    accent: "sky",
  },
];

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

// Accent → tailwind class fragments (kept explicit so Tailwind keeps them).
export const ACCENT: Record<string, { text: string; bg: string; border: string; ring: string }> = {
  amber:   { text: "text-amber-400",   bg: "bg-amber-500",   border: "border-amber-700/50",   ring: "focus:border-amber-500" },
  sky:     { text: "text-sky-400",     bg: "bg-sky-500",     border: "border-sky-700/50",     ring: "focus:border-sky-500" },
  rose:    { text: "text-rose-400",    bg: "bg-rose-500",    border: "border-rose-700/50",    ring: "focus:border-rose-500" },
  cyan:    { text: "text-cyan-400",    bg: "bg-cyan-500",    border: "border-cyan-700/50",    ring: "focus:border-cyan-500" },
  violet:  { text: "text-violet-400",  bg: "bg-violet-500",  border: "border-violet-700/50",  ring: "focus:border-violet-500" },
  emerald: { text: "text-emerald-400", bg: "bg-emerald-500", border: "border-emerald-700/50", ring: "focus:border-emerald-500" },
};
