"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bookmark,
  BookOpen,
  Clock3,
  LayoutDashboard,
  Library,
  LogOut,
  Settings,
  WandSparkles,
} from "lucide-react";

import { signOut } from "@/actions/auth";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "My Library", href: "/library", icon: Library },
  { label: "Recently Read", href: "/recent", icon: Clock3 },
  { label: "Bookmarks", href: "/bookmarks", icon: Bookmark },
  { label: "Story Time", href: "/story-time", icon: WandSparkles },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <aside className="sidebar">
      <Link
        href="/"
        onClick={onClose}
        className="flex items-center gap-3 px-2 no-underline"
      >
        <span className="brand-mark">
          <BookOpen size={20} />
        </span>
        <span className="brand-copy text-[19px] font-bold tracking-tight text-ink">
          ReadVault
        </span>
      </Link>

      <div className="nav-group-label mb-3 mt-12 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#a0a69b]">
        Workspace
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map(({ label, href, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`nav-link ${active ? "active" : ""}`}
              title={label}
            >
              <Icon size={18} />
              <span className="nav-label">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="nav-group-label mb-3 mt-10 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#a0a69b]">
        Personal
      </div>
      <Link
        href="/settings"
        onClick={onClose}
        className={`nav-link ${pathname === "/settings" ? "active" : ""}`}
        title="Settings"
      >
        <Settings size={18} />
        <span className="nav-label">Settings</span>
      </Link>

      <div className="mt-auto border-t border-line pt-3">
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
          className="nav-link w-full disabled:opacity-50"
        >
          <LogOut size={18} />
          <span className="nav-label">
            {signingOut ? "Signing out..." : "Sign out"}
          </span>
        </button>
      </div>
    </aside>
  );
}
