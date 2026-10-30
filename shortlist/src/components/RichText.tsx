"use client";

import Link from "next/link";
import type { ReactNode } from "react";

// Minimal, safe markdown for coach answers: paragraphs, "- " and "1. " lists,
// **bold**, _italic_ and [links](/internal-or-https). No HTML is ever injected.
export default function RichText({ text, onNavigate }: { text: string; onNavigate?: () => void }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={blocks.length} className={`${list.ordered ? "list-decimal" : "list-disc"} space-y-1 pl-5 marker:text-ink-500`}>
        {list.items.map((it, i) => (
          <li key={i}>{inline(it, onNavigate)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const ul = line.match(/^\s*[-•*]\s+(.*)$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      const ordered = Boolean(ol);
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push((ul ?? ol)![1]);
      continue;
    }
    flush();
    if (!line.trim()) continue;
    blocks.push(<p key={blocks.length}>{inline(line.replace(/^#+\s*/, ""), onNavigate)}</p>);
  }
  flush();
  return <div className="space-y-2 leading-relaxed">{blocks}</div>;
}

function inline(s: string, onNavigate?: () => void): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\)|_[^_]+_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(<strong key={out.length} className="font-semibold text-white">{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("_")) out.push(<em key={out.length} className="text-ink-400">{tok.slice(1, -1)}</em>);
    else {
      const [, label, href] = tok.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)!;
      if (href.startsWith("/")) {
        out.push(
          <Link key={out.length} href={href} onClick={onNavigate} className="font-medium text-rose-300 underline decoration-rose-500/40 underline-offset-2 hover:text-rose-200">
            {label}
          </Link>,
        );
      } else if (/^https:\/\//.test(href)) {
        out.push(
          <a key={out.length} href={href} target="_blank" rel="noreferrer" className="font-medium text-rose-300 underline underline-offset-2">
            {label}
          </a>,
        );
      } else out.push(label);
    }
    last = m.index + tok.length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}
