"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useCookieConsentVisible } from "@/components/cookie-consent-banner";

// Pages where a fixed "Book" bar would cover the real primary action.
const HIDDEN_ON = ["/booking", "/messages", "/dashboard"];

export function MobileBottomCta() {
  const pathname = usePathname();
  const cookieConsentVisible = useCookieConsentVisible();
  const [showAfterScroll, setShowAfterScroll] = useState(false);
  useEffect(() => {
    const update = () => setShowAfterScroll(window.scrollY > 520);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }
  if (cookieConsentVisible || !showAfterScroll) {
    return null;
  }
  return (
    <div
      className="mobile-floating-cta fixed inset-x-3 bottom-3 z-40 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <Link className="mobile-floating-cta-link" href="/booking">
        <span>Book Treatment</span>
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
