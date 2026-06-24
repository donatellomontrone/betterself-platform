import { BookingPage } from "@/components/betterself-pages";
import { currentUser } from "@clerk/nextjs/server";
import { hasValidClerkServerKeys } from "@/lib/clerk-env";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getPatientProfile, getUserProfile } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function Booking({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const treatment = Array.isArray(params.treatment)
    ? params.treatment[0]
    : params.treatment;
  let prefill;

  if (hasValidClerkServerKeys()) {
    try {
      const user = await currentUser();

      if (user) {
        const clerkEmail = user.emailAddresses.find(
          (entry) => entry.id === user.primaryEmailAddressId,
        )?.emailAddress;
        const clerkPhone =
          user.phoneNumbers.find((entry) => entry.id === user.primaryPhoneNumberId)
            ?.phoneNumber ?? user.phoneNumbers[0]?.phoneNumber;
        const clerkName =
          user.fullName ??
          [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
        const dbUser = isDatabaseConfigured() ? await getUserProfile(user.id) : null;
        const patientProfile = isDatabaseConfigured()
          ? await getPatientProfile(user.id)
          : null;

        prefill = {
          name: clerkName || dbUser?.full_name || "",
          email: clerkEmail || dbUser?.email || "",
          phone: clerkPhone || dbUser?.phone || "",
          address: patientProfile?.address ?? "",
          emergencyContact: patientProfile?.emergency_contact ?? "",
        };
      }
    } catch (error) {
      console.error("[booking] failed to prefill patient profile:", error);
    }
  }

  return <BookingPage treatmentId={treatment} prefill={prefill} />;
}
