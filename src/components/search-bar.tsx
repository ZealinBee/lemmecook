"use client";

import { useState, type FormEvent } from "react";
import { looksLikeUrl } from "@/hooks/use-open-recipe";
import { ArrowRightIcon, CloseIcon, LinkIcon, SearchIcon } from "./icons";

/** One box for both: type to search, or paste a link to import. */
export function SearchBar({
  value,
  onChange,
  onSubmit,
  busy,
  autoFocus,
  onPasteText,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  busy?: boolean;
  autoFocus?: boolean;
  /** Gets first look at pasted text (e.g. a whole recipe); return true if handled. */
  onPasteText?: (text: string) => boolean;
}) {
  const [focused, setFocused] = useState(false);
  const isUrl = looksLikeUrl(value);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (value.trim() && !busy) onSubmit(value.trim());
  }

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text && !onPasteText?.(text)) onChange(text.trim());
    } catch {}
  }

  return (
    <form onSubmit={submit} role="search">
      <div
        className={`flex h-14 items-center gap-2 rounded-full border bg-card pr-1.5 pl-4 transition shadow-[0_6px_24px_-14px_rgba(20,20,19,0.25)] ${
          focused ? "border-clay/60" : "border-line"
        }`}
      >
        {isUrl ? (
          <LinkIcon className="shrink-0 text-clay" width={20} height={20} />
        ) : (
          <SearchIcon className="shrink-0 text-muted" width={20} height={20} />
        )}
        <input
          type="search"
          enterKeyHint={isUrl ? "go" : "search"}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          autoFocus={autoFocus}
          placeholder="Search recipes or paste a link"
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onChange(e.target.value)}
          onPaste={(e) => {
            if (onPasteText?.(e.clipboardData.getData("text"))) e.preventDefault();
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-[1rem] text-ink outline-none placeholder:text-muted/80 [&::-webkit-search-cancel-button]:hidden"
        />
        {value ? (
          <>
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Clear"
              className="grid size-8 shrink-0 place-items-center rounded-full text-muted active:bg-oat"
            >
              <CloseIcon width={16} height={16} />
            </button>
            <button
              type="submit"
              disabled={busy}
              aria-label={isUrl ? "Import recipe" : "Search"}
              className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-medium text-ivory transition active:scale-[0.96] disabled:opacity-50"
            >
              {busy ? (
                <span className="eq flex items-end gap-[3px]" aria-label="Loading">
                  <span /><span /><span /><span />
                </span>
              ) : isUrl ? (
                <>
                  Import <ArrowRightIcon width={16} height={16} />
                </>
              ) : (
                <ArrowRightIcon width={18} height={18} />
              )}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={paste}
            className="h-11 shrink-0 rounded-full px-4 text-sm font-medium text-ink-soft active:bg-oat"
          >
            Paste link
          </button>
        )}
      </div>
    </form>
  );
}
