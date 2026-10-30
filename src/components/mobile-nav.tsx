"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clock3,
  LayoutDashboard,
  Library,
  Settings,
  WandSparkles,
} from "lucide-react";

const links = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Library", href: "/library", icon: Library },
  { label: "Recent", href: "/recent", icon: Clock3 },
  { label: "Stories", href: "/story-time", icon: WandSparkles },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {links.map(({ label, href, icon: Icon }) => {
        const active =
          href === "/dashboard" ? pathname === href : pathname.startsWith(href);

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
