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
  const { isSignedIn } = useUser();

  if (variant === "mobile") {
    if (isSignedIn) {
      return (
        <>
          <Link
            className="rounded-lg px-3 py-2 text-sm font-semibold text-[#4D4D4D]"
            href="/dashboard"
          >
            Dashboard
          </Link>
          <Link
            className="rounded-lg px-3 py-2 text-sm font-semibold text-[#4D4D4D]"
            href="/messages"
          >
            Messages
          </Link>
        </>
      );
    }
    return (
      <Link
        className="rounded-lg px-3 py-2 text-sm font-semibold text-[#4D4D4D]"
        href="/login"
      >
        Login
      </Link>
    );
  }

  if (isSignedIn) {
    return (
      <>
        <Link className="btn btn-secondary" href="/dashboard">
          Dashboard
        </Link>
        <UserButton />
      </>
    );
  }
  return (
    <Link className="btn btn-secondary" href="/login">
      Login
    </Link>
  );
}
