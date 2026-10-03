"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, CheckIcon, SparkIcon } from "@/components/icons";
import { useOpenRecipe } from "@/hooks/use-open-recipe";
import { bookmarkletHref, readPayload } from "@/lib/bookmarklet";
import { extractRecipe } from "@/lib/parse-recipe";
import { parseRecipeText } from "@/lib/parse-text";

type Status = "setup" | "reading" | "failed";

/**
 * Two jobs: receives recipes from the bookmarklet (in the URL fragment), and teaches people to
 * install it — it's how we read sites that block servers but not the person's own browser.
 */
export default function ImportPage() {
  const { open } = useOpenRecipe();
  const [status, setStatus] = useState<Status>("setup");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const link = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const href = bookmarkletHref(window.location.origin);
    // React refuses javascript: URLs in props, so the bookmarklet's href is set directly.
    link.current?.setAttribute("href", href);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the origin is only known in the browser
    setCode(href);

    const payload = readPayload(window.location.hash);
    if (!payload) return;
    // Drop the fragment so Back from the recipe doesn't import it twice.
    history.replaceState(null, "", "/import");
    setStatus("reading");

    const hostname = new URL(payload.u).hostname.replace(/^www\./, "");
    const structured = extractRecipe(payload.h, payload.u);
    const text = structured ? null : parseRecipeText(payload.x);
    const recipe =
      structured ??
      (text && {
        ...text,
        origin: "link" as const,
        sourceUrl: payload.u,
        siteName: hostname,
        title: text.title === "Untitled recipe" ? payload.t || text.title : text.title,
      });
    if (!recipe) return setStatus("failed");
    open({ ...recipe, id: crypto.randomUUID().slice(0, 8), savedAt: Date.now() });
  }, [open]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  if (status === "reading") {
    return (
      <main className="safe-top grid min-h-dvh place-items-center px-5">
        <p className="flex items-center gap-2 text-muted">
          <SparkIcon className="animate-spin text-clay" width={18} height={18} /> Reading the recipe…
        </p>
      </main>
    );
  }

  return (
    <main className="safe-top safe-bottom mx-auto min-h-dvh max-w-xl px-5">
      <header className="flex items-center gap-2 py-3">
        <Link href="/" aria-label="Back" className="-ml-2 grid size-10 place-items-center rounded-full active:bg-oat">
          <ArrowLeftIcon />
        </Link>
        <span className="font-serif text-[1.35rem] tracking-tight">Lemme Cook</span>
      </header>

      {status === "failed" && (
        <p role="alert" className="mt-4 rounded-2xl bg-clay-wash px-4 py-3 text-sm text-clay-deep">
          Couldn&apos;t find a recipe on that page. Select the ingredients and steps on the page, then tap the bookmark
          again.
        </p>
      )}

      <section className="pt-6">
        <h1 className="font-serif text-[2.2rem] leading-[1.1] tracking-[-0.02em] text-ink">
          Cook from <em className="text-clay italic">any</em> recipe site
        </h1>
        <p className="mt-3 text-[1.02rem] leading-relaxed text-muted">
          Some sites block apps from reading their pages. This bookmark reads the recipe in your own browser, from the
          page you already have open, and sends it here.
        </p>
      </section>

      <section className="mt-8 rounded-3xl border border-line bg-card p-5">
        <h2 className="font-serif text-[1.3rem]">On a computer</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">Drag this button to your bookmarks bar:</p>
        <a
          ref={link}
          onClick={(e) => e.preventDefault()}
          className="mt-4 inline-flex h-12 cursor-grab items-center gap-2 rounded-full bg-ink px-6 text-[0.95rem] font-medium text-ivory"
        >
          <SparkIcon width={16} height={16} /> Send to Lemme Cook
        </a>
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          On a recipe page, click the bookmark and the recipe opens here.
        </p>
      </section>

      <section className="mt-4 rounded-3xl border border-line bg-card p-5">
        <h2 className="font-serif text-[1.3rem]">On a phone</h2>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ink-soft">
          <li>Bookmark any page, for example this one.</li>
          <li>Edit that bookmark: name it “Send to Lemme Cook”, and replace its address with the copied code.</li>
          <li>On a recipe page, open your bookmarks and tap it. In Chrome, you can also type the name in the address bar.</li>
        </ol>
        <button
          onClick={copy}
          disabled={!code}
          className="mt-4 inline-flex h-11 items-center gap-2 rounded-full border border-line px-5 text-sm text-ink active:bg-oat"
        >
          {copied ? (
            <>
              <CheckIcon width={16} height={16} /> Copied
            </>
          ) : (
            "Copy bookmark code"
          )}
        </button>
      </section>

      <p className="mt-8 pb-10 text-center text-sm text-muted">
        Or copy the recipe text and{" "}
        <Link href="/" className="underline decoration-line underline-offset-4">
          paste it on the home screen
        </Link>
        .
      </p>
    </main>
  );
}
