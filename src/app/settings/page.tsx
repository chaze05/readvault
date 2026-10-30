import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
export default function SettingsPage() {
  return <main className="min-h-screen bg-paper p-8"><Link href="/" className="inline-flex items-center gap-2 text-sm text-brand no-underline"><ArrowLeft size={16}/> Back to library</Link><div className="mx-auto mt-16 max-w-xl rounded-3xl border border-line bg-white p-8"><Settings className="mb-3 text-brand" size={26}/><h1 className="m-0 text-2xl font-bold">Settings</h1><p className="mt-2 text-sm leading-6 text-muted">Account settings, cloud sync, and reading preferences will be added when we introduce authentication and Supabase.</p><div className="mt-6 rounded-xl bg-[#f4f6f1] p-4 text-sm text-[#536452]"><strong>Current mode:</strong> Local desktop library. Your books and PDFs are stored on this computer.</div></div></main>;
}
