"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { isAdminEmail } from "@/lib/admin";
import { updateBookingStatus } from "@/lib/db/queries";
import type { BookingStatus } from "@/lib/db/types";

const VALID_STATUSES: BookingStatus[] = [
  "pending_doctor_review",
  "needs_more_information",
  "confirmed",
  "completed",
  "cancelled",
];

export async function updateBookingStatusAction(formData: FormData) {
  const user = await currentUser();
  const email = user?.emailAddresses.find(
    (entry) => entry.id === user.primaryEmailAddressId,
  )?.emailAddress;

  // Re-check authorization on the server — never trust the client.
  if (!isAdminEmail(email)) return;

  const bookingId = String(formData.get("bookingId") ?? "");
  const status = String(formData.get("status") ?? "") as BookingStatus;
  if (!bookingId || !VALID_STATUSES.includes(status)) return;

  await updateBookingStatus(bookingId, status);
  revalidatePath("/admin");
}
