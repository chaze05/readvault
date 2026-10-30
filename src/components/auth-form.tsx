"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react";

import { signIn } from "@/actions/auth";

export function AuthForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      const formData = new FormData();
      formData.set("email", email.trim());
      formData.set("password", password);

      const result = await signIn(formData);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      router.push(
        result.mustChangePassword ? "/settings?security=password" : "/library"
      );
      router.refresh();
    } catch {
      setError("Could not reach the authentication service. Please try again.");
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
          <Sparkles className="h-5 w-5 text-brand" />
        </div>
        <h1 className="m-0 text-2xl font-bold text-ink">Welcome back</h1>
        <p className="mb-0 mt-2 text-sm text-muted">
          Sign in to your books and stories.
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          Password
          <span className="relative">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
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

        {error && (
          <p className="m-0 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#274a38] disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Sign in
        </button>
      </form>

      <p className="mb-0 mt-6 text-center text-xs text-muted">
        Accounts are currently invitation-only.
      </p>
    </div>
  );
}
