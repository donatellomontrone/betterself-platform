"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

export function PrimaryNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      className="premium-nav hidden items-center gap-1 text-sm font-semibold text-[#4D4D4D] min-[1100px]:flex"
      aria-label="Primary navigation"
    >
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            className={`premium-nav-link${isActive ? " is-active" : ""}`}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
