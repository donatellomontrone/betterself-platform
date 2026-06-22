import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { hasValidClerkServerKeys } from "@/lib/clerk-env";

const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/booking(.*)",
  "/dashboard(.*)",
  "/messages(.*)",
]);

const clerkProxy = clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!hasValidClerkServerKeys()) {
    if (isProtectedRoute(request)) {
      return NextResponse.redirect(new URL("/login?status=clerk-missing", request.url));
    }

    return NextResponse.next();
  }

  return clerkProxy(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
