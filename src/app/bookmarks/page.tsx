import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";

import { BookmarksView } from "@/components/bookmarks/bookmarks-view";
import { MobileNav } from "@/components/mobile-nav";
import { Sidebar } from "@/components/sidebar";
import { listBookmarks } from "@/lib/bookmark-store";
import { listBooks } from "@/lib/book-store";
import { getCurrentUser } from "@/lib/current-user";
import { listStories } from "@/lib/story-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bookmarks — ReadVault",
};

export default async function BookmarksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [bookmarks, books, stories] = await Promise.all([
    listBookmarks(user.id),
    listBooks(user.id),
    listStories(user.id),
  ]);

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
          <BookmarksView
            initialBookmarks={bookmarks}
            initialBooks={books}
            initialStories={stories}
          />
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
