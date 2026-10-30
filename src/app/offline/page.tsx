import Link from "next/link";
import { BookOpen, WifiOff } from "lucide-react";

export const metadata = {
  title: "Offline — ReadVault",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-5 py-12">
      <div className="w-full max-w-md rounded-3xl border border-line bg-white p-9 text-center shadow-soft">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand">
          <WifiOff size={25} />
        </div>
        <h1 className="m-0 text-2xl font-bold">You are offline</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          ReadVault can still open the app shell. Books you have opened while
          online are cached for offline reading.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white no-underline hover:bg-[#274a38]"
        >
          <BookOpen size={16} /> Back to my library
        </Link>
      </div>
    </main>
  );
}
