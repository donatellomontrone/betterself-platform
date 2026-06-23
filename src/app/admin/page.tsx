import { AdminPage } from "@/components/betterself-pages";
import { currentUser } from "@clerk/nextjs/server";
import { isAdminEmail } from "@/lib/admin";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getAllBookings, type AdminBookingView } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const user = await currentUser();
  const email = user?.emailAddresses.find(
    (entry) => entry.id === user.primaryEmailAddressId,
  )?.emailAddress;
  const authorized = isAdminEmail(email);

  let bookings: AdminBookingView[] = [];
  if (authorized && isDatabaseConfigured()) {
    try {
      bookings = await getAllBookings();
    } catch (error) {
      console.error("[admin] failed to load bookings:", error);
    }
  }

  return <AdminPage authorized={authorized} bookings={bookings} />;
}
