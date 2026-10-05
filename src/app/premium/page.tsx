import type { Metadata } from "next";
import { PremiumView } from "@/components/premium-view";
import { SITE_NAME, SITE_OPEN_GRAPH } from "@/lib/site";

const description = "Unlimited recipes every month with Lemme Cook Premium.";

export const metadata: Metadata = {
  title: "Premium",
  description,
  alternates: { canonical: "/premium" },
  openGraph: { ...SITE_OPEN_GRAPH, title: `Premium · ${SITE_NAME}`, description, url: "/premium" },
  twitter: { card: "summary_large_image", title: `Premium · ${SITE_NAME}`, description },
};

export default async function PremiumPage({ searchParams }: PageProps<"/premium">) {
  const { reason, checkout } = await searchParams;
  return (
    <PremiumView
      reason={reason === "limit" || reason === "remove" || reason === "convert" ? reason : undefined}
      checkoutSuccess={checkout === "success"}
    />
  );
}
