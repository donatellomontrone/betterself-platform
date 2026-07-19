"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Menu } from "lucide-react";
import { HeaderAuthControls } from "@/components/header-auth";
import { TrackedLink } from "@/components/tracked-link";

type NavItem = { href: string; label: string };

export function MobileMenu({ items }: { items: NavItem[] }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  // Close the dropdown whenever the route changes (tapping a link navigates but the
  // server-rendered <details> would otherwise stay open over the new page).
  useEffect(() => {
    ref.current?.removeAttribute("open");
  }, [pathname]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (ref.current?.open && !ref.current.contains(event.target as Node)) {
        ref.current.removeAttribute("open");
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        ref.current?.removeAttribute("open");
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const close = () => ref.current?.removeAttribute("open");

  return (
    <details ref={ref} className="relative min-[1100px]:hidden">
      <summary className="inline-flex min-h-[44px] cursor-pointer list-none items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 text-sm font-bold text-[#3A2F2B] shadow-[0_14px_30px_rgb(80_64_53_/_0.10)] backdrop-blur-xl">
        <Menu className="h-4 w-4" />
        Menu
      </summary>
      <div className="absolute right-0 top-14 z-40 grid w-72 gap-2 rounded-2xl border border-white/70 bg-[#FFFDF9]/95 p-3 shadow-[0_28px_80px_rgb(80_64_53_/_0.18)] backdrop-blur-xl">
        {items.map((item) => (
          <Link
            key={item.href}
            className="flex min-h-[44px] items-center rounded-xl px-4 py-2 text-sm font-semibold text-[#4D4D4D] transition hover:bg-[#F6EDEA] hover:text-[#6E444E]"
            href={item.href}
            onClick={close}
          >
            {item.label}
          </Link>
        ))}
        <HeaderAuthControls variant="mobile" />
        <TrackedLink
          className="premium-cta mt-1 justify-center"
          href="/booking"
          onClick={close}
          eventName="request_treatment"
          eventData={{ placement: "mobile_menu" }}
        >
          Request a Treatment
        </TrackedLink>
      </div>
    </details>
  );
}
