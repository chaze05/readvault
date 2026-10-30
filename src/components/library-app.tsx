"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Upload, BookOpen, BookCheck, Library, ArrowUpRight, Trash2, Sparkles } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { BookCover } from "@/components/book-cover";
import { UploadDialog } from "@/components/upload-dialog";
import type { Book } from "@/lib/types";

const statusLabel = (status: Book["status"]) => status === "reading" ? "Currently reading" : status === "completed" ? "Completed" : "Not started";

export function LibraryApp({ mode = "overview" }: { mode?: "overview" | "library" }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All books");
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadBooks() {
    try {
      setError("");
      const response = await fetch("/api/books", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load your library.");
      setBooks(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void loadBooks(); }, []);

  const categories = useMemo(() => ["All books", ...Array.from(new Set(books.map(b => b.category))).sort()], [books]);
  const filtered = useMemo(() => books.filter(book => {
    const matchesQuery = `${book.title} ${book.author} ${book.category}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (category === "All books" || book.category === category);
  }), [books, query, category]);

  const reading = books.filter(b => b.status === "reading");
  const completed = books.filter(b => b.status === "completed");
  const progress = books.length ? Math.round(completed.length / books.length * 100) : 0;

  async function deleteBook(book: Book) {
    if (!window.confirm(`Delete "${book.title}" and its uploaded PDF?`)) return;
    const response = await fetch(`/api/books/${book.id}`, { method: "DELETE" });
    if (response.ok) await loadBooks();
    else setError("Could not delete this book.");
  }

  return (
    <div className="app-shell">
      <Sidebar/>
      <main className="main-area">
        <div className="mobile-topbar items-center justify-between border-b border-line bg-white px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-ink no-underline"><span className="brand-mark !h-8 !w-8 !rounded-lg"><BookOpen size={17}/></span>ReadVault</Link>
          <button onClick={() => setShowUpload(true)} className="rounded-xl bg-brand p-2.5 text-white" aria-label="Upload PDF"><Upload size={17}/></button>
        </div>
        <div className="main-inner">
          <header className="mb-9 flex flex-wrap items-center justify-between gap-4">
            <div><p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-brand">{mode === "library" ? "Your collection" : "Personal reading space"}</p><h1 className="m-0 text-3xl font-bold tracking-tight text-ink">{mode === "library" ? "My Library" : "Good morning, reader."}</h1><p className="mb-0 mt-2 text-sm text-muted">{mode === "library" ? "Find and manage the books in your collection." : "A little progress each day adds up to a lot."}</p></div>
            <div className="flex items-center gap-3">
              <div className="relative hidden sm:block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa195]" size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search your library..." className="w-60 rounded-xl border border-line bg-white py-3 pl-9 pr-3 text-sm outline-none focus:border-brand"/></div>
              <button onClick={() => setShowUpload(true)} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#274a38]"><Upload size={16}/> <span>Upload PDF</span></button>
            </div>
          </header>

          {error && <div className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {mode === "overview" && <>
            <section className="mb-9 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: "Total books", value: books.length, icon: Library, hint: "In your collection" },
                { label: "Currently reading", value: reading.length, icon: BookOpen, hint: "Pick up where you left off" },
                { label: "Completed", value: completed.length, icon: BookCheck, hint: "Books finished" },
                { label: "Library progress", value: `${progress}%`, icon: Sparkles, hint: "Completion rate" },
              ].map(({label,value,icon:Icon,hint}) => <div className="stat-card" key={label}><div className="mb-4 flex items-center justify-between"><span className="text-xs font-semibold text-muted">{label}</span><span className="rounded-lg bg-brand-soft p-2 text-brand"><Icon size={17}/></span></div><div className="text-3xl font-bold tracking-tight">{value}</div><p className="mb-0 mt-1 text-[11px] text-muted">{hint}</p></div>)}
            </section>

            <section className="mb-10">
              <div className="mb-4 flex items-center justify-between"><div><h2 className="m-0 text-lg font-bold">Continue reading</h2><p className="mb-0 mt-1 text-xs text-muted">Your reading journey, right where you left it.</p></div><Link href="/library" className="text-xs font-bold text-brand no-underline hover:underline">View library <ArrowUpRight className="ml-1 inline" size={13}/></Link></div>
              {reading.length ? <div className="grid gap-4 md:grid-cols-2">{reading.map(book => <div key={book.id} className="flex gap-4 rounded-2xl border border-line bg-white p-4 shadow-soft"><div className="w-24 shrink-0"><BookCover title={book.title} author={book.author} color={book.coverColor} compact/></div><div className="flex min-w-0 flex-1 flex-col justify-center"><span className="text-[10px] font-bold uppercase tracking-widest text-brand">{book.category}</span><h3 className="mb-1 mt-2 text-base font-bold">{book.title}</h3><p className="m-0 text-xs text-muted">{book.author}</p><div className="mt-4 flex items-center justify-between text-[11px] text-muted"><span>Page {book.currentPage}{book.totalPages ? ` of ${book.totalPages}` : ""}</span><span>{book.totalPages ? Math.round(book.currentPage / book.totalPages * 100) : "In progress" }{book.totalPages ? "%" : ""}</span></div><div className="progress-track mt-2"><div className="progress-fill" style={{width: `${book.totalPages ? Math.min(100, book.currentPage / book.totalPages * 100) : 14}%`}}/></div><Link href={`/reader/${book.id}`} className="mt-3 text-xs font-bold text-brand no-underline">Continue reading →</Link></div></div>)}</div> : <div className="rounded-2xl border border-dashed border-[#d6ded3] bg-white p-7 text-center"><BookOpen className="mx-auto mb-2 text-brand" size={24}/><p className="m-0 text-sm font-semibold">Your reading list is waiting</p><p className="mb-0 mt-1 text-xs text-muted">Upload a PDF to start reading.</p></div>}
            </section>
          </>}

          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="m-0 text-lg font-bold">{mode === "library" ? "All books" : "Your library"}</h2><p className="mb-0 mt-1 text-xs text-muted">{books.length} {books.length === 1 ? "book" : "books"} in your personal collection</p></div><div className="relative sm:hidden"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa195]" size={15}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search books..." className="w-44 rounded-xl border border-line bg-white py-2.5 pl-9 pr-2 text-xs outline-none"/></div></div>
            <div className="mb-5 flex flex-wrap gap-2">{categories.map(item => <button key={item} onClick={() => setCategory(item)} className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${category === item ? "bg-brand text-white" : "border border-line bg-white text-muted hover:border-brand hover:text-brand"}`}>{item}</button>)}</div>
            {loading ? <div className="py-16 text-center text-sm text-muted">Loading your library...</div> : filtered.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">{filtered.map(book => <article key={book.id} className="book-card group overflow-hidden rounded-2xl border border-line bg-white p-3 shadow-[0_3px_14px_rgba(31,47,34,.025)]"><Link href={`/reader/${book.id}`} className="block no-underline"><BookCover title={book.title} author={book.author} color={book.coverColor}/><div className="px-1 pb-1 pt-4"><div className="mb-2 flex items-center justify-between gap-2"><span className="truncate text-[10px] font-bold uppercase tracking-wider text-brand">{book.category}</span><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{background: book.status === "reading" ? "#6c9b72" : book.status === "completed" ? "#8d9c67" : "#d4d9d0"}}/></div><h3 className="mb-1 line-clamp-2 min-h-10 text-sm font-bold leading-5 text-ink">{book.title}</h3><p className="m-0 truncate text-[11px] text-muted">{book.author}</p><div className="mt-3 flex items-center justify-between border-t border-line pt-3"><span className="text-[10px] text-muted">{statusLabel(book.status)}</span><ArrowUpRight size={14} className="text-muted"/></div></div></Link><div className="mt-1 flex justify-end"><button onClick={() => void deleteBook(book)} className="rounded-lg p-1.5 text-[#a0a69b] opacity-70 hover:bg-red-50 hover:text-red-600" title="Delete book"><Trash2 size={13}/></button></div></article>)}</div> : <div className="rounded-2xl border border-dashed border-[#d6ded3] bg-white px-5 py-14 text-center"><BookOpen className="mx-auto mb-3 text-brand" size={28}/><h3 className="m-0 text-base font-bold">{books.length ? "No matching books" : "Your library is empty"}</h3><p className="mb-4 mt-2 text-sm text-muted">{books.length ? "Try a different search or category." : "Upload your first PDF and build your personal reading space."}</p>{!books.length && <button onClick={() => setShowUpload(true)} className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white">Upload your first book</button>}</div>}
          </section>
          <footer className="mt-14 border-t border-line pt-5 text-center text-[11px] text-[#9aa195]">ReadVault · Your personal digital library</footer>
        </div>
      </main>
      {showUpload && <UploadDialog onClose={() => setShowUpload(false)} onUploaded={() => void loadBooks()}/>}
    </div>
  );
}
