"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { changePasswordAction, signOutAllAction } from "@/actions/settings";
import { clearClientSessionData } from "@/lib/client-session-cleanup";

export function SecurityForm({
  mustChangePassword = false,
}: {
  mustChangePassword?: boolean;
}) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirmSignOutAll, setConfirmSignOutAll] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setPending(true);

    try {
      const formData = new FormData();
      formData.set("currentPassword", currentPassword);
      formData.set("newPassword", newPassword);
      formData.set("confirmPassword", confirmPassword);

      const result = await changePasswordAction(formData);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      router.push("/library");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function signOutEverywhere() {
    setError("");
    setSigningOutAll(true);

    try {
      await clearClientSessionData();
      const result = await signOutAllAction();

      if (result && "error" in result) {
        setSigningOutAll(false);
        setConfirmSignOutAll(false);
        setError(result.error);
      }
    } catch {
      setSigningOutAll(false);
      setConfirmSignOutAll(false);
      setError("Could not sign out all devices. Please try again.");
    }
  }

  const inputClass =
    "w-full rounded-xl border border-line bg-white px-3 py-3 text-sm text-ink placeholder:text-[#9aa195] outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-60";
  const passwordType = showPasswords ? "text" : "password";

  return (
    <div className="flex flex-col gap-7">
      {mustChangePassword && (
        <div className="flex items-start gap-3 rounded-2xl border border-[#eadfbe] bg-[#fbf6e9] p-4 text-sm text-[#6d5a2f]">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="m-0 leading-6">
            <strong className="font-semibold">
              Choose a new password to continue.
            </strong>{" "}
            You signed in with a temporary password, so the rest of ReadVault
            stays locked until you set your own.
          </p>
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="m-0 text-sm font-bold text-ink">Change password</h3>
            <p className="mb-0 mt-1 text-xs leading-5 text-muted">
              Confirm your current password, then choose a new one.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPasswords((value) => !value)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-muted transition hover:bg-paper hover:text-ink"
          >
            {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPasswords ? "Hide" : "Show"}
          </button>
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          Current password
          <input
            type={passwordType}
            autoComplete="current-password"
            required
            maxLength={200}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder="Your current password"
            className={inputClass}
            disabled={pending}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          New password
          <input
            type={passwordType}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={200}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="At least 8 characters"
            className={inputClass}
            disabled={pending}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          Confirm new password
          <input
            type={passwordType}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={200}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repeat your new password"
            className={inputClass}
            disabled={pending}
          />
        </label>

        {error && (
          <p
            role="alert"
            className="m-0 rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#274a38] disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck size={16} />
          )}
          Update password
        </button>
      </form>

      <div className="border-t border-line pt-6">
        <h3 className="m-0 text-sm font-bold text-ink">
          Sign out all devices
        </h3>
        <p className="mb-0 mt-1 text-xs leading-5 text-muted">
          End every active session, including this one. Your password stays the
          same.
        </p>

        {confirmSignOutAll ? (
          <div className="mt-4 rounded-2xl border border-[#eadfbe] bg-[#fbf6e9] p-4">
            <p className="m-0 text-sm leading-6 text-[#6d5a2f]">
              This will sign you out on every device, including this browser.
              You will need your password to sign back in.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void signOutEverywhere()}
                disabled={signingOutAll}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8a4b2f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#743d26] disabled:opacity-60"
              >
                {signingOutAll ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut size={16} />
                )}
                Yes, sign out everywhere
              </button>
              <button
                type="button"
                onClick={() => setConfirmSignOutAll(false)}
                disabled={signingOutAll}
                className="inline-flex items-center justify-center rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-paper disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setError("");
              setConfirmSignOutAll(true);
            }}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-[#d8c2b4] hover:bg-[#fbf6e9]"
          >
            <LogOut size={16} />
            Sign out all devices
          </button>
        )}
      </div>
    </div>
  );
}
