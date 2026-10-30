"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";

import { setPasswordWithTokenAction } from "@/actions/account-tokens";

type SetPasswordFormProps = {
  token: string;
  purpose: "password_reset" | "account_invite";
  title: string;
};

export function SetPasswordForm({
  token,
  purpose,
  title,
}: SetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const formData = new FormData();
    formData.set("token", token);
    formData.set("purpose", purpose);
    formData.set("password", password);
    formData.set("confirmPassword", confirmPassword);

    try {
      const result = await setPasswordWithTokenAction(formData);

      if ("error" in result) {
        setError(result.error);
      }
    } finally {
      setPending(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-line bg-white px-3 py-3 text-sm text-ink placeholder:text-[#9aa195] outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15";

  return (
    <div className="w-full max-w-md rounded-3xl border border-line bg-white p-8 shadow-soft">
      <div className="mb-7 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft">
          <KeyRound className="h-5 w-5 text-brand" />
        </div>
        <h1 className="m-0 text-2xl font-bold text-ink">{title}</h1>
        <p className="mb-0 mt-2 text-sm text-muted">
          This link can only be used once.
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          New password
          <span className="relative">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={200}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              className={`${inputClass} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </span>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          Confirm new password
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={200}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repeat your password"
            className={inputClass}
          />
        </label>

        {error && (
          <p role="alert" className="m-0 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#274a38] disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save password
        </button>
      </form>

      <p className="mb-0 mt-6 text-center text-xs text-muted">
        <Link href="/login" className="font-semibold text-brand no-underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
