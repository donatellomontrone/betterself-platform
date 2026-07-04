import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Cormorant_Garamond, Geist_Mono, Manrope } from "next/font/google";
import { AccountConsentRecorder } from "@/components/account-consent-recorder";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { hasValidClerkPublishableKey } from "@/lib/clerk-env";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://betterself.health";
const SITE_DESCRIPTION =
  "Private doctor-led aesthetic treatments — Botox, fillers, and skin boosters — with medical intake, consent, and home visits across Metro Manila.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "BetterSelf | Doctor-led aesthetic care at your doorstep",
    template: "%s | BetterSelf",
  },
  description: SITE_DESCRIPTION,
  applicationName: "BetterSelf",
  icons: { icon: "/betterself-mark.png", apple: "/betterself-mark.png" },
  openGraph: {
    type: "website",
    siteName: "BetterSelf",
    title: "BetterSelf | Doctor-led aesthetic care at your doorstep",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_PH",
    images: [{ url: "/betterself-hero-home.jpg", width: 1200, height: 630, alt: "BetterSelf" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BetterSelf | Doctor-led aesthetic care at your doorstep",
    description: SITE_DESCRIPTION,
    images: ["/betterself-hero-home.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = hasValidClerkPublishableKey() ? (
    <ClerkProvider>
      <AccountConsentRecorder />
      {children}
    </ClerkProvider>
  ) : (
    children
  );

  return (
    <html
      lang="en"
      className={`${manrope.variable} ${cormorant.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {content}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
