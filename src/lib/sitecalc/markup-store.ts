// Client-side persistence + drawing import for the steel markup tool.
// Everything stays in the browser (localStorage) so the tool works offline.

import { Project, Sheet, Mark } from "./markup-types";

const KEY = "sitecalc.markup.project.v1";
const MAX_DIM = 2200; // downscale large drawings to keep storage manageable

export function emptyProject(): Project {
  return { name: "Untitled project", sheets: [], updated: Date.now() };
}

export function loadProject(): Project {
  if (typeof window === "undefined") return emptyProject();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyProject();
    return JSON.parse(raw) as Project;
  } catch {
    return emptyProject();
  }
}

/** Returns true on success, false if storage quota was exceeded. */
export function saveProject(p: Project): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...p, updated: Date.now() }));
    return true;
  } catch {
    return false; // most likely QuotaExceededError
  }
}

export function uid(prefix = "m"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

// --- Import -------------------------------------------------------------

/** Load + downscale an image File into a JPEG data URL + dimensions. */
function imageFileToSheet(file: File): Promise<{ src: string; w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(rasterise(img, img.naturalWidth, img.naturalHeight));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

function rasterise(
  source: CanvasImageSource,
  w: number,
  h: number,
): { src: string; w: number; h: number } {
  const scale = Math.min(1, MAX_DIM / Math.max(w, h));
  const cw = Math.round(w * scale);
  const ch = Math.round(h * scale);
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(source, 0, 0, cw, ch);
  return { src: canvas.toDataURL("image/jpeg", 0.82), w: cw, h: ch };
}

/** Render every page of a PDF File into separate sheet images. */
async function pdfFileToSheets(
  file: File,
): Promise<{ src: string; w: number; h: number }[]> {
  const pdfjs = await import("pdfjs-dist");
  // Bundled worker — works offline, no CDN.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const out: { src: string; w: number; h: number }[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    // Render at a resolution that lands near MAX_DIM on the long edge.
    const scale = Math.min(2.5, MAX_DIM / Math.max(base.width, base.height));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    out.push({
      src: canvas.toDataURL("image/jpeg", 0.82),
      w: canvas.width,
      h: canvas.height,
    });
  }
  return out;
}

/** Import one file into one or more sheets (PDF → one sheet per page). */
export async function importFile(file: File): Promise<Sheet[]> {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const baseName = file.name.replace(/\.[^.]+$/, "");
  if (isPdf) {
    const pages = await pdfFileToSheets(file);
    return pages.map((p, i) => ({
      id: uid("s"),
      name: pages.length > 1 ? `${baseName} — p${i + 1}` : baseName,
      kind: "plan",
      marks: [] as Mark[],
      ...p,
    }));
  }
  const img = await imageFileToSheet(file);
  return [{ id: uid("s"), name: baseName, kind: "plan", marks: [], ...img }];
}

// --- Export -------------------------------------------------------------

/** Build a steel schedule (one row per steel/column mark) as CSV. */
export function scheduleCsv(project: Project): string {
  const rows = [["Sheet", "Type", "Ref", "Section", "Notes"]];
  for (const sheet of project.sheets) {
    for (const m of sheet.marks) {
      if (m.type === "note") continue;
      rows.push([
        sheet.name,
        m.type === "steel" ? "Steel" : "Column",
        m.ref ?? "",
        m.section ?? "",
        (m.note ?? "").replace(/\n/g, " "),
      ]);
    }
  }
  return rows
    .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
    .join("\n");
}
