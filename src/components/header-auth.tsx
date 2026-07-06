"use client";

import Link from "next/link";
import { UserButton, useUser } from "@clerk/nextjs";

/**
 * Auth-aware header controls. Kept as a small client island (via useUser) so the
 * surrounding marketing pages stay statically prerendered — calling server-side
 * auth() in the shared Header would force every page to render dynamically.
 *
 * This version of @clerk/nextjs does not export <SignedIn>/<SignedOut>, so we
 * branch on useUser().isSignedIn directly.
 */
export function HeaderAuthControls({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile";
}) {
  const { isLoaded, isSignedIn } = useUser();

  // Until Clerk resolves, render nothing so signed-in users don't flash "Login".
  if (!isLoaded) {
    return null;
  }

  if (variant === "mobile") {
    if (isSignedIn) {
      return (
        <>
          <Link
            className="flex min-h-[44px] items-center rounded-xl px-4 py-2 text-sm font-semibold text-[#4D4D4D] transition hover:bg-[#F6EDEA] hover:text-[#6E444E]"
            href="/dashboard"
          >
            Dashboard
          </Link>
          <Link
            className="flex min-h-[44px] items-center rounded-xl px-4 py-2 text-sm font-semibold text-[#4D4D4D] transition hover:bg-[#F6EDEA] hover:text-[#6E444E]"
            href="/messages"
          >
            Messages
          </Link>
        </>
      );
    }
    return (
      <Link
        className="flex min-h-[44px] items-center rounded-xl px-4 py-2 text-sm font-semibold text-[#4D4D4D] transition hover:bg-[#F6EDEA] hover:text-[#6E444E]"
        href="/login"
      >
        Login
      </Link>
    );
  }

  if (isSignedIn) {
    return (
      <>
        <Link className="header-dashboard-link" href="/dashboard">
          Dashboard
        </Link>
        <span className="header-avatar-shell">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-9 w-9 shadow-none",
                userButtonPopoverCard: "rounded-2xl",
              },
            }}
          />
        </span>
      </>
    );
  }
  return (
    <Link className="header-dashboard-link" href="/login">
      Login
    </Link>
  );
}
