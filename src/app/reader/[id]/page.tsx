import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";

import { PdfReader } from "@/components/pdf-reader";
import { getBook } from "@/lib/book-store";
import { requireActiveUser } from "@/lib/current-user";
import { getPreferences } from "@/lib/preferences";
import { isUuid } from "@/lib/uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ReaderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireActiveUser();
  if (!user) redirect("/login");

  const { id } = await params;
  if (!isUuid(id)) notFound();

  const book = await getBook(user.id, id);
  if (!book) notFound();

  const preferences = await getPreferences(user.id);

  return (
    <main className="min-h-screen bg-[#f7f8f4]">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white/95 px-5 py-4 backdrop-blur">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-ink no-underline"
        >
          <ArrowLeft size={17} /> Back to library
        </Link>
        <div className="text-right">
          <p className="m-0 text-sm font-bold">{book.title}</p>
          <p className="m-0 mt-0.5 text-[11px] text-muted">{book.author}</p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-7">
        {book.hasFile ? (
          <>
            <PdfReader
              bookId={book.id}
              fileUrl={book.fileUrl}
              initialPage={book.currentPage}
              initialTotalPages={book.totalPages}
              initialZoom={preferences.pdfZoom / 100}
              title={book.title}
            />
            <p className="mt-3 text-center text-[11px] text-muted">
              Opened PDFs are cached for offline reading. Add ReadVault to your
              Home Screen for the full app experience.
            </p>
          </>
        ) : (
          <div className="mx-auto mt-16 max-w-lg rounded-3xl border border-line bg-white p-9 text-center shadow-soft">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand">
              <BookOpen size={25} />
            </div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand">
              No document attached
            </p>
            <h1 className="m-0 text-2xl font-bold">{book.title}</h1>
            <p className="mb-5 mt-2 text-sm text-muted">{book.author}</p>
            <p className="mb-6 text-sm leading-6 text-muted">
              Upload a PDF to attach a document and read it here.
            </p>
            <Link
              href="/"
              className="inline-flex rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white no-underline"
            >
              Return to library
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
