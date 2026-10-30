import Link from "next/link";

import { AuthForm } from "@/components/auth-form";

export const metadata = {
  title: "Sign in — ReadVault",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 flex items-center justify-center gap-2 text-sm font-semibold text-brand no-underline"
        >
          ReadVault
        </Link>
        <AuthForm />
      </div>
    </main>
  );
}
