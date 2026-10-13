import Link from "next/link";
import type { ReactNode } from "react";
import { AppIcon } from "@/components/icons";
import { DEFAULT_RECIPES } from "@/lib/default-recipes";
import { LANDING_PAGES } from "@/lib/landing-pages";
import { SITE_NAME } from "@/lib/site";

/** The small top bar shared by the home page and the landing pages. */
export function SiteHeader() {
  return (
    <header className="flex items-center gap-2 px-5 py-3">
      <Link href="/" className="flex items-center gap-2">
        <AppIcon width={26} height={26} />
        <span className="font-serif text-[1.35rem] tracking-tight">{SITE_NAME}</span>
      </Link>
      <Link href="/premium" className="ml-auto rounded-full px-3 py-1.5 text-sm text-muted active:bg-oat">
        Premium
      </Link>
    </header>
  );
}

const footerLink = "text-ink-soft underline-offset-4 hover:underline";

/**
 * Footer with links to every landing page, so crawlers (and people) can reach them from
 * anywhere. Rendered on the server, so the links are in the HTML.
 */
export function SiteFooter() {
  const features = LANDING_PAGES.filter((p) => p.group === "feature");
  const compare = LANDING_PAGES.filter((p) => p.group === "compare");
  return (
    <footer className="mt-16 border-t border-line px-5 pt-10 pb-6 text-xs leading-relaxed text-muted">
      <nav aria-label="Site" className="mx-auto grid max-w-xl gap-8 sm:grid-cols-3">
        <div>
          <p className="mb-2 font-medium tracking-[0.1em] text-ink uppercase">Features</p>
          <ul className="grid gap-1.5">
            {features.map((p) => (
              <li key={p.slug}>
                <Link href={`/${p.slug}`} className={footerLink}>
                  {p.navLabel}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 font-medium tracking-[0.1em] text-ink uppercase">Compare</p>
          <ul className="grid gap-1.5">
            {compare.map((p) => (
              <li key={p.slug}>
                <Link href={`/${p.slug}`} className={footerLink}>
                  {p.navLabel}
                </Link>
              </li>
            ))}
            <li className="pt-3">
              <Link href="/premium" className={footerLink}>
                Premium
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-2 font-medium tracking-[0.1em] text-ink uppercase">Recipes</p>
          <ul className="grid gap-1.5">
            <li>
              <Link href="/recipes" className={footerLink}>
                All recipes to cook by voice
              </Link>
            </li>
            {DEFAULT_RECIPES.slice(0, 6).map((r) => (
              <li key={r.id}>
                <Link href={`/cook/${r.id}`} className={footerLink}>
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      <div className="mx-auto mt-10 max-w-xl text-center">
        <p>{SITE_NAME} is a hands-free, voice-guided cooking assistant that works in your browser.</p>
        <p className="mt-1">Search powered by TheMealDB. Allow the microphone for voice control.</p>
      </div>
    </footer>
  );
}

export function Section({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section>
      {eyebrow && <p className="text-xs font-medium tracking-[0.12em] text-clay uppercase">{eyebrow}</p>}
      <h2 className="mt-2 font-serif text-[1.9rem] leading-[1.1] tracking-[-0.015em]">{title}</h2>
      {intro && <p className="mt-3 leading-relaxed text-muted">{intro}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}
