import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Cormorant_Garamond, Geist_Mono, Manrope } from "next/font/google";
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

export const metadata: Metadata = {
  title: "BetterSelf | Doctor-led aesthetic care at your doorstep",
  description:
    "Private doctor-led aesthetic treatments, medical intake, home visits, booking, payments, and patient-doctor messaging in Metro Manila.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const hasClerkPublishableKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const content = hasClerkPublishableKey ? (
    <ClerkProvider>{children}</ClerkProvider>
  ) : (
    children
  );

  return (
    <html
      lang="en"
      className={`${manrope.variable} ${cormorant.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{content}</body>
    </html>
  );
}
