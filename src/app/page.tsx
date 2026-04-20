import { redirect } from "next/navigation";

export default function HomePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const query = new URLSearchParams();
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (typeof value === "string") {
        query.set(key, value);
      }
    });
  }
  const queryString = query.toString();
  redirect(`/114336388182180${queryString ? `?${queryString}` : ""}`);
}
