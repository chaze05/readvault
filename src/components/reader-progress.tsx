"use client";

import { useState } from "react";
import { Check, Save } from "lucide-react";

export function ReaderProgress({ bookId, initialPage }: { bookId: number; initialPage: number }) {
  const [page, setPage] = useState(String(initialPage));
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true); setSaved(false);
    try {
      const response = await fetch(`/api/books/${bookId}/progress`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPage: Number(page) || 0 })
      });
      if (response.ok) setSaved(true);
    } finally { setBusy(false); }
  }

  return <div className="flex items-center gap-2"><label htmlFor="page-progress" className="text-xs text-muted">Current page</label><input id="page-progress" type="number" min="0" value={page} onChange={e => {setPage(e.target.value);setSaved(false);}} className="w-16 rounded-lg border border-line px-2 py-1.5 text-xs"/><button onClick={() => void save()} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{saved ? <Check size={13}/> : <Save size={13}/>} {busy ? "Saving" : saved ? "Saved" : "Save progress"}</button></div>;
}
