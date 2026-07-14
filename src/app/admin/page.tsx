import { AdminPage } from "@/components/betterself-pages";
import { currentUser } from "@clerk/nextjs/server";
import { isAdminEmail } from "@/lib/admin";
import { syncCalendlyBookings } from "@/lib/calendly-sync";
import { isDatabaseConfigured } from "@/lib/db/client";
import {
  getAllBookings,
  getMessageThreads,
  type AdminBookingView,
  type MessageThreadView,
} from "@/lib/db/queries";

export const dynamic = "force-dynamic";

// Private route — keep it out of search indexes.
export const metadata = { robots: { index: false, follow: false } };

export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const user = await currentUser();
  const email = user?.emailAddresses.find(
    (entry) => entry.id === user.primaryEmailAddressId,
  )?.emailAddress;
  const authorized = isAdminEmail(email);

  let bookings: AdminBookingView[] = [];
  let messageThreads: MessageThreadView[] = [];
  if (authorized && isDatabaseConfigured()) {
    try {
      await syncCalendlyBookings();
    } catch (error) {
      console.error("[admin] Calendly sync failed:", error);
    }

    try {
      bookings = await getAllBookings();
    } catch (error) {
      console.error("[admin] failed to load bookings:", error);
    }

    try {
      messageThreads = await getMessageThreads();
    } catch (error) {
      console.error("[admin] failed to load message threads:", error);
    }
  }

  const readParam = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return (
    <AdminPage
      authorized={authorized}
      bookings={bookings}
      messageThreads={messageThreads}
      filters={{
        q: readParam("q"),
        status: readParam("status"),
        payment: readParam("payment"),
        intake: readParam("intake"),
      }}
    />
  );
}
