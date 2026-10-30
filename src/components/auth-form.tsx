"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react";

import { signIn, signUp } from "@/actions/auth";

type Mode = "signin" | "signup";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      const formData = new FormData();
      formData.set("email", email.trim());
      formData.set("password", password);

      const result =
        mode === "signin" ? await signIn(formData) : await signUp(formData);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      router.push("/library");
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
        <h1 className="m-0 text-2xl font-bold text-ink">
          {mode === "signin" ? "Welcome back" : "Create your library"}
        </h1>
        <p className="mb-0 mt-2 text-sm text-muted">
          {mode === "signin"
            ? "Sign in to your books and stories."
            : "One account for your books, stories, and reading progress."}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 rounded-xl border border-line bg-paper p-1 text-sm">
        <button
          type="button"
          onClick={() => switchMode("signin")}
          className={`rounded-lg px-3 py-2 font-semibold transition ${
            mode === "signin" ? "bg-white text-ink shadow-sm" : "text-muted"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => switchMode("signup")}
          className={`rounded-lg px-3 py-2 font-semibold transition ${
            mode === "signup" ? "bg-white text-ink shadow-sm" : "text-muted"
          }`}
        >
          Sign up
        </button>
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
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={8}
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
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mb-0 mt-6 text-center text-xs text-muted">
        Books, stories, and reading progress stay private to your account.
      </p>
    </div>
  );
}
