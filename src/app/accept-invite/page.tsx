import Link from "next/link";

import { SetPasswordForm } from "@/components/auth/set-password-form";
import { findAccountToken } from "@/lib/account-tokens";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Accept invitation — ReadVault",
};

const INVALID_LINK_ERROR =
  "This link is invalid or has expired. Ask an administrator for a new link.";

type AcceptInvitePageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function AcceptInvitePage({
  searchParams,
}: AcceptInvitePageProps) {
  const { token } = await searchParams;
  const rawToken = typeof token === "string" ? token : "";
  const account = rawToken
    ? await findAccountToken(rawToken, "account_invite")
    : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 flex items-center justify-center gap-2 text-sm font-semibold text-brand no-underline"
        >
          ReadVault
        </Link>
        {account ? (
          <SetPasswordForm
            token={rawToken}
            purpose="account_invite"
            title="Welcome to ReadVault — choose your password"
          />
        ) : (
          <div className="w-full rounded-3xl border border-line bg-white p-8 shadow-soft">
            <h1 className="m-0 text-2xl font-bold text-ink">Link unavailable</h1>
            <p className="mb-0 mt-3 text-sm leading-6 text-muted">
              {INVALID_LINK_ERROR}
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex text-sm font-semibold text-brand no-underline"
            >
              Back to sign in
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
