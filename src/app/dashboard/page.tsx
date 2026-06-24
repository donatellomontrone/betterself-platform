import { DashboardPage } from "@/components/betterself-pages";
import { currentUser } from "@clerk/nextjs/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getPatientBookings, type PatientBookingView } from "@/lib/db/queries";

// Per-patient data — never statically cached or shared between users.
export const dynamic = "force-dynamic";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const paymentStatus = Array.isArray(params.payment) ? params.payment[0] : params.payment;
  const user = await currentUser();
  const primaryEmail = user?.emailAddresses.find(
    (email) => email.id === user.primaryEmailAddressId,
  )?.emailAddress;

  let bookings: PatientBookingView[] = [];
  if (user && isDatabaseConfigured()) {
    try {
      bookings = await getPatientBookings(user.id);
    } catch (error) {
      console.error("[dashboard] failed to load bookings:", error);
    }
  }

  return (
    <DashboardPage
      viewerName={user?.firstName ?? user?.fullName ?? primaryEmail}
      bookings={bookings}
      paymentStatus={paymentStatus}
    />
  );
}
