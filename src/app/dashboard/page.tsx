import { DashboardPage } from "@/components/betterself-pages";
import { currentUser } from "@clerk/nextjs/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getPatientBookings, type PatientBookingView } from "@/lib/db/queries";

// Per-patient data — never statically cached or shared between users.
export const dynamic = "force-dynamic";

// Private route — keep it out of search indexes.
export const metadata = { robots: { index: false, follow: false } };

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const paymentStatus = Array.isArray(params.payment) ? params.payment[0] : params.payment;
  const bookingStatus = Array.isArray(params.booking) ? params.booking[0] : params.booking;
  const user = await currentUser();
  const primaryEmail = user?.emailAddresses.find(
    (email) => email.id === user.primaryEmailAddressId,
  )?.emailAddress;

  let bookings: PatientBookingView[] = [];
  let loadFailed = false;
  if (user && isDatabaseConfigured()) {
    try {
      bookings = await getPatientBookings(user.id);
    } catch (error) {
      console.error("[dashboard] failed to load bookings:", error);
      loadFailed = true;
    }
  }

  return (
    <DashboardPage
      viewerName={user?.firstName ?? user?.fullName ?? primaryEmail}
      bookings={bookings}
      paymentStatus={paymentStatus}
      bookingStatus={bookingStatus}
      loadFailed={loadFailed}
    />
  );
}
