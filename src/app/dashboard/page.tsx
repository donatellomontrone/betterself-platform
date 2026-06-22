import { DashboardPage } from "@/components/betterself-pages";
import { currentUser } from "@clerk/nextjs/server";

export default async function Dashboard() {
  const user = await currentUser();
  const primaryEmail = user?.emailAddresses.find(
    (email) => email.id === user.primaryEmailAddressId,
  )?.emailAddress;

  return (
    <DashboardPage
      viewerName={user?.firstName ?? user?.fullName ?? primaryEmail}
    />
  );
}
