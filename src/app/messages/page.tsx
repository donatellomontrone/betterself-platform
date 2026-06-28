import { MessagesPage } from "@/components/betterself-pages";

// Private route — keep it out of search indexes.
export const metadata = { robots: { index: false, follow: false } };

export default function Messages() {
  return <MessagesPage />;
}
