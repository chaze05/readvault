"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Loader2,
  ShieldAlert,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import {
  deleteAccountAction,
  deleteAllContentAction,
} from "@/actions/settings";

const inputClass =
  "w-full rounded-xl border border-line bg-white px-3 py-3 text-sm text-ink placeholder:text-[#9aa195] outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-60";

function exportFileName(response: Response): string {
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return (
    match?.[1] ??
    `readvault-export-${new Date().toISOString().slice(0, 10)}.json`
  );
}

export function DataForm({ email }: { email: string }) {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const [confirmingContentDelete, setConfirmingContentDelete] = useState(false);
  const [contentConfirmation, setContentConfirmation] = useState("");
  const [deletingContent, setDeletingContent] = useState(false);
  const [contentError, setContentError] = useState("");
  const [contentMessage, setContentMessage] = useState("");

  const [confirmingAccountDelete, setConfirmingAccountDelete] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountConfirmation, setAccountConfirmation] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [accountError, setAccountError] = useState("");

  async function exportData() {
    setExportError("");
    setExporting(true);

    try {
      const response = await fetch("/api/settings/export", {
        cache: "no-store",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setExportError(
          body?.error ?? "Could not export your data. Please try again."
        );
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = exportFileName(response);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("Could not reach the server. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  async function deleteContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContentError("");
    setContentMessage("");
    setDeletingContent(true);

    try {
      const formData = new FormData();
      formData.set("confirmation", contentConfirmation);
      const result = await deleteAllContentAction(formData);

      if ("error" in result) {
        setContentError(result.error);
        return;
      }

      setContentMessage(
        `Deleted ${result.deletedBooks} book${
          result.deletedBooks === 1 ? "" : "s"
        } and ${result.deletedStories} stor${
          result.deletedStories === 1 ? "y" : "ies"
        }.`
      );
      setConfirmingContentDelete(false);
      setContentConfirmation("");
      router.refresh();
    } catch {
      setContentError("Could not reach the server. Please try again.");
    } finally {
      setDeletingContent(false);
    }
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountError("");
    setDeletingAccount(true);

    try {
      const formData = new FormData();
      formData.set("email", accountEmail);
      formData.set("password", accountPassword);
      formData.set("confirmation", accountConfirmation);
      const result = await deleteAccountAction(formData);

      if ("error" in result) {
        setAccountError(result.error);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setAccountError("Could not reach the server. Please try again.");
    } finally {
      setDeletingAccount(false);
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h3 className="m-0 text-sm font-bold text-ink">Export your data</h3>
        <p className="mb-0 mt-1 text-xs leading-5 text-muted">
          Download your account details, reading preferences, book metadata,
          and Story Time pages as a JSON file.
        </p>
        <button
          type="button"
          onClick={() => void exportData()}
          disabled={exporting}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#274a38] disabled:opacity-60"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download size={16} />
          )}
          Export JSON
        </button>
        {exportError && (
          <p
            role="alert"
            className="mb-0 mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {exportError}
          </p>
        )}
      </div>

      <div className="border-t border-line pt-6">
        <h3 className="m-0 text-sm font-bold text-ink">Delete all content</h3>
        <p className="mb-0 mt-1 text-xs leading-5 text-muted">
          Remove every book and Story Time story, including their stored files.
          Your account and reading preferences stay.
        </p>

        {contentMessage && (
          <p
            role="status"
            className="mb-0 mt-3 rounded-xl bg-brand-soft p-3 text-sm font-semibold text-brand"
          >
            {contentMessage}
          </p>
        )}

        {confirmingContentDelete ? (
          <form
            onSubmit={deleteContent}
            className="mt-4 rounded-2xl border border-[#e2c8ba] bg-[#fbf2ec] p-4"
          >
            <p className="m-0 flex items-start gap-2 text-sm leading-6 text-[#6f3a28]">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              This permanently deletes all of your books and stories. It cannot
              be undone.
            </p>
            <label className="mt-3 flex flex-col gap-1.5 text-sm font-medium text-[#6f3a28]">
              Type DELETE to confirm
              <input
                type="text"
                value={contentConfirmation}
                onChange={(event) =>
                  setContentConfirmation(event.target.value)
                }
                placeholder="DELETE"
                autoComplete="off"
                className={inputClass}
                disabled={deletingContent}
              />
            </label>
            {contentError && (
              <p
                role="alert"
                className="mb-0 mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700"
              >
                {contentError}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={deletingContent || contentConfirmation !== "DELETE"}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8a4b2f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#743d26] disabled:opacity-60"
              >
                {deletingContent ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                Delete all content
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmingContentDelete(false);
                  setContentConfirmation("");
                  setContentError("");
                }}
                disabled={deletingContent}
                className="inline-flex items-center justify-center rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-paper disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              setContentError("");
              setContentMessage("");
              setConfirmingContentDelete(true);
            }}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-[#8a4b2f] transition hover:border-[#d8c2b4] hover:bg-[#fbf2ec]"
          >
            <Trash2 size={16} />
            Delete all content
          </button>
        )}
      </div>

      <div className="border-t border-line pt-6">
        <h3 className="m-0 text-sm font-bold text-ink">Delete account</h3>
        <p className="mb-0 mt-1 text-xs leading-5 text-muted">
          Permanently remove your account, books, stories, preferences, and
          sign-in sessions. This cannot be undone.
        </p>

        {confirmingAccountDelete ? (
          <form
            onSubmit={deleteAccount}
            className="mt-4 rounded-2xl border border-[#e6c7c2] bg-[#fdf0ee] p-4"
          >
            <p className="m-0 flex items-start gap-2 text-sm leading-6 text-[#7b2f23]">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              Deleting your account also deletes every book, story, and stored
              file. There is no recovery.
            </p>

            <label className="mt-3 flex flex-col gap-1.5 text-sm font-medium text-[#7b2f23]">
              Type your email address
              <input
                type="email"
                autoComplete="email"
                required
                maxLength={320}
                value={accountEmail}
                onChange={(event) => setAccountEmail(event.target.value)}
                placeholder={email}
                className={inputClass}
                disabled={deletingAccount}
              />
            </label>

            <label className="mt-3 flex flex-col gap-1.5 text-sm font-medium text-[#7b2f23]">
              Current password
              <input
                type="password"
                autoComplete="current-password"
                required
                maxLength={200}
                value={accountPassword}
                onChange={(event) => setAccountPassword(event.target.value)}
                placeholder="Your current password"
                className={inputClass}
                disabled={deletingAccount}
              />
            </label>

            <label className="mt-3 flex flex-col gap-1.5 text-sm font-medium text-[#7b2f23]">
              Type DELETE to confirm
              <input
                type="text"
                value={accountConfirmation}
                onChange={(event) =>
                  setAccountConfirmation(event.target.value)
                }
                placeholder="DELETE"
                autoComplete="off"
                className={inputClass}
                disabled={deletingAccount}
              />
            </label>

            {accountError && (
              <p
                role="alert"
                className="mb-0 mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700"
              >
                {accountError}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={deletingAccount || accountConfirmation !== "DELETE"}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#9b3a2c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#832f23] disabled:opacity-60"
              >
                {deletingAccount ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                Delete my account
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmingAccountDelete(false);
                  setAccountEmail("");
                  setAccountPassword("");
                  setAccountConfirmation("");
                  setAccountError("");
                }}
                disabled={deletingAccount}
                className="inline-flex items-center justify-center rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-paper disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              setAccountError("");
              setConfirmingAccountDelete(true);
            }}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-[#e6c7c2] bg-white px-4 py-2.5 text-sm font-semibold text-[#9b3a2c] transition hover:bg-[#fdf0ee]"
          >
            <ShieldAlert size={16} />
            Delete account
          </button>
        )}
      </div>
    </div>
  );
}
