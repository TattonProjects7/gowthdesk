import { getInstrument } from "@/lib/instruments";

// Logo-style instrument avatar: a brand-coloured disc with a short monogram, the
// way IG, ii and InvestEngine show a company logo beside every line. Colours
// are the issuers' public brand colours; no third-party logo files are used.
const BRAND: Record<string, { bg: string; fg?: string; mark?: string }> = {
  AAPL: { bg: "#1d1d1f", mark: "" },
  NVDA: { bg: "#76b900" },
  TSLA: { bg: "#cc0000", mark: "T" },
  MSFT: { bg: "#00a4ef", mark: "MS" },
  AMZN: { bg: "#ff9900", fg: "#111", mark: "a" },
  META: { bg: "#0866ff", mark: "∞" },
  GOOGL: { bg: "#4285f4", mark: "G" },
  AMD: { bg: "#111111", mark: "AMD" },
  COIN: { bg: "#0052ff", mark: "C" },
  PLTR: { bg: "#101113", mark: "P" },
  SHOP: { bg: "#95bf47", mark: "S" },
  DIS: { bg: "#113ccf", mark: "D" },
  LLOY: { bg: "#006a4d", mark: "L" },
  BP: { bg: "#009b3a", fg: "#ffe800", mark: "bp" },
  SHEL: { bg: "#fbce07", fg: "#dd1d21", mark: "S" },
  AZN: { bg: "#830051", mark: "AZ" },
  HSBA: { bg: "#db0011", mark: "H" },
  VOD: { bg: "#e60000", mark: "V" },
  RR: { bg: "#10069f", mark: "RR" },
  BARC: { bg: "#00aeef", mark: "B" },
  TSCO: { bg: "#00539f", mark: "T" },
  GSK: { bg: "#f36633", mark: "G" },
  VUSA: { bg: "#96151d", mark: "V" },
  VWRL: { bg: "#96151d", mark: "V" },
  VFEM: { bg: "#96151d", mark: "V" },
  ISF: { bg: "#111111", mark: "iS" },
  IGLT: { bg: "#111111", mark: "iS" },
  AGBP: { bg: "#111111", mark: "iS" },
  SGLN: { bg: "#b8860b", mark: "Au" },
  EQQQ: { bg: "#0063a5", mark: "IV" },
  BTC: { bg: "#f7931a", mark: "₿" },
  ETH: { bg: "#627eea", mark: "Ξ" },
  SOL: { bg: "#14151a", fg: "#14f195", mark: "◎" },
};

export default function Avatar({ symbol, size = 36 }: { symbol: string; size?: number }) {
  const b = BRAND[symbol] ?? { bg: "#343b5e" };
  const i = getInstrument(symbol);
  const mark = b.mark === "" ? appleGlyph() : b.mark ?? (i?.name ?? symbol).replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();
  const fs = typeof mark === "string" && mark.length >= 3 ? size * 0.3 : typeof mark === "string" && mark.length === 2 ? size * 0.36 : size * 0.46;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold ring-1 ring-white/10 select-none"
      style={{ width: size, height: size, background: b.bg, color: b.fg ?? "#fff", fontSize: fs, lineHeight: 1 }}
      aria-hidden
    >
      {mark}
    </span>
  );
}

function appleGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="55%" height="55%" fill="currentColor">
      <path d="M16.37 12.6c.03 3 2.62 4 2.65 4.01-.02.07-.41 1.42-1.37 2.81-.83 1.2-1.69 2.4-3.04 2.43-1.33.03-1.76-.79-3.28-.79s-2 .76-3.25.82c-1.31.05-2.3-1.3-3.14-2.5-1.71-2.47-3.02-6.98-1.26-10.02.87-1.51 2.43-2.47 4.13-2.5 1.29-.02 2.5.87 3.29.87.79 0 2.27-1.08 3.83-.92.65.03 2.48.26 3.66 1.99-.1.06-2.18 1.27-2.22 3.8M13.85 3.2c.7-.85 1.17-2.02 1.04-3.2-1 .04-2.22.67-2.94 1.51-.65.75-1.21 1.94-1.06 3.09 1.12.09 2.26-.57 2.96-1.4" />
    </svg>
  );
}
