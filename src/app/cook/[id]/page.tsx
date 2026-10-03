import { CookView } from "@/components/cook-view";

export default async function CookPage({ params }: PageProps<"/cook/[id]">) {
  const { id } = await params;
  return <CookView id={id} />;
}
