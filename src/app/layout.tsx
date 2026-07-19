import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
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
  "Private doctor-led aesthetic treatments delivered to your home with medical screening, personalized treatment planning and professional aftercare.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "BetterSelf Home Aesthetics | Doctor-Led Home Treatments in Metro Manila",
    template: "%s | BetterSelf",
  },
  description: SITE_DESCRIPTION,
  applicationName: "BetterSelf",
  icons: { icon: "/betterself-mark.png", apple: "/betterself-mark.png" },
  openGraph: {
    type: "website",
    siteName: "BetterSelf",
    title: "BetterSelf Home Aesthetics | Doctor-Led Home Treatments in Metro Manila",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_PH",
    images: [{ url: "/betterself-logo-lockup.jpg", width: 1300, height: 1050, alt: "BetterSelf Home Aesthetics" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BetterSelf Home Aesthetics | Doctor-Led Home Treatments in Metro Manila",
    description: SITE_DESCRIPTION,
    images: ["/betterself-logo-lockup.jpg"],
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
        <Analytics />
      </body>
    </html>
  );
}
