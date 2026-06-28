import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://betterself-platform-mu.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/admin", "/messages", "/api/", "/booking/success", "/booking/cancelled", "/checkout-preview"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
