import { MessagesPage } from "@/components/betterself-pages";
import type { ChatMessage } from "@/components/platform-widgets";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getPatientMessages } from "@/lib/db/queries";

// Private route — keep it out of search indexes.
export const metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default async function Messages({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in?redirect_url=/messages");

  const params = await searchParams;
  const requestedPatientId = params.patientId;
  const patientIdParam = Array.isArray(requestedPatientId)
    ? requestedPatientId[0]
    : requestedPatientId;
  const primary = user.emailAddresses.find((entry) => entry.id === user.primaryEmailAddressId);
  const isAdmin = isAdminUser({
    userId: user.id,
    email: primary?.emailAddress,
    emailVerified: primary?.verification?.status === "verified",
  });
  const patientId = isAdmin && patientIdParam ? patientIdParam : user.id;

  let messages: ChatMessage[] = [];
  if (isDatabaseConfigured()) {
    messages = (await getPatientMessages(patientId)).map((message) => ({
      id: message.id,
      sender: message.sender_role,
      text: message.message_text,
      time: formatTime(message.created_at),
    }));
  }

  return <MessagesPage initialMessages={messages} isAdmin={isAdmin} patientId={patientId} />;
}
