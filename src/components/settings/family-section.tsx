"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  MailPlus,
  RefreshCw,
  UserPlus,
  X,
} from "lucide-react";

import {
  createFamilyAccountAction,
  generateResetLinkAction,
} from "@/actions/admin";
import { CopyValue } from "@/components/settings/copy-value";

export type FamilyAccountListItem = {
  id: string;
  email: string;
  createdAt: string;
  isAdmin: boolean;
};

type OneTimeResult = {
  kind: "invite" | "temporary_password" | "reset";
  email: string;
  value: string;
};

const RESULT_DETAILS: Record<
  OneTimeResult["kind"],
  { title: string; label: string }
> = {
  invite: {
    title: "Invitation link created",
    label: "Invitation link (expires in 24 hours)",
  },
  temporary_password: {
    title: "Temporary password created",
    label: "Temporary password (shown once)",
  },
  reset: {
    title: "Password reset link created",
    label: "Reset link (expires in 1 hour)",
  },
};

const inputClass =
  "w-full rounded-xl border border-line bg-white px-3 py-3 text-sm text-ink placeholder:text-[#9aa195] outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-60";

function formatCreatedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function FamilySection({
  accounts,
}: {
  accounts: FamilyAccountListItem[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState<"invite" | "temporary_password">(
    "invite"
  );
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [resettingEmail, setResettingEmail] = useState<string | null>(null);
  const [resetError, setResetError] = useState("");
  const [result, setResult] = useState<OneTimeResult | null>(null);

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError("");
    setResult(null);
    setCreating(true);

    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("method", method);
      const response = await createFamilyAccountAction(formData);

      if ("error" in response) {
        setCreateError(response.error);
        return;
      }

      setEmail("");
      setResult({
        kind: response.method,
        email: response.email,
        value:
          response.method === "invite"
            ? response.inviteUrl
            : response.temporaryPassword,
      });
      router.refresh();
    } catch {
      setCreateError("Could not reach the server. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function resetPassword(accountEmail: string) {
    setResetError("");
    setResult(null);
    setResettingEmail(accountEmail);

    try {
      const formData = new FormData();
      formData.set("email", accountEmail);
      const response = await generateResetLinkAction(formData);

      if ("error" in response) {
        setResetError(response.error);
        return;
      }

      setResult({
        kind: "reset",
        email: response.email,
        value: response.resetUrl,
      });
    } catch {
      setResetError("Could not reach the server. Please try again.");
    } finally {
      setResettingEmail(null);
    }
  }

  const resultDetails = result ? RESULT_DETAILS[result.kind] : null;

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h3 className="m-0 text-sm font-bold text-ink">Family accounts</h3>
        <p className="mb-0 mt-1 text-xs leading-5 text-muted">
          Everyone who can sign in to this ReadVault. Reset links expire after
          one hour and work once.
        </p>

        {accounts.length === 0 ? (
          <p className="mb-0 mt-4 rounded-2xl border border-dashed border-line bg-paper p-4 text-sm text-muted">
            No family accounts yet.
          </p>
        ) : (
          <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper p-3"
              >
                <div className="min-w-0">
                  <p className="m-0 break-all text-sm font-semibold text-ink">
                    {account.email}
                  </p>
                  <p className="mb-0 mt-1 text-xs text-muted">
                    Created {formatCreatedAt(account.createdAt)}
                    {account.isAdmin ? " · Administrator" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void resetPassword(account.email)}
                  disabled={resettingEmail !== null}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:border-[#cfe3d6] hover:bg-brand-soft hover:text-brand disabled:opacity-60"
                >
                  {resettingEmail === account.email ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  Reset link
                </button>
              </li>
            ))}
          </ul>
        )}

        {resetError && (
          <p
            role="alert"
            className="mb-0 mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {resetError}
          </p>
        )}
      </div>

      <div className="border-t border-line pt-6">
        <h3 className="m-0 text-sm font-bold text-ink">Add a family account</h3>
        <p className="mb-0 mt-1 text-xs leading-5 text-muted">
          Send an invitation link, or create the account now with a temporary
          password that must be changed at first sign-in.
        </p>

        <form
          onSubmit={createAccount}
          className="mt-4 flex flex-col gap-3 rounded-2xl border border-line bg-paper p-4"
        >
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
            Email address
            <input
              type="email"
              autoComplete="email"
              required
              maxLength={320}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="family@example.com"
              className={inputClass}
              disabled={creating}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
            Account setup
            <select
              value={method}
              onChange={(event) =>
                setMethod(
                  event.target.value === "temporary_password"
                    ? "temporary_password"
                    : "invite"
                )
              }
              className={inputClass}
              disabled={creating}
            >
              <option value="invite">Email invitation link (24 hours)</option>
              <option value="temporary_password">Temporary password</option>
            </select>
          </label>

          <p className="m-0 text-xs leading-5 text-muted">
            {method === "invite"
              ? "The invitation link is shown once and expires in 24 hours."
              : "The temporary password is shown once. The account must choose a new password before using ReadVault."}
          </p>

          {createError && (
            <p
              role="alert"
              className="m-0 rounded-xl bg-red-50 p-3 text-sm text-red-700"
            >
              {createError}
            </p>
          )}

          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#274a38] disabled:opacity-60"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : method === "invite" ? (
              <MailPlus size={16} />
            ) : (
              <UserPlus size={16} />
            )}
            {method === "invite" ? "Create invitation" : "Create account"}
          </button>
        </form>
      </div>

      {result && resultDetails && (
        <div className="rounded-2xl border border-[#cfe3d6] bg-brand-soft p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-sm font-bold text-ink">
                {resultDetails.title}
              </p>
              <p className="mb-0 mt-1 break-all text-xs text-muted">
                {result.email}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setResult(null)}
              aria-label="Dismiss one-time result"
              className="shrink-0 rounded-lg p-1 text-muted transition hover:bg-white hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-3">
            <CopyValue value={result.value} label={resultDetails.label} />
          </div>

          <p className="mb-0 mt-3 text-xs leading-5 text-[#4b5f52]">
            Copy this now. ReadVault does not show it again.
          </p>
        </div>
      )}
    </div>
  );
}
