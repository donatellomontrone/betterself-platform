import { notFound } from "next/navigation";
import {
  getStaticTreatmentIds,
  TreatmentDetailPage,
} from "@/components/betterself-pages";
import { getTreatmentById } from "@/lib/treatments";

export function generateStaticParams() {
  return getStaticTreatmentIds();
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const treatment = getTreatmentById(id);
  if (!treatment) return { title: "Treatment not found" };
  return { title: treatment.name, description: treatment.description };
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

  return <TreatmentDetailPage treatment={treatment} />;
}
