import { SearchView } from "@/components/search-view";

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { q } = await searchParams;
  return <SearchView initialQuery={typeof q === "string" ? q : ""} />;
}
