// Saved-designs store: persists beam/column calc sheets to the browser so a
// whole job can be assembled and printed as one PDF.

import { SheetGroup } from "@/components/sitecalc/CalcSheet";

export interface SavedMember {
  id: string;
  kind: "beam" | "column";
  title: string;     // e.g. "305×165×40 UB"
  subtitle: string;
  ref: string;       // member reference within the job, e.g. "B1"
  groups: SheetGroup[];
  savedAt: number;
}

const KEY = "sitecalc.job.v1";

export function loadMembers(): SavedMember[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as SavedMember[];
  } catch {
    return [];
  }
}

function persist(members: SavedMember[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(members));
    return true;
  } catch {
    return false;
  }
}

export function saveMember(m: Omit<SavedMember, "id" | "savedAt">): SavedMember[] {
  const members = loadMembers();
  members.push({ ...m, id: `mem_${Date.now().toString(36)}`, savedAt: Date.now() });
  persist(members);
  return members;
}

export function removeMember(id: string): SavedMember[] {
  const members = loadMembers().filter((m) => m.id !== id);
  persist(members);
  return members;
}

export function clearMembers(): SavedMember[] {
  persist([]);
  return [];
}
