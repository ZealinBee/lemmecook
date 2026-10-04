import type { Metadata } from "next";
import { SearchView } from "@/components/search-view";

export const metadata: Metadata = {
  title: "Search recipes",
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { q, from } = await searchParams;
  return (
    <SearchView
      // A blocked link can land here while we're already on /search; start that search fresh.
      key={typeof from === "string" ? `${from}:${q}` : "search"}
      initialQuery={typeof q === "string" ? q : ""}
      blockedSite={typeof from === "string" ? from : undefined}
    />
  );
}
