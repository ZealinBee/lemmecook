import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ClockIcon, UsersIcon } from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { DEFAULT_RECIPES } from "@/lib/default-recipes";
import { SITE_NAME, SITE_OPEN_GRAPH, SITE_URL } from "@/lib/site";
import { formatMinutes } from "@/lib/voice-commands";

const title = "Recipes to cook hands-free";
const description = `${DEFAULT_RECIPES.length} tested recipes you can cook by voice: say “next” to move on, set timers by voice and hear each step read aloud. Free, no account needed.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/recipes" },
  openGraph: { ...SITE_OPEN_GRAPH, title: `${title} · ${SITE_NAME}`, description, url: "/recipes" },
  twitter: { card: "summary_large_image", title: `${title} · ${SITE_NAME}`, description },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: title,
  itemListElement: DEFAULT_RECIPES.map((r, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: `${SITE_URL}/cook/${r.id}`,
    name: r.title,
  })),
};

export default function RecipesPage() {
  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-xl flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <SiteHeader />

      <section className="rise px-5 pt-8 pb-6">
        <p className="text-xs font-medium tracking-[0.12em] text-clay uppercase">Built-in recipes</p>
        <h1 className="mt-2 font-serif text-[2.4rem] leading-[1.05] tracking-[-0.02em] text-ink">
          Recipes to cook <em className="text-clay italic">hands-free</em>
        </h1>
        <p className="mt-3 leading-relaxed text-muted">
          Every recipe here opens straight into voice-guided cook mode. Say “next” to move through the steps, “set a timer
          for 10 minutes” when a step needs one, or “read aloud” to hear it spoken. They work offline and they are always
          free. Have your own recipe? <Link href="/" className="text-ink underline underline-offset-4">Paste a link or the text</Link> on the home page.
        </p>
      </section>

      <ul className="grid gap-4 px-5 sm:grid-cols-2">
        {DEFAULT_RECIPES.map((r) => {
          const time = formatMinutes(r.totalMinutes);
          return (
            <li key={r.id}>
              <Link href={`/cook/${r.id}`} className="group block rounded-3xl border border-line bg-card p-3 active:bg-paper">
                {r.image && (
                  <Image
                    src={r.image}
                    alt={r.title}
                    width={1000}
                    height={800}
                    sizes="(min-width: 640px) 280px, 100vw"
                    className="aspect-[4/3] w-full rounded-2xl bg-oat object-cover"
                  />
                )}
                <h2 className="mt-3 px-1 font-serif text-[1.25rem] leading-tight">{r.title}</h2>
                {r.description && <p className="mt-1 px-1 text-sm leading-relaxed text-muted">{r.description}</p>}
                <p className="mt-2 flex items-center gap-3 px-1 pb-1 text-xs text-muted">
                  {time && (
                    <span className="flex items-center gap-1">
                      <ClockIcon width={12} height={12} /> {time}
                    </span>
                  )}
                  {r.yield && (
                    <span className="flex items-center gap-1">
                      <UsersIcon width={12} height={12} /> {r.yield}
                    </span>
                  )}
                  <span className="ml-auto text-clay">Cook by voice</span>
                </p>
              </Link>
            </li>
          );
        })}
      </ul>

      <SiteFooter />
    </main>
  );
}
