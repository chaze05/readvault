"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Clock3, LayoutDashboard, Library, Settings } from "lucide-react";

const links = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Library", href: "/library", icon: Library },
  { label: "Recent", href: "/recent", icon: Clock3 },
  { label: "Bookmarks", href: "/bookmarks", icon: Bookmark },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {links.map(({ label, href, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className={`mobile-bottom-link ${active ? "active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
