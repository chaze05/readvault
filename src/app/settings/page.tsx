import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  Database,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  UsersRound,
} from "lucide-react";

import { MobileNav } from "@/components/mobile-nav";
import { AccountSummary } from "@/components/settings/account-summary";
import { DataForm } from "@/components/settings/data-form";
import { FamilySection } from "@/components/settings/family-section";
import { ReadingForm } from "@/components/settings/reading-form";
import { SecurityForm } from "@/components/settings/security-form";
import { SettingsSection } from "@/components/settings/settings-section";
import { Sidebar } from "@/components/sidebar";
import { listFamilyAccounts } from "@/lib/admin-accounts";
import { getCurrentUser } from "@/lib/current-user";
import { getPreferences } from "@/lib/preferences";
import { getSession } from "@/lib/session-cookies";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings — ReadVault",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    const session = await getSession();
    redirect(session ? "/login?expired=1" : "/login");
  }

  const preferences = await getPreferences(user.id);
  const familyAccounts = user.isAdmin
    ? (await listFamilyAccounts()).map((account) => ({
        id: account.id,
        email: account.email,
        createdAt: new Date(account.createdAt).toISOString(),
        isAdmin: account.isAdmin,
      }))
    : [];

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main-area">
        <div className="mobile-topbar items-center justify-between border-b border-line bg-white px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-ink no-underline"
          >
            <span className="brand-mark !h-8 !w-8 !rounded-lg">
              <BookOpen size={17} />
            </span>
            ReadVault
          </Link>
        </div>

        <div className="main-inner">
          <div className="mx-auto max-w-3xl">
            <header className="mb-8">
              <p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-brand">
                Your account
              </p>
              <h1 className="m-0 text-3xl font-bold tracking-tight text-ink">
                Settings
              </h1>
              <p className="mb-0 mt-2 text-sm text-muted">
                Manage your sign-in details, security, and reading
                preferences.
              </p>
            </header>

            <div className="flex flex-col gap-6">
              <SettingsSection
                title="Account"
                description="The email address you use to sign in to ReadVault."
                icon={<UserRound size={20} />}
              >
                <AccountSummary email={user.email} />
              </SettingsSection>

              <SettingsSection
                title="Security"
                description="Change your password or end every active session."
                icon={<ShieldCheck size={20} />}
              >
                <SecurityForm mustChangePassword={user.mustChangePassword} />
              </SettingsSection>

              <SettingsSection
                title="Reading"
                description="Set how PDFs and Story Time pages open for you."
                icon={<SlidersHorizontal size={20} />}
              >
                <ReadingForm initialPreferences={preferences} />
              </SettingsSection>

              <SettingsSection
                title="Data"
                description="Export a copy of your data or permanently remove it."
                icon={<Database size={20} />}
              >
                <DataForm email={user.email} />
              </SettingsSection>

              {user.isAdmin && (
                <SettingsSection
                  title="Family"
                  description="Create accounts for your family and issue one-time reset links."
                  icon={<UsersRound size={20} />}
                >
                  <FamilySection accounts={familyAccounts} />
                </SettingsSection>
              )}
            </div>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
