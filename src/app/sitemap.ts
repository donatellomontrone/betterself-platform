import type { MetadataRoute } from "next";
import { treatments } from "@/lib/treatments";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://betterself-platform-mu.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = [
    "",
    "/treatments",
    "/how-it-works",
    "/safety",
    "/about",
    "/contact",
    "/faq",
    "/booking",
    "/privacy",
    "/terms",
    "/consent",
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.7,
  }));

  const treatmentEntries: MetadataRoute.Sitemap = treatments.map((t) => ({
    url: `${SITE_URL}/treatments/${t.id}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticEntries, ...treatmentEntries];
}
