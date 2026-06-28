import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { isAdminEmail } from "@/lib/admin";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getAllBookings } from "@/lib/db/queries";

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  // Neutralize spreadsheet formula injection: a leading =, +, -, @, tab or CR makes
  // Excel/Sheets execute patient-controlled text as a formula. Prefix a single quote.
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${guarded.replaceAll('"', '""')}"`;
}

export async function GET() {
  const user = await currentUser();
  const email = user?.emailAddresses.find(
    (entry) => entry.id === user.primaryEmailAddressId,
  )?.emailAddress;

  if (!isAdminEmail(email)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const bookings = isDatabaseConfigured() ? await getAllBookings() : [];
  // Audit trail: this export dumps full patient PII (email, phone, address, emergency contact).
  console.warn(
    `[admin export] CSV export by ${email ?? "unknown"} at ${new Date().toISOString()} — ${bookings.length} rows`,
  );
  const headers = [
    "created_at",
    "patient_name",
    "patient_email",
    "patient_phone",
    "treatment",
    "appointment_type",
    "location",
    "booking_status",
    "payment_status",
    "amount",
    "payment_reference",
    "intake_status",
    "patient_address",
    "emergency_contact",
  ];
  const rows = bookings.map((booking) => [
    booking.created_at,
    booking.patient_name,
    booking.patient_email,
    booking.patient_phone,
    booking.treatment_name,
    booking.appointment_type,
    booking.location,
    booking.status,
    booking.payment_status,
    booking.amount,
    booking.transaction_reference,
    booking.intake_review_status,
    booking.patient_address,
    booking.patient_emergency_contact,
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="betterself-bookings-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}
