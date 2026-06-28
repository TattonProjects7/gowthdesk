"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MousePointer2, Minus, Square, Type, Hand, ZoomIn, ZoomOut, Maximize,
  Upload, Trash2, Download, Loader2, FileWarning,
} from "lucide-react";
import {
  Project, Sheet, Mark, MarkType, SheetKind, SHEET_KINDS, MARK_COLORS,
  COMMON_SECTIONS,
} from "@/lib/sitecalc/markup-types";
import {
  loadProject, saveProject, importFile, uid, scheduleCsv, emptyProject,
} from "@/lib/sitecalc/markup-store";

type Tool = "select" | "steel" | "column" | "note" | "pan";

export default function MarkupPage() {
  const [project, setProject] = useState<Project>(emptyProject());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedMark, setSelectedMark] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>("steel");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Load saved project on mount.
  useEffect(() => {
    const p = loadProject();
    setProject(p);
    if (p.sheets[0]) setActiveId(p.sheets[0].id);
  }, []);

  const sheet = useMemo(
    () => project.sheets.find((s) => s.id === activeId) ?? null,
    [project, activeId],
  );

  // Persist on change (debounced via microtask is overkill; direct is fine).
  const persist = useCallback((p: Project) => {
    setProject(p);
    const ok = saveProject(p);
    setWarning(ok ? null : "Storage full — remove a drawing to keep saving. Export your schedule to be safe.");
  }, []);

  const updateSheet = useCallback(
    (id: string, fn: (s: Sheet) => Sheet) => {
      persist({
        ...project,
        sheets: project.sheets.map((s) => (s.id === id ? fn(s) : s)),
      });
    },
    [project, persist],
  );

  // --- Import ---
  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setWarning(null);
    try {
      const added: Sheet[] = [];
      for (const f of Array.from(files)) {
        try {
          added.push(...(await importFile(f)));
        } catch {
          setWarning(`Could not read "${f.name}". Supported: images (PNG/JPG) and PDF drawings.`);
        }
      }
      if (added.length) {
        const next = { ...project, sheets: [...project.sheets, ...added] };
        persist(next);
        setActiveId(added[0].id);
        requestAnimationFrame(() => fitToView(added[0]));
      }
    } finally {
      setBusy(false);
    }
  };

  // --- View helpers ---
  const fitToView = useCallback((s: Sheet | null) => {
    if (!s || !containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const z = Math.min(r.width / s.w, r.height / s.h) * 0.96;
    setZoom(z);
    setPan({ x: (r.width - s.w * z) / 2, y: (r.height - s.h * z) / 2 });
  }, []);

  useEffect(() => {
    if (sheet) fitToView(sheet);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const toImg = (clientX: number, clientY: number) => {
    const r = containerRef.current!.getBoundingClientRect();
    return {
      x: (clientX - r.left - pan.x) / zoom,
      y: (clientY - r.top - pan.y) / zoom,
    };
  };

  const zoomBy = (factor: number, cx?: number, cy?: number) => {
    const r = containerRef.current!.getBoundingClientRect();
    const px = cx ?? r.width / 2;
    const py = cy ?? r.height / 2;
    const imgX = (px - pan.x) / zoom;
    const imgY = (py - pan.y) / zoom;
    const nz = Math.min(8, Math.max(0.05, zoom * factor));
    setZoom(nz);
    setPan({ x: px - imgX * nz, y: py - imgY * nz });
  };

  // --- Pointer interaction ---
  const drag = useRef<null | {
    mode: "draw" | "pan" | "move";
    markId?: string;
    start: { x: number; y: number };
    startPan?: { x: number; y: number };
    moff?: { x: number; y: number }; // mark move offset
  }>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!sheet) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = toImg(e.clientX, e.clientY);

    if (tool === "pan") {
      drag.current = { mode: "pan", start: { x: e.clientX, y: e.clientY }, startPan: { ...pan } };
      return;
    }
    if (tool === "steel") {
      const m: Mark = { id: uid(), type: "steel", x1: p.x, y1: p.y, x2: p.x, y2: p.y, color: MARK_COLORS[0], ref: nextRef(sheet, "B") };
      updateSheet(sheet.id, (s) => ({ ...s, marks: [...s.marks, m] }));
      setSelectedMark(m.id);
      drag.current = { mode: "draw", markId: m.id, start: p };
      return;
    }
    if (tool === "column") {
      const m: Mark = { id: uid(), type: "column", x1: p.x, y1: p.y, color: MARK_COLORS[3], ref: nextRef(sheet, "C"), section: "UC 152x152x23" };
      updateSheet(sheet.id, (s) => ({ ...s, marks: [...s.marks, m] }));
      setSelectedMark(m.id);
      setTool("select");
      return;
    }
    if (tool === "note") {
      const m: Mark = { id: uid(), type: "note", x1: p.x, y1: p.y, color: MARK_COLORS[5], note: "Note" };
      updateSheet(sheet.id, (s) => ({ ...s, marks: [...s.marks, m] }));
      setSelectedMark(m.id);
      setTool("select");
      return;
    }
    // select: hit-test, else pan
    const hit = hitTest(sheet.marks, p, 10 / zoom);
    if (hit) {
      setSelectedMark(hit.id);
      drag.current = { mode: "move", markId: hit.id, start: p, moff: { x: p.x - hit.x1, y: p.y - hit.y1 } };
    } else {
      setSelectedMark(null);
      drag.current = { mode: "pan", start: { x: e.clientX, y: e.clientY }, startPan: { ...pan } };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !sheet) return;
    const d = drag.current;
    if (d.mode === "pan") {
      setPan({ x: d.startPan!.x + (e.clientX - d.start.x), y: d.startPan!.y + (e.clientY - d.start.y) });
      return;
    }
    const p = toImg(e.clientX, e.clientY);
    if (d.mode === "draw" && d.markId) {
      updateSheet(sheet.id, (s) => ({
        ...s,
        marks: s.marks.map((m) => (m.id === d.markId ? { ...m, x2: p.x, y2: p.y } : m)),
      }));
    } else if (d.mode === "move" && d.markId) {
      updateSheet(sheet.id, (s) => ({
        ...s,
        marks: s.marks.map((m) => {
          if (m.id !== d.markId) return m;
          const nx = p.x - d.moff!.x, ny = p.y - d.moff!.y;
          const dx = nx - m.x1, dy = ny - m.y1;
          return { ...m, x1: nx, y1: ny, x2: m.x2 != null ? m.x2 + dx : undefined, y2: m.y2 != null ? m.y2 + dy : undefined };
        }),
      }));
    }
  };

  const onPointerUp = () => {
    // Drop zero-length steel lines (a click without a drag).
    if (drag.current?.mode === "draw" && drag.current.markId && sheet) {
      const m = sheet.marks.find((x) => x.id === drag.current!.markId);
      if (m && Math.hypot((m.x2! - m.x1), (m.y2! - m.y1)) < 4) {
        updateSheet(sheet.id, (s) => ({ ...s, marks: s.marks.filter((x) => x.id !== m.id) }));
        setSelectedMark(null);
      }
    }
    drag.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!sheet) return;
    e.preventDefault();
    const r = containerRef.current!.getBoundingClientRect();
    zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
  };

  const selected = sheet?.marks.find((m) => m.id === selectedMark) ?? null;

  const patchMark = (patch: Partial<Mark>) => {
    if (!sheet || !selected) return;
    updateSheet(sheet.id, (s) => ({
      ...s,
      marks: s.marks.map((m) => (m.id === selected.id ? { ...m, ...patch } : m)),
    }));
  };
  const deleteMark = () => {
    if (!sheet || !selected) return;
    updateSheet(sheet.id, (s) => ({ ...s, marks: s.marks.filter((m) => m.id !== selected.id) }));
    setSelectedMark(null);
  };

  const removeSheet = (id: string) => {
    const next = { ...project, sheets: project.sheets.filter((s) => s.id !== id) };
    persist(next);
    if (activeId === id) setActiveId(next.sheets[0]?.id ?? null);
  };

  const exportPng = () => {
    if (!sheet) return;
    renderSheetPng(sheet, (url) => downloadUrl(url, `${sheet.name}-markup.png`));
  };
  const exportCsv = () => {
    const blob = new Blob([scheduleCsv(project)], { type: "text/csv" });
    downloadUrl(URL.createObjectURL(blob), "steel-schedule.csv");
  };

  return (
    <div className="space-y-4">
      <Toolbar
        tool={tool} setTool={setTool}
        onUpload={onFiles} busy={busy}
        zoomIn={() => zoomBy(1.2)} zoomOut={() => zoomBy(1 / 1.2)}
        fit={() => fitToView(sheet)}
        exportPng={exportPng} exportCsv={exportCsv}
        hasSheet={!!sheet}
      />

      {warning && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-700/60 bg-amber-950/40 px-3 py-2 text-xs text-amber-300">
          <FileWarning className="h-4 w-4 shrink-0" /> {warning}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[180px_1fr_260px]">
        {/* Sheets */}
        <SheetList
          project={project} activeId={activeId}
          onSelect={setActiveId} onRemove={removeSheet}
          onKind={(id, kind) => updateSheet(id, (s) => ({ ...s, kind }))}
          onRename={(id, name) => updateSheet(id, (s) => ({ ...s, name }))}
        />

        {/* Canvas */}
        <div
          ref={containerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onWheel={onWheel}
          className={`relative h-[62vh] overflow-hidden rounded-2xl border border-ink-800 bg-ink-950 ${
            tool === "pan" ? "cursor-grab" : tool === "select" ? "cursor-default" : "cursor-crosshair"
          }`}
          style={{ touchAction: "none" }}
        >
          {!sheet ? (
            <EmptyState onUpload={onFiles} />
          ) : (
            <div
              className="absolute left-0 top-0 origin-top-left"
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, width: sheet.w, height: sheet.h }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sheet.src} alt={sheet.name} width={sheet.w} height={sheet.h} draggable={false} className="block select-none" />
              <svg viewBox={`0 0 ${sheet.w} ${sheet.h}`} width={sheet.w} height={sheet.h} className="absolute left-0 top-0">
                {sheet.marks.map((m) => (
                  <MarkShape key={m.id} m={m} zoom={zoom} selected={m.id === selectedMark} />
                ))}
              </svg>
            </div>
          )}
        </div>

        {/* Properties + schedule */}
        <div className="space-y-4">
          <PropertiesPanel selected={selected} patch={patchMark} onDelete={deleteMark} />
          <SchedulePanel project={project} onJump={(sid, mid) => { setActiveId(sid); setSelectedMark(mid); }} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Geometry + helpers

function distToSeg(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function hitTest(marks: Mark[], p: { x: number; y: number }, tol: number): Mark | null {
  for (let i = marks.length - 1; i >= 0; i--) {
    const m = marks[i];
    if (m.type === "steel" && m.x2 != null) {
      if (distToSeg(p.x, p.y, m.x1, m.y1, m.x2, m.y2!) <= tol) return m;
    } else if (Math.hypot(p.x - m.x1, p.y - m.y1) <= Math.max(tol, 12)) return m;
  }
  return null;
}

function nextRef(sheet: Sheet, prefix: string): string {
  const nums = sheet.marks
    .map((m) => m.ref)
    .filter((r): r is string => !!r && r.startsWith(prefix))
    .map((r) => parseInt(r.slice(prefix.length), 10))
    .filter((n) => !isNaN(n));
  return `${prefix}${(nums.length ? Math.max(...nums) : 0) + 1}`;
}

function downloadUrl(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

function renderSheetPng(sheet: Sheet, done: (url: string) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = sheet.w;
  canvas.height = sheet.h;
  const ctx = canvas.getContext("2d")!;
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, sheet.w, sheet.h);
    const lw = Math.max(2, sheet.w / 500);
    ctx.lineWidth = lw;
    ctx.font = `${Math.max(12, sheet.w / 90)}px sans-serif`;
    for (const m of sheet.marks) {
      ctx.strokeStyle = m.color;
      ctx.fillStyle = m.color;
      if (m.type === "steel" && m.x2 != null) {
        ctx.beginPath();
        ctx.moveTo(m.x1, m.y1);
        ctx.lineTo(m.x2, m.y2!);
        ctx.stroke();
        const label = [m.ref, m.section].filter(Boolean).join("  ");
        if (label) {
          ctx.fillStyle = "#000";
          ctx.fillRect((m.x1 + m.x2) / 2, (m.y1 + m.y2!) / 2 - 16, ctx.measureText(label).width + 8, 18);
          ctx.fillStyle = m.color;
          ctx.fillText(label, (m.x1 + m.x2) / 2 + 4, (m.y1 + m.y2!) / 2 - 2);
        }
      } else if (m.type === "column") {
        const r = lw * 4;
        ctx.strokeRect(m.x1 - r, m.y1 - r, r * 2, r * 2);
        if (m.ref) ctx.fillText(m.ref, m.x1 + r + 2, m.y1);
      } else if (m.type === "note") {
        ctx.fillText(m.note ?? "", m.x1, m.y1);
      }
    }
    done(canvas.toDataURL("image/png"));
  };
  img.src = sheet.src;
}

// ---------------------------------------------------------------------------
// Sub-components

function MarkShape({ m, zoom, selected }: { m: Mark; zoom: number; selected: boolean }) {
  const sw = 3 / zoom;
  const fs = 13 / zoom;
  if (m.type === "steel" && m.x2 != null) {
    const mx = (m.x1 + m.x2) / 2, my = (m.y1 + m.y2!) / 2;
    const label = [m.ref, m.section].filter(Boolean).join("  ");
    return (
      <g>
        {selected && <line x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2!} stroke="#ffffff" strokeWidth={sw * 2.4} strokeLinecap="round" opacity={0.5} />}
        <line x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2!} stroke={m.color} strokeWidth={sw} strokeLinecap="round" />
        {(() => {
          const ang = (Math.atan2(m.y2! - m.y1, m.x2! - m.x1) * 180) / Math.PI;
          return ([[m.x1, m.y1], [m.x2!, m.y2!]] as const).map(([x, y], i) => (
            <line key={i} x1={x} y1={y - sw * 3} x2={x} y2={y + sw * 3}
              transform={`rotate(${ang} ${x} ${y})`}
              stroke={m.color} strokeWidth={sw} />
          ));
        })()}
        {label && (
          <text x={mx} y={my - sw * 4} fontSize={fs} fill={m.color} stroke="#000" strokeWidth={fs / 12} paintOrder="stroke" textAnchor="middle" className="font-semibold">
            {label}
          </text>
        )}
      </g>
    );
  }
  if (m.type === "column") {
    const r = sw * 3.5;
    return (
      <g>
        <rect x={m.x1 - r} y={m.y1 - r} width={r * 2} height={r * 2} fill={m.color} fillOpacity={0.25}
          stroke={selected ? "#fff" : m.color} strokeWidth={sw} />
        <line x1={m.x1 - r} y1={m.y1 - r} x2={m.x1 + r} y2={m.y1 + r} stroke={m.color} strokeWidth={sw} />
        <line x1={m.x1 + r} y1={m.y1 - r} x2={m.x1 - r} y2={m.y1 + r} stroke={m.color} strokeWidth={sw} />
        {m.ref && <text x={m.x1 + r + 2 / zoom} y={m.y1} fontSize={fs} fill={m.color} stroke="#000" strokeWidth={fs / 12} paintOrder="stroke" className="font-semibold">{m.ref}</text>}
      </g>
    );
  }
  return (
    <g>
      <circle cx={m.x1} cy={m.y1} r={sw * 1.5} fill={m.color} stroke={selected ? "#fff" : "none"} strokeWidth={sw / 2} />
      <text x={m.x1 + sw * 2} y={m.y1 + fs / 3} fontSize={fs} fill={m.color} stroke="#000" strokeWidth={fs / 12} paintOrder="stroke">{m.note}</text>
    </g>
  );
}

function Toolbar(props: {
  tool: Tool; setTool: (t: Tool) => void;
  onUpload: (f: FileList | null) => void; busy: boolean;
  zoomIn: () => void; zoomOut: () => void; fit: () => void;
  exportPng: () => void; exportCsv: () => void; hasSheet: boolean;
}) {
  const tools: { id: Tool; icon: typeof Minus; label: string }[] = [
    { id: "select", icon: MousePointer2, label: "Select / move" },
    { id: "steel", icon: Minus, label: "Steel member" },
    { id: "column", icon: Square, label: "Column" },
    { id: "note", icon: Type, label: "Note" },
    { id: "pan", icon: Hand, label: "Pan" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-ink-800 bg-ink-900 p-2">
      <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-ink-950 hover:bg-amber-400">
        {props.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Add drawing
        <input type="file" accept="image/*,application/pdf" multiple className="hidden"
          onChange={(e) => { props.onUpload(e.target.files); e.target.value = ""; }} />
      </label>
      <div className="mx-1 h-6 w-px bg-ink-700" />
      {tools.map((t) => (
        <button key={t.id} title={t.label} onClick={() => props.setTool(t.id)}
          className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
            props.tool === t.id ? "bg-ink-700 text-white" : "text-ink-300 hover:bg-ink-800"
          }`}>
          <t.icon className="h-4 w-4" />
        </button>
      ))}
      <div className="mx-1 h-6 w-px bg-ink-700" />
      <button title="Zoom in" onClick={props.zoomIn} className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-300 hover:bg-ink-800"><ZoomIn className="h-4 w-4" /></button>
      <button title="Zoom out" onClick={props.zoomOut} className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-300 hover:bg-ink-800"><ZoomOut className="h-4 w-4" /></button>
      <button title="Fit" onClick={props.fit} className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-300 hover:bg-ink-800"><Maximize className="h-4 w-4" /></button>
      <div className="ml-auto flex gap-2">
        <button onClick={props.exportPng} disabled={!props.hasSheet} className="flex items-center gap-1.5 rounded-lg border border-ink-700 px-3 py-2 text-sm text-ink-200 hover:bg-ink-800 disabled:opacity-40">
          <Download className="h-4 w-4" /> PNG
        </button>
        <button onClick={props.exportCsv} disabled={!props.hasSheet} className="flex items-center gap-1.5 rounded-lg border border-ink-700 px-3 py-2 text-sm text-ink-200 hover:bg-ink-800 disabled:opacity-40">
          <Download className="h-4 w-4" /> Schedule
        </button>
      </div>
    </div>
  );
}

function SheetList(props: {
  project: Project; activeId: string | null;
  onSelect: (id: string) => void; onRemove: (id: string) => void;
  onKind: (id: string, k: SheetKind) => void; onRename: (id: string, n: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-500">Drawings</p>
      {props.project.sheets.length === 0 && <p className="px-1 text-xs text-ink-500">None yet.</p>}
      {props.project.sheets.map((s) => (
        <div key={s.id}
          className={`group rounded-xl border p-2 transition-colors ${
            s.id === props.activeId ? "border-amber-600 bg-ink-800" : "border-ink-800 bg-ink-900 hover:border-ink-600"
          }`}>
          <button onClick={() => props.onSelect(s.id)} className="block w-full text-left">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.src} alt={s.name} className="mb-2 h-16 w-full rounded-md object-cover" />
          </button>
          <input value={s.name} onChange={(e) => props.onRename(s.id, e.target.value)}
            className="w-full truncate bg-transparent text-xs font-medium text-ink-100 outline-none" />
          <div className="mt-1 flex items-center gap-1">
            <select value={s.kind} onChange={(e) => props.onKind(s.id, e.target.value as SheetKind)}
              className="flex-1 rounded bg-ink-950 px-1 py-0.5 text-[11px] text-ink-300 outline-none">
              {SHEET_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
            <button onClick={() => props.onRemove(s.id)} title="Remove" className="text-ink-500 hover:text-rose-400"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PropertiesPanel({ selected, patch, onDelete }: {
  selected: Mark | null; patch: (p: Partial<Mark>) => void; onDelete: () => void;
}) {
  if (!selected) {
    return (
      <div className="rounded-2xl border border-ink-800 bg-ink-900 p-4 text-xs text-ink-400">
        Pick the <b className="text-ink-200">Steel</b> tool and drag along a beam line. Select a mark to edit its reference and section.
      </div>
    );
  }
  return (
    <div className="space-y-3 rounded-2xl border border-ink-800 bg-ink-900 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold capitalize text-ink-100">{selected.type}</h3>
        <button onClick={onDelete} className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
      </div>
      {selected.type !== "note" && (
        <label className="block">
          <span className="mb-1 block text-xs text-ink-400">Reference</span>
          <input value={selected.ref ?? ""} onChange={(e) => patch({ ref: e.target.value })}
            className="w-full rounded-lg border border-ink-700 bg-ink-950 px-2.5 py-2 text-sm text-white outline-none focus:border-ink-500" />
        </label>
      )}
      {selected.type !== "note" && (
        <label className="block">
          <span className="mb-1 block text-xs text-ink-400">Section size</span>
          <input list="sections" value={selected.section ?? ""} onChange={(e) => patch({ section: e.target.value })}
            placeholder="e.g. UB 203x133x25"
            className="w-full rounded-lg border border-ink-700 bg-ink-950 px-2.5 py-2 text-sm text-white outline-none focus:border-ink-500" />
          <datalist id="sections">{COMMON_SECTIONS.map((s) => <option key={s} value={s} />)}</datalist>
        </label>
      )}
      <label className="block">
        <span className="mb-1 block text-xs text-ink-400">{selected.type === "note" ? "Text" : "Notes"}</span>
        <textarea value={selected.note ?? ""} onChange={(e) => patch({ note: e.target.value })} rows={2}
          className="w-full resize-none rounded-lg border border-ink-700 bg-ink-950 px-2.5 py-2 text-sm text-white outline-none focus:border-ink-500" />
      </label>
      <div>
        <span className="mb-1 block text-xs text-ink-400">Colour</span>
        <div className="flex gap-1.5">
          {MARK_COLORS.map((c) => (
            <button key={c} onClick={() => patch({ color: c })}
              className={`h-6 w-6 rounded-full border-2 ${selected.color === c ? "border-white" : "border-transparent"}`}
              style={{ background: c }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SchedulePanel({ project, onJump }: {
  project: Project; onJump: (sheetId: string, markId: string) => void;
}) {
  const rows = project.sheets.flatMap((s) =>
    s.marks.filter((m) => m.type !== "note").map((m) => ({ s, m })),
  );
  return (
    <div className="rounded-2xl border border-ink-800 bg-ink-900 p-4">
      <h3 className="mb-2 text-sm font-semibold text-ink-100">Steel schedule <span className="text-ink-500">({rows.length})</span></h3>
      {rows.length === 0 ? (
        <p className="text-xs text-ink-500">Marked steels appear here automatically.</p>
      ) : (
        <div className="max-h-64 space-y-1 overflow-auto">
          {rows.map(({ s, m }) => (
            <button key={m.id} onClick={() => onJump(s.id, m.id)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-ink-800">
              <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: m.color }} />
              <span className="w-10 shrink-0 font-mono text-xs text-white">{m.ref || "—"}</span>
              <span className="flex-1 truncate text-xs text-ink-300">{m.section || (m.type === "column" ? "Column" : "Steel")}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ onUpload }: { onUpload: (f: FileList | null) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <Upload className="h-10 w-10 text-ink-600" />
      <div>
        <p className="font-semibold text-ink-200">Add your drawings to begin</p>
        <p className="mt-1 max-w-xs text-sm text-ink-400">Upload floor plans, elevations or sections as images or PDFs, then mark where the steels go.</p>
      </div>
      <label className="cursor-pointer rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-amber-400">
        Choose files
        <input type="file" accept="image/*,application/pdf" multiple className="hidden"
          onChange={(e) => { onUpload(e.target.files); e.target.value = ""; }} />
      </label>
    </div>
  );
}
