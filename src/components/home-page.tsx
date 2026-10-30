"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
  ArrowRight,
  BookCheck,
  BookOpen,
  CheckCircle2,
  Cloud,
  Download,
  Heart,
  Library,
  LockKeyhole,
  Mic,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Trash2,
  Upload,
  WandSparkles,
  WifiOff,
} from "lucide-react";

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.08 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: "easeOut" },
  },
};

const features = [
  {
    icon: Library,
    title: "A shelf that stays tidy",
    body: "Upload your PDFs, sort them by category, search in a heartbeat, and edit or remove any book whenever you like.",
    accent: "bg-brand-soft text-brand",
  },
  {
    icon: BookOpen,
    title: "A reader that gets out of the way",
    body: "PDF.js rendering with page navigation, zoom, fit-width, fullscreen, and keyboard shortcuts. Just you and the page.",
    accent: "bg-[#e8eef8] text-[#47736e]",
  },
  {
    icon: BookCheck,
    title: "Never lose your place",
    body: "Progress saves automatically. Reopen a book and continue exactly where you stopped, with a Recently Read shelf.",
    accent: "bg-[#f3eadf] text-[#8b6347]",
  },
  {
    icon: WandSparkles,
    title: "Story Time for the family",
    body: "Write original picture books or gentle movie-inspired adventures, add illustrations, and read them together.",
    accent: "bg-[#f2eafa] text-[#7954a5]",
  },
  {
    icon: Mic,
    title: "A voice for every page",
    body: "Tap Read aloud and let the browser tell the story. Print or save the whole book as a keepsake PDF too.",
    accent: "bg-[#f8ecec] text-[#a15b5b]",
  },
  {
    icon: WifiOff,
    title: "Offline when life happens",
    body: "Install ReadVault to your Home Screen. Open a book once while online, then keep reading on a plane or in bed.",
    accent: "bg-[#e7eeea] text-[#315b45]",
  },
];

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Bring your books",
    body: "Upload a PDF, add a title and author, and choose a category. Duplicates are caught automatically.",
  },
  {
    number: "02",
    icon: BookOpen,
    title: "Read, resume, remember",
    body: "Open the reader on any device. Your page, progress, and recently read shelf follow your account.",
  },
  {
    number: "03",
    icon: WandSparkles,
    title: "Make a little magic",
    body: "Switch to Story Time, write a page, add a picture, and read it aloud together at bedtime.",
  },
];

export function HomePage({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-paper text-ink">
      <Header signedIn={signedIn} />
      <main>
        <Hero signedIn={signedIn} />
        <TrustStrip />
        <Features />
        <HowItWorks />
        <StoryTimeShowcase signedIn={signedIn} />
        <OfflineSection signedIn={signedIn} />
        <Privacy />
        <FinalCta signedIn={signedIn} />
      </main>
      <Footer signedIn={signedIn} />
    </div>
  );
}

function Header({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-paper/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <span className="brand-mark !h-9 !w-9 !rounded-xl">
            <BookOpen size={18} />
          </span>
          <span className="font-serif text-lg font-bold tracking-tight text-ink">
            ReadVault
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-semibold text-muted md:flex">
          <a href="#features" className="no-underline transition hover:text-brand">
            Features
          </a>
          <a href="#story-time" className="no-underline transition hover:text-[#7954a5]">
            Story Time
          </a>
          <a href="#offline" className="no-underline transition hover:text-brand">
            Offline
          </a>
          <a href="#privacy" className="no-underline transition hover:text-brand">
            Privacy
          </a>
        </nav>

        <div className="flex items-center gap-2">
          {signedIn ? (
            <Link
              href="/library"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white no-underline transition hover:bg-[#274a38]"
            >
              Open library <ArrowRight size={15} />
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white no-underline transition hover:bg-[#274a38]"
            >
              Sign in <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero({ signedIn }: { signedIn: boolean }) {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-40 h-[30rem] w-[30rem] rounded-full bg-[#dce9de] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-20 h-[24rem] w-[24rem] rounded-full bg-[#efe4f8] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(49,91,69,.13)_1px,transparent_0)] [background-size:26px_26px] opacity-50"
      />

      <div className="relative mx-auto grid max-w-6xl gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:pt-24">
        <motion.div
          variants={container}
          initial={reduce ? false : "hidden"}
          animate="show"
        >
          <motion.p
            variants={item}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-muted shadow-sm"
          >
            <Sparkles size={13} className="text-brand" />
            For readers, dreamers, and bedtime storytellers
          </motion.p>

          <motion.h1
            variants={item}
            className="m-0 max-w-xl font-serif text-5xl leading-[1.04] tracking-tight sm:text-6xl"
          >
            A quiet home for{" "}
            <span className="bg-gradient-to-r from-brand via-[#5b8b70] to-[#7954a5] bg-clip-text text-transparent">
              everything you love to read
            </span>
            .
          </motion.h1>

          <motion.p variants={item} className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg">
            Keep your PDF library and family storybooks in one calm place.
            Read where you left off, create a little magic, and take it all
            with you — even offline.
          </motion.p>

          <motion.div variants={item} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={signedIn ? "/library" : "/login"}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-sm font-semibold text-white no-underline shadow-[0_14px_30px_rgba(49,91,69,.22)] transition hover:-translate-y-0.5 hover:bg-[#274a38]"
            >
              {signedIn ? "Open your library" : "Sign in to your library"}
              <ArrowRight size={16} />
            </Link>
            <a
              href="#story-time"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white/80 px-6 py-3.5 text-sm font-semibold text-muted no-underline transition hover:border-[#cbb9dc] hover:text-[#7954a5]"
            >
              <WandSparkles size={16} /> Explore Story Time
            </a>
          </motion.div>

          <motion.div variants={item} className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-brand" /> Private preview
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-brand" /> Your own account
            </span>
            <span className="inline-flex items-center gap-1.5">
              <WifiOff size={13} className="text-brand" /> Offline-ready
            </span>
          </motion.div>
        </motion.div>

        <HeroCollage reduce={Boolean(reduce)} />
      </div>
    </section>
  );
}

function HeroCollage({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.96, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
      className="relative mx-auto h-[330px] w-full max-w-md sm:h-[400px]"
    >
      <div
        aria-hidden="true"
        className="absolute left-10 top-10 h-64 w-64 rounded-full bg-gradient-to-br from-[#cddfd2] to-[#e9def5] opacity-70 blur-2xl"
      />

      <div className="absolute left-0 top-8 w-52 -rotate-6 sm:w-60">
        <Float reduce={reduce} delay={0.2}>
          <div className="overflow-hidden rounded-2xl border border-white/60 bg-white shadow-[0_24px_60px_rgba(31,47,34,.18)]">
            <div className="relative flex h-44 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#47736e] to-[#1f3029] p-5 text-white">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,.18),transparent_45%)]" />
              <div className="relative flex items-center justify-between text-[9px] font-bold uppercase tracking-[.18em] text-white/70">
                <span>Personal library</span>
                <BookOpen size={14} />
              </div>
              <div className="relative">
                <p className="m-0 font-serif text-xl font-bold leading-tight">
                  The Quiet Garden
                </p>
                <p className="mb-0 mt-1 text-[10px] uppercase tracking-widest text-white/60">
                  A. Reader
                </p>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between text-[9px] font-semibold text-muted">
                <span>Page 42 of 180</span>
                <span>23%</span>
              </div>
              <div className="progress-track mt-2">
                <div className="progress-fill" style={{ width: "23%" }} />
              </div>
            </div>
          </div>
        </Float>
      </div>

      <div className="absolute bottom-0 right-0 w-56 rotate-3 sm:w-64">
        <Float reduce={reduce} delay={1.1}>
          <div className="overflow-hidden rounded-2xl border border-[#e9e2ef] bg-[#fcfbfd] shadow-[0_24px_60px_rgba(55,38,72,.2)]">
            <div className="story-cover !h-36 !rounded-none">
              <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                <span className="rounded-xl bg-white/20 p-2">
                  <Sparkles size={20} />
                </span>
                <p className="m-0 font-serif text-lg font-bold leading-tight">
                  The Little Star
                </p>
                <p className="m-0 text-[8px] uppercase tracking-[.2em] opacity-75">
                  A bedtime story
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between px-3 py-3 text-[9px] font-semibold text-[#685778]">
              <span className="inline-flex items-center gap-1">
                <Mic size={11} /> Read aloud
              </span>
              <span className="rounded-full bg-[#eee5f6] px-2 py-1 text-[8px] uppercase tracking-wider">
                Page 2 / 6
              </span>
            </div>
          </div>
        </Float>
      </div>

      <div className="absolute right-0 top-4 sm:right-2">
        <Float reduce={reduce} delay={0.6} distance={5}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/90 px-3 py-1.5 text-[10px] font-bold text-brand shadow-sm">
            <CheckCircle2 size={12} /> Offline ready
          </span>
        </Float>
      </div>

      <div className="absolute bottom-8 left-0 sm:left-4">
        <Float reduce={reduce} delay={1.5} distance={5}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/90 px-3 py-1.5 text-[10px] font-bold text-muted shadow-sm">
            <Cloud size={12} className="text-[#7954a5]" /> Progress saved
          </span>
        </Float>
      </div>
    </motion.div>
  );
}

function Float({
  children,
  reduce,
  delay = 0,
  distance = 8,
}: {
  children: React.ReactNode;
  reduce: boolean;
  delay?: number;
  distance?: number;
}) {
  return (
    <motion.div
      animate={reduce ? undefined : { y: [0, -distance, 0] }}
      transition={{
        duration: 5.5,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    >
      {children}
    </motion.div>
  );
}

function TrustStrip() {
  const items = [
    { icon: Library, label: "PDF library" },
    { icon: WandSparkles, label: "Family storybooks" },
    { icon: Mic, label: "Read-aloud" },
    { icon: WifiOff, label: "Offline reading" },
  ];

  return (
    <section className="border-y border-line bg-white/45">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-4 sm:grid-cols-4 sm:px-6">
        {items.map(({ icon: Icon, label }) => (
          <Reveal key={label} className="flex items-center justify-center gap-2 py-5 text-xs font-semibold text-muted">
            <Icon size={15} className="text-brand" /> {label}
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <Reveal className="max-w-2xl">
        <p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-brand">
          One calm place
        </p>
        <h2 className="m-0 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
          A library, a reader, and a story nook.
        </h2>
        <p className="mb-0 mt-4 text-sm leading-6 text-muted sm:text-base">
          Built for the way people actually read: in short quiet moments, on
          different devices, sometimes without a signal.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <Reveal key={feature.title} delay={index * 0.04}>
            <FeatureCard {...feature} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
  accent,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
  accent: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -5 }}
      transition={{ duration: 0.2 }}
      className="h-full rounded-2xl border border-line bg-white p-6 shadow-[0_6px_24px_rgba(31,47,34,.04)] transition-colors hover:border-[#cfd9d2]"
    >
      <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}>
        <Icon size={20} />
      </div>
      <h3 className="m-0 text-base font-bold text-ink">{title}</h3>
      <p className="mb-0 mt-2 text-sm leading-6 text-muted">{body}</p>
    </motion.div>
  );
}

function HowItWorks() {
  const reduce = useReducedMotion();

  return (
    <section className="border-y border-line bg-white/50">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-brand">
            Simple by design
          </p>
          <h2 className="m-0 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            Three steps to a quieter reading life.
          </h2>
        </Reveal>

        <div className="relative mt-14 grid gap-10 md:grid-cols-3">
          <motion.div
            aria-hidden="true"
            initial={reduce ? false : { scaleX: 0, opacity: 0 }}
            whileInView={{ scaleX: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute left-[16%] right-[16%] top-7 hidden h-px origin-left bg-gradient-to-r from-[#c9d9cc] via-[#d9cce7] to-[#c9d9cc] md:block"
          />

          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.number} delay={index * 0.08} className="relative text-center">
                <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-white text-brand shadow-sm">
                  <Icon size={22} />
                </div>
                <p className="mb-1 mt-4 text-[10px] font-bold uppercase tracking-[.22em] text-[#9aa195]">
                  Step {step.number}
                </p>
                <h3 className="m-0 text-lg font-bold">{step.title}</h3>
                <p className="mx-auto mb-0 mt-2 max-w-xs text-sm leading-6 text-muted">
                  {step.body}
                </p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StoryTimeShowcase({ signedIn }: { signedIn: boolean }) {
  const reduce = useReducedMotion();

  return (
    <section id="story-time" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-[#f0e7f8] blur-3xl"
      />
      <div className="relative mx-auto grid max-w-6xl gap-14 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-[#7954a5]">
            Story Time
          </p>
          <h2 className="m-0 max-w-lg font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            Make bedtime a little more magical.
          </h2>
          <p className="mb-6 mt-4 text-sm leading-6 text-muted sm:text-base">
            A gentle storybook studio for parents and children. Write an
            original tale or a movie-inspired adventure in your own words, add
            pictures, and read it together.
          </p>
          <ul className="m-0 flex list-none flex-col gap-3 p-0 text-sm text-muted">
            {[
              "Original stories or unofficial movie-inspired adventures",
              "Editable pages, reordering, cover and page illustrations",
              "Read-aloud with the browser voice, plus print/save PDF",
              "Optional AI draft — you review every word before publishing",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#7954a5]" />
                {line}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={signedIn ? "/story-time/new" : "/login"}
              className="inline-flex items-center gap-2 rounded-xl bg-[#7954a5] px-5 py-3 text-sm font-semibold text-white no-underline shadow-[0_14px_30px_rgba(121,84,165,.22)] transition hover:-translate-y-0.5 hover:bg-[#65428f]"
            >
              {signedIn ? "Create a story" : "Sign in to create stories"}
              <ArrowRight size={15} />
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#e3d9ee] bg-white/70 px-3 py-3 text-xs font-semibold text-[#7954a5]">
              <Heart size={14} /> Parent-reviewed by design
            </span>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="relative mx-auto max-w-md">
            <div
              aria-hidden="true"
              className="absolute -right-4 -top-4 h-32 w-32 rounded-full bg-[#f2eafa] blur-2xl"
            />
            <Float reduce={Boolean(reduce)} delay={0.4}>
              <div className="relative overflow-hidden rounded-[26px] border border-[#e9e2ef] bg-white shadow-[0_30px_80px_rgba(55,38,72,.18)]">
                <div className="grid grid-cols-2">
                  <div className="relative flex min-h-[300px] flex-col items-center justify-center bg-gradient-to-br from-[#8c6aae] to-[#4f6475] p-5 text-center text-white">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,.2),transparent_45%)]" />
                    <span className="relative rounded-2xl bg-white/15 p-3">
                      <Sparkles size={24} />
                    </span>
                    <p className="relative mb-0 mt-4 font-serif text-xl font-bold leading-tight">
                      The Little Star
                    </p>
                    <p className="relative mb-0 mt-1 text-[8px] uppercase tracking-[.22em] text-white/70">
                      A ReadVault story
                    </p>
                  </div>
                  <div className="flex min-h-[300px] flex-col justify-center gap-3 bg-[#fffdf9] p-5">
                    <p className="m-0 text-center font-serif text-sm leading-6 text-[#4b4353]">
                      Once upon a time, a tiny star wished to help someone far
                      below. She gathered all her courage and glowed.
                    </p>
                    <div className="mx-auto h-px w-10 bg-[#d9cce7]" />
                    <p className="m-0 text-center text-[9px] font-bold uppercase tracking-[.2em] text-[#a18bb7]">
                      Page 2
                    </p>
                    <span className="mx-auto mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#eee5f6] px-3 py-1.5 text-[9px] font-bold text-[#7954a5]">
                      <Mic size={11} /> Read aloud
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-[#efe9f5] bg-white px-4 py-3 text-[10px] font-semibold text-muted">
                  <span>Story Time</span>
                  <span>2 / 6</span>
                </div>
              </div>
            </Float>
            <span className="absolute -left-2 bottom-6">
              <Float reduce={Boolean(reduce)} delay={1.4} distance={5}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e3d9ee] bg-white px-3 py-1.5 text-[10px] font-bold text-[#7954a5] shadow-sm">
                  <Star size={11} fill="currentColor" /> Made together
                </span>
              </Float>
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function OfflineSection({ signedIn }: { signedIn: boolean }) {
  const reduce = useReducedMotion();

  return (
    <section id="offline" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2rem] bg-[#1f3029] px-6 py-12 text-white sm:px-12 lg:px-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[#315b45] blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-[#7954a5]/30 blur-3xl"
          />

          <div className="relative grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-[#a8c8b2]">
                Take it with you
              </p>
              <h2 className="m-0 max-w-md font-serif text-3xl font-bold tracking-tight sm:text-4xl">
                The library that travels, even when the signal doesn&apos;t.
              </h2>
              <p className="mb-6 mt-4 max-w-md text-sm leading-6 text-white/65 sm:text-base">
                Install ReadVault as an app, open a book once, and keep reading
                offline. Perfect for commutes, flights, and bedtime without
                buffering.
              </p>
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-sm text-white/70">
                <li className="flex items-center gap-2.5">
                  <Smartphone size={15} className="text-[#a8c8b2]" /> Add to Home Screen on iPhone or Android
                </li>
                <li className="flex items-center gap-2.5">
                  <Download size={15} className="text-[#a8c8b2]" /> Opened PDFs are cached for offline reading
                </li>
                <li className="flex items-center gap-2.5">
                  <LockKeyhole size={15} className="text-[#a8c8b2]" /> Your progress stays with your account
                </li>
              </ul>
              <Link
                href={signedIn ? "/library" : "/login"}
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#1f3029] no-underline transition hover:-translate-y-0.5 hover:bg-[#f3f7f2]"
              >
                {signedIn ? "Open your library" : "Sign in to read anywhere"}
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="relative mx-auto w-full max-w-[240px]">
              <Float reduce={Boolean(reduce)} delay={0.3} distance={10}>
                <div className="relative overflow-hidden rounded-[2.4rem] border border-white/15 bg-[#0f1a15] p-2.5 shadow-[0_30px_80px_rgba(0,0,0,.35)]">
                  <div className="overflow-hidden rounded-[1.9rem] bg-[#f7f8f4] p-4 text-ink">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="font-serif text-[13px] font-bold">ReadVault</span>
                      <span className="h-1.5 w-8 rounded-full bg-[#dce5dd]" />
                    </div>
                    <div className="relative flex h-40 flex-col justify-end overflow-hidden rounded-xl bg-gradient-to-br from-[#47736e] to-[#1f3029] p-4 text-white">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,.2),transparent_45%)]" />
                      <p className="relative m-0 font-serif text-lg font-bold leading-tight">
                        The Quiet Garden
                      </p>
                      <p className="relative m-0 mt-1 text-[8px] uppercase tracking-widest text-white/60">
                        A. Reader
                      </p>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-[9px] font-semibold text-muted">
                        <span>Page 42 of 180</span>
                        <span>23%</span>
                      </div>
                      <div className="progress-track mt-2">
                        <div className="progress-fill" style={{ width: "23%" }} />
                      </div>
                    </div>
                    <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#eaf1eb] px-3 py-1.5 text-[9px] font-bold text-brand">
                      <CheckCircle2 size={11} /> Offline ready
                    </span>
                  </div>
                </div>
              </Float>
              <span className="absolute -right-4 top-6">
                <Float reduce={Boolean(reduce)} delay={1.2} distance={6}>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#315b45] px-3 py-1.5 text-[10px] font-bold text-white shadow-lg">
                    <WifiOff size={11} /> No signal needed
                  </span>
                </Float>
              </span>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Privacy() {
  const items = [
    {
      icon: ShieldCheck,
      title: "Your own shelf",
      body: "Books, stories, and reading progress are tied to your account — not shared in a public feed.",
    },
    {
      icon: LockKeyhole,
      title: "No public profiles",
      body: "ReadVault is a personal library, not a social network. No followers, comments, or public sharing.",
    },
    {
      icon: Trash2,
      title: "Delete anytime",
      body: "Remove a book or a story whenever you like. The file and its metadata are cleaned up together.",
    },
  ];

  return (
    <section id="privacy" className="border-y border-line bg-white/50">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <Reveal className="max-w-2xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-brand">
            Yours, not the internet&apos;s
          </p>
          <h2 className="m-0 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            A shelf that belongs to you.
          </h2>
          <p className="mb-0 mt-4 text-sm leading-6 text-muted sm:text-base">
            Built for personal libraries and family reading time, with the
            controls to keep it that way.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {items.map(({ icon: Icon, title, body }, index) => (
            <Reveal key={title} delay={index * 0.05}>
              <div className="h-full rounded-2xl border border-line bg-white p-6">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Icon size={20} />
                </div>
                <h3 className="m-0 text-base font-bold">{title}</h3>
                <p className="mb-0 mt-2 text-sm leading-6 text-muted">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta({ signedIn }: { signedIn: boolean }) {

  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#315b45] via-[#3d6b53] to-[#7954a5] px-6 py-16 text-center text-white sm:px-12 sm:py-20">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,.18),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(217,178,106,.18),transparent_40%)]"
          />
          <Sparkles
            aria-hidden="true"
            className="absolute left-[12%] top-10 text-white/30"
            size={26}
          />
          <Star
            aria-hidden="true"
            className="absolute right-[15%] top-16 text-[#f0d9a7]/50"
            size={18}
            fill="currentColor"
          />
          <WandSparkles
            aria-hidden="true"
            className="absolute bottom-10 left-[22%] text-white/25"
            size={22}
          />

          <div className="relative mx-auto max-w-2xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[.2em] text-white/65">
              A quieter reading life
            </p>
            <h2 className="m-0 font-serif text-3xl font-bold tracking-tight sm:text-5xl">
              Your next chapter starts here.
            </h2>
            <p className="mx-auto mb-8 mt-4 max-w-lg text-sm leading-6 text-white/70 sm:text-base">
              Bring your books, keep your place, and make a little story magic
              with the people you love.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={signedIn ? "/library" : "/login"}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-[#1f3029] no-underline transition hover:-translate-y-0.5 hover:bg-[#f3f7f2]"
              >
                {signedIn ? "Open your library" : "Sign in to your library"}
                <ArrowRight size={16} />
              </Link>
              <Link
                href={signedIn ? "/story-time" : "#story-time"}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3.5 text-sm font-semibold text-white no-underline transition hover:border-white/40 hover:bg-white/10"
              >
                {signedIn ? "Visit Story Time" : "Explore Story Time"}
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Footer({ signedIn }: { signedIn: boolean }) {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="brand-mark !h-8 !w-8 !rounded-lg">
            <BookOpen size={16} />
          </span>
          <div>
            <p className="m-0 font-serif text-sm font-bold">ReadVault</p>
            <p className="m-0 text-[11px] text-muted">
              Books, stories, and quiet reading time.
            </p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-muted">
          <a href="#features" className="no-underline hover:text-brand">
            Features
          </a>
          <a href="#story-time" className="no-underline hover:text-[#7954a5]">
            Story Time
          </a>
          <a href="#offline" className="no-underline hover:text-brand">
            Offline
          </a>
          <a
            href="https://github.com/chaze05/readvault"
            target="_blank"
            rel="noreferrer"
            className="no-underline hover:text-brand"
          >
            GitHub
          </a>
          <Link
            href={signedIn ? "/library" : "/login"}
            className="no-underline hover:text-brand"
          >
            {signedIn ? "Library" : "Sign in"}
          </Link>
        </nav>

        <p className="m-0 text-[11px] text-muted">
          Made for personal libraries · No public feeds
        </p>
      </div>
    </footer>
  );
}

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 26 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{ duration: 0.65, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}
