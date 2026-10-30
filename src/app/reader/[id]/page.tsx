import Link from "next/link";
import { ArrowLeft, BookOpen, FileText } from "lucide-react";
import { getDb, rowToBook } from "@/lib/db";
import { ReaderProgress } from "@/components/reader-progress";
import { notFound } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  const row = db.prepare("SELECT * FROM books WHERE id = ?").get(Number(id)) as Record<string, unknown> | undefined;
  if (!row) notFound();
  const book = rowToBook(row);

  return (
    <main className="min-h-screen bg-[#f7f8f4]">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white/95 px-5 py-4 backdrop-blur">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-ink no-underline"><ArrowLeft size={17}/> Back to library</Link>
        <div className="text-right"><p className="m-0 text-sm font-bold">{book.title}</p><p className="m-0 mt-0.5 text-[11px] text-muted">{book.author}</p></div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-7">
        {book.hasFile ? (
          <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted"><FileText size={15}/> PDF reader</div>
              <ReaderProgress bookId={book.id} initialPage={book.currentPage}/>
            </div>
            <iframe title={`PDF reader: ${book.title}`} src={`/api/books/${book.id}/file`} className="h-[calc(100vh-150px)] min-h-[650px] w-full bg-[#e8ebe4]"/>
          </div>
        ) : (
          <div className="mx-auto mt-16 max-w-lg rounded-3xl border border-line bg-white p-9 text-center shadow-soft">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand"><BookOpen size={25}/></div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand">Sample library entry</p>
            <h1 className="m-0 text-2xl font-bold">{book.title}</h1>
            <p className="mb-5 mt-2 text-sm text-muted">{book.author}</p>
            <p className="mb-6 text-sm leading-6 text-muted">This sample book is included to demonstrate the library. Upload your own PDF to attach a document and read it here.</p>
            <Link href="/" className="inline-flex rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white no-underline">Return to library</Link>
          </div>
        )}
      </div>
    </main>
  );
}
