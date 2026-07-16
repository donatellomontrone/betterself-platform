import { redirect } from "next/navigation";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const entries = Object.entries(params)
    .flatMap(([key, value]) =>
      Array.isArray(value) ? value.map((item) => [key, item]) : value ? [[key, value]] : [],
    )
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  const query = entries.length > 0 ? `?${entries.join("&")}` : "";

  redirect(`/sign-in${query}`);
}
