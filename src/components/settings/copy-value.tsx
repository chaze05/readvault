"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

type CopyValueProps = {
  value: string;
  label?: string;
};

export function CopyValue({ value, label }: CopyValueProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="text-xs font-bold uppercase tracking-[.16em] text-muted">
          {label}
        </span>
      )}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white p-2">
        <code className="min-w-0 flex-1 break-all px-2 py-1 text-xs text-ink">
          {value}
        </code>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink transition hover:bg-brand-soft hover:text-brand"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
