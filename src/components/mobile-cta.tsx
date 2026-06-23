"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Pages where a fixed "Book" bar would cover the real primary action.
const HIDDEN_ON = ["/booking", "/messages", "/dashboard"];

export function MobileBottomCta() {
  const pathname = usePathname();
  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }
  return (
    <div
      className="fixed inset-x-3 bottom-3 z-40 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <Link className="btn btn-primary flex h-12 items-center justify-center shadow-lg" href="/booking">
        Book Treatment
      </Link>
    </div>
  );
}
