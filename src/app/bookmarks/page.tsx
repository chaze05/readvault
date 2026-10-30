import Link from "next/link";
import { Bookmark, ArrowLeft } from "lucide-react";
export default function BookmarksPage() {
  return <main className="min-h-screen bg-paper p-8"><Link href="/" className="inline-flex items-center gap-2 text-sm text-brand no-underline"><ArrowLeft size={16}/> Back to library</Link><div className="mx-auto mt-20 max-w-md rounded-3xl border border-line bg-white p-10 text-center"><Bookmark className="mx-auto mb-3 text-brand" size={30}/><h1 className="text-xl font-bold">Bookmarks are coming next</h1><p className="text-sm leading-6 text-muted">We'll add saved pages, highlights, and notes in a later milestone.</p></div></main>;
}
