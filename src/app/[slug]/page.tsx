import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HomeSearch } from "@/components/home-search";
import { Section, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getDefaultRecipe } from "@/lib/default-recipes";
import { getLandingPage, LANDING_PAGES, type LandingSection } from "@/lib/landing-pages";
import { SITE_NAME, SITE_OPEN_GRAPH, SITE_URL } from "@/lib/site";

/** Every landing page is prerendered; anything else under / is a 404. */
export function generateStaticParams() {
  return LANDING_PAGES.map((p) => ({ slug: p.slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = getLandingPage(slug);
  if (!page) return {};
  const title = `${page.title} · ${SITE_NAME}`;
  return {
    title: { absolute: title },
    description: page.description,
    alternates: { canonical: `/${page.slug}` },
    openGraph: { ...SITE_OPEN_GRAPH, title, description: page.description, url: `/${page.slug}` },
    twitter: { card: "summary_large_image", title, description: page.description },
  };
}

function Headline({ text, highlight }: { text: string; highlight?: string }) {
  const i = highlight ? text.indexOf(highlight) : -1;
  if (i < 0 || !highlight) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <em className="text-clay italic">{highlight}</em>
      {text.slice(i + highlight.length)}
    </>
  );
}

function Body({ section }: { section: LandingSection }) {
  return (
    <>
      {section.body && (
        <div className="grid gap-4">
          {section.body.map((p) => (
            <p key={p.slice(0, 40)} className="leading-relaxed text-ink-soft">
              {p}
            </p>
          ))}
        </div>
      )}
      {section.items && (
        <ul className={`grid gap-3 ${section.body ? "mt-5" : ""} sm:grid-cols-2`}>
          {section.items.map((it) => (
            <li key={it.title} className="rounded-3xl border border-line bg-card p-5">
              <h3 className="font-medium text-ink">{it.title}</h3>
              <p className="mt-1 text-[0.95rem] leading-relaxed text-muted">{it.body}</p>
            </li>
          ))}
        </ul>
      )}
      {section.commands && (
        <ul className={`grid gap-2 ${section.body || section.items ? "mt-5" : ""}`}>
          {section.commands.map(([phrase, what]) => (
            <li key={phrase} className="flex items-baseline justify-between gap-4 rounded-2xl bg-paper px-4 py-3">
              <span className="font-serif text-[1.05rem]">{phrase}</span>
              <span className="text-right text-xs text-muted">{what}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default async function LandingPage({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const page = getLandingPage(slug);
  if (!page) notFound();

  const related = page.related.map(getLandingPage).filter((p) => p !== undefined);
  const recipes = page.recipes.map(getDefaultRecipe).filter((r) => r !== undefined);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: page.navLabel, item: `${SITE_URL}/${page.slug}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faqs.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ];

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-xl flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <SiteHeader />

      <section className="rise px-5 pt-8 pb-6">
        <p className="text-xs font-medium tracking-[0.12em] text-clay uppercase">{page.eyebrow}</p>
        <h1 className="mt-2 font-serif text-[2.4rem] leading-[1.05] tracking-[-0.02em] text-ink">
          <Headline text={page.headline} highlight={page.highlight} />
        </h1>
        <p className="mt-3 text-[1.02rem] leading-relaxed text-muted">{page.intro}</p>
      </section>

      <HomeSearch />

      <div className="mt-16 grid gap-16 px-5">
        {page.sections.map((s) => (
          <Section key={s.heading} title={s.heading}>
            <Body section={s} />
          </Section>
        ))}

        <Section eyebrow="Try it now" title="Cook one of these by voice" intro="Open a recipe, tap Start cooking and say “next”.">
          <ul className="flex flex-wrap gap-2">
            {recipes.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/cook/${r.id}`}
                  className="block rounded-full border border-line bg-card px-4 py-2 text-sm text-ink-soft active:bg-oat"
                >
                  {r.title}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/recipes" className="block rounded-full px-4 py-2 text-sm text-clay underline-offset-4 hover:underline">
                All recipes
              </Link>
            </li>
          </ul>
        </Section>

        <Section eyebrow="FAQ" title="Questions">
          <div className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-card">
            {page.faqs.map(({ q, a }) => (
              <details key={q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink [&::-webkit-details-marker]:hidden">
                  <h3>{q}</h3>
                  <span aria-hidden className="text-xl leading-none text-muted transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-2 leading-relaxed text-muted">{a}</p>
              </details>
            ))}
          </div>
        </Section>

        <Section eyebrow="Keep reading" title="More about cooking by voice">
          <ul className="grid gap-2">
            {related.map((p) => (
              <li key={p.slug}>
                <Link href={`/${p.slug}`} className="block rounded-2xl bg-paper px-4 py-3 text-ink-soft active:bg-oat">
                  {p.navLabel}
                  <span className="mt-0.5 block text-xs text-muted">{p.headline}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>

        {page.note && <p className="text-xs leading-relaxed text-muted">{page.note}</p>}
      </div>

      <SiteFooter />
    </main>
  );
}
