import { CheckCircle2 } from "lucide-react";

export function AccountSummary({ email }: { email: string }) {
  const initial = email.trim().charAt(0).toUpperCase() || "R";

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-paper p-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-bold text-white">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-xs font-bold uppercase tracking-[.16em] text-muted">
          Signed in as
        </p>
        <p className="m-0 mt-1 break-all text-sm font-semibold text-ink">
          {email}
        </p>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
        <CheckCircle2 size={14} />
        Active session
      </span>
    </div>
  );
}
