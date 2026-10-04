import type { Metadata } from "next";
import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { HomeSearch } from "@/components/home-search";
import {
  AppIcon,
  CheckIcon,
  LinkIcon,
  ListIcon,
  MicIcon,
  SpeakerIcon,
  SunIcon,
  TimerIcon,
  UsersIcon,
} from "@/components/icons";
import { DEFAULT_RECIPES } from "@/lib/default-recipes";
import { PLANS } from "@/lib/plans";
import { SITE_DESCRIPTION, SITE_NAME, SITE_OPEN_GRAPH, SITE_TITLE, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { ...SITE_OPEN_GRAPH, title: SITE_TITLE, description: SITE_DESCRIPTION, url: "/" },
};

const STEPS = [
  {
    title: "Find a recipe",
    body: "Paste a link from your favorite recipe site, paste the recipe text itself, or search for one. Lemme Cook pulls out the ingredients and steps and drops the ads, pop-ups and life stories.",
  },
  {
    title: "Get your ingredients ready",
    body: "Check items off as you gather them, and scale the recipe to half, double or any custom amount. Quantities update for you.",
  },
  {
    title: "Cook with your voice",
    body: "Tap Start cooking and talk to your recipe. Say “next”, “go back”, “set a timer for 10 minutes” or “read aloud”. Your hands stay on the food, not the screen.",
  },
];

const COMMANDS: [string, string][] = [
  ["“Next” / “Done”", "Go to the next step"],
  ["“Back”", "Go to the previous step"],
  ["“Go to step 4”", "Jump straight to any step"],
  ["“Read aloud” / “Repeat”", "Hear the current step spoken"],
  ["“Stop” / “Quiet”", "Stop reading"],
  ["“Ingredients”", "Show the ingredient list"],
  ["“Close”", "Hide the list again"],
  ["“Set a timer for 10 minutes”", "Start a kitchen timer"],
  ["“How long is left?”", "Check your timers"],
  ["“Cancel timer”", "Stop the latest timer"],
];

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const FEATURES: { icon: Icon; title: string; body: string }[] = [
  {
    icon: MicIcon,
    title: "Hands-free voice control",
    body: "Move between steps by voice while you knead, chop or handle raw meat. The mic stays on for the whole recipe, so you never need to tap it again.",
  },
  {
    icon: SpeakerIcon,
    title: "Steps read aloud",
    body: "Say “read aloud” and the current step is spoken, so you can keep your eyes on the pan. Reading works in English, Spanish, French, German, Italian, Russian, Japanese and many other languages.",
  },
  {
    icon: TimerIcon,
    title: "Voice kitchen timers",
    body: "Set timers by voice, or tap the times written in a step: “simmer for 20 minutes” becomes a one-tap timer. Run several at once and ask how long is left.",
  },
  {
    icon: SunIcon,
    title: "Screen stays awake",
    body: "Your phone or tablet screen won't dim or lock while you cook, so the recipe is always there when you look up.",
  },
  {
    icon: LinkIcon,
    title: "Works with almost any recipe",
    body: "Food blogs, big recipe sites and family recipes typed out in a note all work. If a site blocks the link, paste the recipe text instead.",
  },
  {
    icon: UsersIcon,
    title: "Scale servings",
    body: "Halve, double or set your own multiplier. Every quantity, from “1½ tsp” to “2,5 dl”, is recalculated into kitchen-friendly fractions.",
  },
  {
    icon: ListIcon,
    title: "Ingredient checklist",
    body: "Tick off ingredients as you set them out, and pull up the list mid-recipe by saying “ingredients”.",
  },
  {
    icon: CheckIcon,
    title: "No app, no account",
    body: "Lemme Cook runs in your browser on iPhone, Android, iPad or laptop. Add it to your home screen and it opens like an app. Recipes you cook are saved on your device.",
  },
];

const REASONS = [
  {
    title: "Messy hands, clean phone",
    body: "Flour, butter, raw chicken and dough don't belong on a touchscreen. Voice-guided cooking lets you move through a recipe without wiping your hands every thirty seconds.",
  },
  {
    title: "Never lose your place",
    body: "Recipe pages are long, and scrolling past ads with a wooden spoon in hand is how steps get skipped. Lemme Cook shows one step at a time in large type you can read from across the counter.",
  },
  {
    title: "Easier for new cooks",
    body: "Hearing each step aloud and having timers set for you takes the stress out of a new recipe. Focus on technique, not on keeping track.",
  },
  {
    title: "Accessible cooking",
    body: "Big text, spoken steps and voice navigation help people with low vision, limited mobility or dyslexia cook more independently.",
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is hands-free cooking?",
    a: "Hands-free cooking means following a recipe without touching your phone or tablet. With Lemme Cook you control the recipe by voice: say “next” to move on, “back” to go back, or “set a timer” to start a countdown, so your hands stay free for cooking.",
  },
  {
    q: "How does voice-guided cooking work in Lemme Cook?",
    a: "Paste a recipe link or text, then tap Start cooking and allow the microphone. Lemme Cook shows one step at a time and listens for short commands like “next”, “repeat” and “ingredients”. Say “read aloud” any time to hear the current step.",
  },
  {
    q: "Is Lemme Cook free?",
    a: "Yes. You can cook 3 new recipes a month for free in your browser, with no account or sign-up, and the built-in recipes are always free. Premium ($9.99 a month or $99.99 a year) unlocks unlimited recipes.",
  },
  {
    q: "Do I need to download an app?",
    a: "No. Lemme Cook is a web app that runs in Safari, Chrome, Edge and other modern browsers on phones, tablets and computers. You can add it to your home screen for one-tap access.",
  },
  {
    q: "Which recipe websites does it work with?",
    a: "Most recipe sites publish their recipes in a standard format that Lemme Cook can read, including big recipe sites and food blogs. If a site blocks the link, copy the recipe from the page and paste the text instead. Lemme Cook will find the ingredients and steps.",
  },
  {
    q: "Is the microphone always listening?",
    a: "Only while you're cooking a recipe, and you can turn it off with one tap. Lemme Cook listens for a small set of cooking commands. Once its on-device voice model has loaded, recognition runs locally in your browser.",
  },
  {
    q: "Can it read recipes aloud in other languages?",
    a: "Yes. Lemme Cook detects the recipe's language and reads steps aloud with a matching voice from your device, including Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean and Chinese. Voice commands are in English.",
  },
  {
    q: "Can I set multiple cooking timers by voice?",
    a: "Yes. Say “set a timer for 10 minutes” as many times as you need. Each timer counts down on screen, and you can ask “how long is left?” or say “cancel timer”.",
  },
  {
    q: "Can I scale a recipe up or down?",
    a: "Yes. On the ingredients list, choose ½×, 1×, 1½×, 2× or a custom amount, and every quantity is recalculated.",
  },
  {
    q: "How is this different from asking a smart speaker for a recipe?",
    a: "Smart speakers read from their own recipe sources and you can't see the steps. Lemme Cook works with the recipe you already picked, from any site, and shows each step on screen while you control it by voice. You don't need any extra device.",
  },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Any (web browser)",
    browserRequirements: "Requires a modern browser with microphone access for voice control.",
    offers: [
      { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
      ...Object.values(PLANS).map((p) => ({
        "@type": "Offer",
        name: `Premium (${p.label})`,
        price: p.price.replace("$", ""),
        priceCurrency: "USD",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: p.price.replace("$", ""),
          priceCurrency: "USD",
          billingDuration: p.per === "year" ? "P1Y" : "P1M",
        },
      })),
    ],
    featureList: FEATURES.map((f) => f.title),
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  },
];

export default function Home() {
  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-xl flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <header className="flex items-center gap-2 px-5 py-3">
        <AppIcon width={26} height={26} />
        <span className="font-serif text-[1.35rem] tracking-tight">{SITE_NAME}</span>
        <Link href="/premium" className="ml-auto rounded-full px-3 py-1.5 text-sm text-muted active:bg-oat">
          Premium
        </Link>
      </header>

      <section className="rise px-5 pt-8 pb-6">
        <p className="text-xs font-medium tracking-[0.12em] text-clay uppercase">Voice-guided cooking</p>
        <h1 className="mt-2 font-serif text-[2.6rem] leading-[1.05] tracking-[-0.02em] text-ink">
          Cook <em className="text-clay italic">hands‑free</em>, one step at a time
        </h1>
        <p className="mt-3 text-[1.02rem] leading-relaxed text-muted">
          Paste any recipe link or text, then cook with your voice. Say “next”, set timers and hear steps read aloud
          without touching your phone with messy hands.
        </p>
      </section>

      <HomeSearch />

      <div className="mt-16 grid gap-16 px-5">
        <Section eyebrow="How it works" title="Hands-free cooking in three steps">
          <ol className="grid gap-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4 rounded-3xl border border-line bg-card p-5">
                <span className="font-serif text-2xl leading-none text-clay tabular-nums">{i + 1}</span>
                <div>
                  <h3 className="font-medium text-ink">{s.title}</h3>
                  <p className="mt-1 text-[0.95rem] leading-relaxed text-muted">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section
          eyebrow="Voice commands"
          title="Talk to your recipe"
          intro="Lemme Cook understands short, natural phrases so you can control the recipe from across the kitchen. You can also tap the right side of the screen for next and the left for back, or swipe."
        >
          <ul className="grid gap-2">
            {COMMANDS.map(([phrase, what]) => (
              <li key={phrase} className="flex items-baseline justify-between gap-4 rounded-2xl bg-paper px-4 py-3">
                <span className="font-serif text-[1.05rem]">{phrase}</span>
                <span className="text-right text-xs text-muted">{what}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section eyebrow="Features" title="A voice cooking assistant for the recipes you already love">
          <ul className="grid gap-3 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="rounded-3xl border border-line bg-card p-5">
                <Icon width={22} height={22} className="text-clay" />
                <h3 className="mt-3 font-medium text-ink">{title}</h3>
                <p className="mt-1 text-[0.95rem] leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section eyebrow="Why voice?" title="Why cook hands-free?">
          <div className="grid gap-6">
            {REASONS.map((r) => (
              <div key={r.title}>
                <h3 className="font-serif text-xl">{r.title}</h3>
                <p className="mt-1.5 leading-relaxed text-ink-soft">{r.body}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section
          eyebrow="Try it now"
          title="Recipes to cook with your voice"
          intro="Not sure where to start? Open one of these and say “next” to see how voice-guided cooking feels."
        >
          <ul className="flex flex-wrap gap-2">
            {DEFAULT_RECIPES.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/cook/${r.id}`}
                  className="block rounded-full border border-line bg-card px-4 py-2 text-sm text-ink-soft active:bg-oat"
                >
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </Section>

        <Section eyebrow="FAQ" title="Questions about voice cooking">
          <div className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-card">
            {FAQS.map(({ q, a }) => (
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
      </div>

      <footer className="mt-16 px-5 pt-10 pb-6 text-center text-xs leading-relaxed text-muted">
        <p>
          {SITE_NAME} is a hands-free, voice-guided cooking assistant that works in your browser.
        </p>
        <p className="mt-1">Search powered by TheMealDB. Allow the microphone for voice control.</p>
      </footer>
    </main>
  );
}

function Section({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <p className="text-xs font-medium tracking-[0.12em] text-clay uppercase">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-[1.9rem] leading-[1.1] tracking-[-0.015em]">{title}</h2>
      {intro && <p className="mt-3 leading-relaxed text-muted">{intro}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}
