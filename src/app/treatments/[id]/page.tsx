import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getStaticTreatmentIds,
  TreatmentDetailPage,
} from "@/components/betterself-pages";
import { getTreatmentById } from "@/lib/treatments";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://betterself.health";

export function generateStaticParams() {
  return getStaticTreatmentIds();
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const treatment = getTreatmentById(id);
  if (!treatment) return { title: "Treatment not found" };
  const title = `${treatment.name} | Doctor-Led Home Treatment`;
  const canonical = `/treatments/${treatment.id}`;

  return {
    title,
    description: treatment.description,
    alternates: { canonical },
    openGraph: {
      title,
      description: treatment.description,
      url: canonical,
      type: "website",
      images: [
        {
          url: "/betterself-hero-home.jpg",
          alt: `BetterSelf ${treatment.name} home treatment`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: treatment.description,
      images: ["/betterself-hero-home.jpg"],
    },
  };
}

export default async function TreatmentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const treatment = getTreatmentById(id);

  if (!treatment) {
    notFound();
  }

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: treatment.name,
    description: treatment.description,
    serviceType: "Doctor-led aesthetic care",
    url: `${siteUrl}/treatments/${treatment.id}`,
    areaServed: "Metro Manila, Philippines",
    provider: {
      "@type": "MedicalBusiness",
      name: "BetterSelf Home Aesthetics",
      url: siteUrl,
    },
    offers: {
      "@type": "Offer",
      price: treatment.price,
      priceCurrency: "PHP",
      availability: "https://schema.org/PreOrder",
      url: `${siteUrl}/booking?treatment=${treatment.id}&direct=1`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <TreatmentDetailPage treatment={treatment} />
    </>
  );
}
