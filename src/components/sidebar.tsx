"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Bookmark, LayoutDashboard, Library, Settings, Clock3, Leaf } from "lucide-react";

const links = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "My Library", href: "/library", icon: Library },
  { label: "Recently Read", href: "/recent", icon: Clock3 },
  { label: "Bookmarks", href: "/bookmarks", icon: Bookmark },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      <Link href="/" className="flex items-center gap-3 px-2 no-underline">
        <span className="brand-mark"><BookOpen size={20} /></span>
        <span className="brand-copy text-[19px] font-bold tracking-tight text-ink">ReadVault</span>
      </Link>

      <div className="nav-group-label mb-3 mt-12 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#a0a69b]">Workspace</div>
      <nav className="flex flex-col gap-1">
        {links.map(({ label, href, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return <Link key={href} href={href} className={`nav-link ${active ? "active" : ""}`} title={label}>
            <Icon size={18} /><span className="nav-label">{label}</span>
          </Link>;
        })}
      </nav>

      <div className="nav-group-label mb-3 mt-10 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#a0a69b]">Personal</div>
      <Link href="/settings" className={`nav-link ${pathname === "/settings" ? "active" : ""}`} title="Settings">
        <Settings size={18} /><span className="nav-label">Settings</span>
      </Link>

      <div className="mt-auto rounded-2xl bg-[#f4f6f1] p-4 sidebar-bottom-copy">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#315b45]"><Leaf size={16}/> Your reading space</div>
        <p className="m-0 text-xs leading-5 text-[#788174]">A quiet place for the books, ideas, and notes you want to keep.</p>
      </div>
    </aside>
  );
}
