import { BookingPage } from "@/components/betterself-pages";

export default async function Booking({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const treatment = Array.isArray(params.treatment)
    ? params.treatment[0]
    : params.treatment;

  return <BookingPage treatmentId={treatment} />;
}
