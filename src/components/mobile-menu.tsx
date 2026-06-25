"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { HeaderAuthControls } from "@/components/header-auth";

type NavItem = { href: string; label: string };

export function MobileMenu({ items }: { items: NavItem[] }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  // Close the dropdown whenever the route changes (tapping a link navigates but the
  // server-rendered <details> would otherwise stay open over the new page).
  useEffect(() => {
    ref.current?.removeAttribute("open");
  }, [pathname]);

  const close = () => ref.current?.removeAttribute("open");

  return (
    <details ref={ref} className="relative min-[900px]:hidden">
      <summary className="btn btn-secondary list-none cursor-pointer">Menu</summary>
      <div className="absolute right-0 top-12 z-40 grid w-60 gap-2 rounded-lg border border-[#E6DFD5] bg-white p-3 shadow-xl">
        {items.map((item) => (
          <Link
            key={item.href}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-[#4D4D4D]"
            href={item.href}
            onClick={close}
          >
            {item.label}
          </Link>
        ))}
        <HeaderAuthControls variant="mobile" />
        <Link className="btn btn-primary mt-1 justify-center" href="/booking" onClick={close}>
          Book Treatment
        </Link>
      </div>
    </details>
  );
}
