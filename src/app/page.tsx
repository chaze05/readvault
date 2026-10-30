import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Cloud,
  Download,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <span className="brand-mark !h-8 !w-8 !rounded-lg">
              <BookOpen size={17} />
            </span>
            <span className="text-sm font-bold tracking-tight text-ink">ReadVault</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/login" className="font-semibold text-muted no-underline hover:text-ink">
              Sign in
            </Link>
            <Link
              href="/login"
              className="rounded-xl bg-brand px-4 py-2.5 font-semibold text-white no-underline hover:bg-[#274a38]"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto flex max-w-4xl flex-col items-center px-4 pb-16 pt-20 text-center sm:px-6 sm:pt-28">
          <p className="mb-5 rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-muted">
            A quiet home for books and stories
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Your books. Your stories.
            <span className="block text-brand">Your quiet corner.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg">
            ReadVault keeps your PDF library and family storybooks together.
            Read, resume, and create — at home or on your phone, even offline.
          </p>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white no-underline hover:bg-[#274a38]"
            >
              Start your library
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-6 py-3 text-sm font-semibold text-muted no-underline hover:border-brand hover:text-brand"
            >
              I already have an account
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted">
            Free to start. Your library is private to your account.
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded-3xl border border-line bg-white p-7 shadow-soft">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft">
                <BookOpen className="h-6 w-6 text-brand" />
              </div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-brand">
                Personal library
              </p>
              <h2 className="m-0 text-2xl font-bold">Every PDF, one shelf.</h2>
              <p className="mb-5 mt-3 text-sm leading-6 text-muted">
                Upload your books, organise by category, and pick up on the
                exact page you left. Search, edit, and remove books whenever
                you like.
              </p>
              <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm text-muted">
                <li className="flex items-center gap-2"><Download size={14} /> Offline reading for opened books</li>
                <li className="flex items-center gap-2"><ShieldCheck size={14} /> Private, per-account library</li>
                <li className="flex items-center gap-2"><Cloud size={14} /> Syncs on any device</li>
              </ul>
            </article>

            <article className="rounded-3xl border border-[#e9e2ef] bg-[#fcfbfd] p-7 shadow-soft">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f2eafa]">
                <WandSparkles className="h-6 w-6 text-[#7954a5]" />
              </div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#7954a5]">
                Story Time
              </p>
              <h2 className="m-0 text-2xl font-bold">A little library of adventures.</h2>
              <p className="mb-5 mt-3 text-sm leading-6 text-muted">
                Write original picture books or gentle movie-inspired
                adventures in your own words. Add illustrations and read them
                together with a warm read-aloud voice.
              </p>
              <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm text-muted">
                <li className="flex items-center gap-2"><Sparkles size={14} /> Page-by-page story reader</li>
                <li className="flex items-center gap-2"><WandSparkles size={14} /> Parent-friendly story editor</li>
                <li className="flex items-center gap-2"><BookOpen size={14} /> Print or save as a keepsake PDF</li>
              </ul>
            </article>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted sm:flex-row sm:px-6">
          <span>ReadVault · Books, stories, and quiet reading time.</span>
          <span>Private by default. No public sharing.</span>
        </div>
      </footer>
    </div>
  );
}
