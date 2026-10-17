// Writes mobile/www/config.js with the deployed app URL so the bundled
// offline page can retry the real server. Run automatically by the cap:* scripts.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

function fromFile(key) {
  for (const f of [".env.local", ".env"]) {
    if (!existsSync(f)) continue;
    const m = readFileSync(f, "utf8").match(new RegExp(`^\\s*${key}\\s*=\\s*"?([^"\\n#]+)"?`, "m"));
    if (m) return m[1].trim();
  }
}

const url = (process.env.NEXT_PUBLIC_APP_URL || fromFile("NEXT_PUBLIC_APP_URL") || "").replace(/\/$/, "");
writeFileSync("mobile/www/config.js", `window.SHORTLIST_URL = ${JSON.stringify(url.startsWith("https://") ? url : "")};\n`);
console.log(url.startsWith("https://") ? `Native apps will load ${url}` : "⚠ NEXT_PUBLIC_APP_URL is not an https URL — the apps will show the setup screen. See MOBILE.md.");
