import type { Metadata } from "next";
import { PremiumView } from "@/components/premium-view";

export const metadata: Metadata = {
  title: "Premium",
  description: "Unlimited recipes every month with Lemme Cook Premium.",
  alternates: { canonical: "/premium" },
};

export default async function PremiumPage({ searchParams }: PageProps<"/premium">) {
  const { reason, checkout } = await searchParams;
  return (
    <PremiumView
      reason={reason === "limit" || reason === "remove" ? reason : undefined}
      checkoutSuccess={checkout === "success"}
    />
  );
}
