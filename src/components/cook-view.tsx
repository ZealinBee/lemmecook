"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import {
  ArrowLeftIcon,
  CheckIcon,
  ClockIcon,
  CloseIcon,
  HelpIcon,
  ListIcon,
  MicIcon,
  MicOffIcon,
  SparkIcon,
  SpeakerIcon,
  SpeakerOffIcon,
  SunIcon,
  TimerIcon,
  UsersIcon,
} from "@/components/icons";
import { RecipeCard } from "@/components/recipe-card";
import { RecipeCover } from "@/components/recipe-cover";
import { useOpenRecipe } from "@/hooks/use-open-recipe";
import { useRecipes } from "@/hooks/use-recipes";
import { useSpeech } from "@/hooks/use-speech";
import { detectLanguage, stepPrefix } from "@/lib/language";
import { getDefaultRecipe, suggestDefaults } from "@/lib/default-recipes";
import { formatScale, scaleIngredient, SCALES } from "@/lib/scale";
import { useTimers, type Timer } from "@/hooks/use-timers";
import { useVoiceControl } from "@/hooks/use-voice-control";
import { useWakeLock } from "@/hooks/use-wake-lock";
import type { Recipe } from "@/lib/types";
import {
  findStepTimers,
  formatClock,
  formatMinutes,
  parseCommand,
  speakDuration,
} from "@/lib/voice-commands";

type View = "overview" | "steps" | "done";
type Sheet = null | "ingredients" | "help";

export function CookView({ id }: { id: string }) {
  const { recipes, ready } = useRecipes();
  const recipe = recipes.find((r) => r.id === id) ?? getDefaultRecipe(id);

  if (recipe) return <Cook recipe={recipe} />;
  if (!ready) return <div className="min-h-dvh bg-ivory" />;
  return <NotFound />;
}

function NotFound() {
  const { open } = useOpenRecipe();
  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-xl flex-col px-5">
      <div className="flex flex-col items-center gap-3 pt-20 pb-10 text-center">
        <SparkIcon className="text-clay" width={28} height={28} />
        <h1 className="font-serif text-3xl">Recipe not found</h1>
        <p className="text-muted">It may have been removed from this device.</p>
        <Link href="/" className="mt-3 rounded-full bg-ink px-6 py-3 text-sm font-medium text-ivory">
          Find a recipe
        </Link>
      </div>
      <SuggestionGrid title="Or try one of ours" onOpen={open} />
    </main>
  );
}

function SuggestionGrid({ title, excludeId, onOpen }: { title: string; excludeId?: string; onOpen: (r: Recipe) => void }) {
  return (
    <section className="w-full text-left">
      <h2 className="mb-3 font-serif text-[1.35rem]">{title}</h2>
      <div className="grid grid-cols-3 gap-3">
        {suggestDefaults(excludeId).map((r) => (
          <RecipeCard key={r.id} recipe={r} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

function Cook({ recipe }: { recipe: Recipe }) {
  const total = recipe.steps.length;
  const [view, setView] = useState<View>("overview");
  const [step, setStep] = useState(0);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [checked, setChecked] = useState<Set<number>>(() => new Set());
  const [scale, setScale] = useState(1);
  const [toast, setToast] = useState<string | null>(null);

  const screenOn = useWakeLock(true);

  // Ref so voice callbacks always see current state without re-subscribing.
  const state = useRef({ view, step });
  useEffect(() => {
    state.current = { view, step };
  });

  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flash = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const speech = useSpeech();
  const timers = useTimers((t: Timer) => {
    flash(`${t.label} — time’s up`);
  });

  const lang = useMemo(() => detectLanguage(recipe.steps.map((s) => s.text).join(" ")), [recipe.steps]);

  const stepScript = useCallback(
    (i: number) => {
      const s = recipe.steps[i];
      if (!s) return "";
      const prefix = stepPrefix(lang, i, i === total - 1 && total > 1);
      return `${prefix} ${s.section && s.section !== recipe.steps[i - 1]?.section ? `${s.section}. ` : ""}${s.text}`;
    },
    [recipe.steps, total, lang],
  );

  // Only ever speaks when asked ("read aloud" or the button) — never automatically.
  const { stop: stopSpeaking } = speech;

  const repeat = useCallback(() => {
    const { view: v, step: s } = state.current;
    if (!speech.supported) return flash("Read aloud isn't supported in this browser");
    if (v === "steps") speech.speak(stepScript(s), lang);
    else flash("Start cooking to hear the steps");
  }, [flash, speech, stepScript, lang]);

  const goTo = useCallback(
    (i: number) => {
      stopSpeaking();
      if (i >= total) return setView("done");
      setStep(Math.max(0, i));
      setView("steps");
      setSheet(null);
    },
    [total, stopSpeaking],
  );

  const handleTranscript = useCallback(
    (text: string) => {
      // The mic hears the speaker too — don't act on our own words.
      if (speech.isEcho(text)) return;
      const cmd = parseCommand(text);
      // Long phrases without a command are usually background chatter.
      if (!cmd) {
        if (text.split(/\s+/).length <= 6) flash(`“${text}” — say “help” for commands`);
        return;
      }
      const { view: v, step: s } = state.current;
      switch (cmd.type) {
        case "next":
          return goTo(v === "steps" ? s + 1 : v === "done" ? s : 0);
        case "previous":
          return goTo(v === "done" ? total - 1 : s - 1);
        case "goto":
          return goTo(cmd.step === -1 ? total - 1 : Math.min(cmd.step, total) - 1);
        case "ingredients":
          return setSheet("ingredients");
        case "close":
          return setSheet(null);
        case "steps":
          return goTo(s);
        case "timer":
          timers.add(cmd.seconds, cmd.label ?? speakDuration(cmd.seconds));
          return flash(`Timer set · ${formatClock(cmd.seconds)}`);
        case "cancel-timer": {
          const running = timers.timers.filter((t) => !t.done);
          const last = running.at(-1) ?? timers.timers.at(-1);
          if (!last) return flash("No timer running");
          timers.remove(last.id);
          return flash("Timer cancelled");
        }
        case "time-left": {
          const running = timers.timers.filter((t) => !t.done);
          if (!running.length) return flash("No timers running");
          return flash(running.map((t) => `${t.label}: ${formatClock(timers.remaining(t))}`).join(" · "));
        }
        case "repeat":
          return repeat();
        case "quiet":
          return speech.stop();
        case "help":
          return setSheet("help");
      }
    },
    [flash, goTo, timers, total, repeat, speech],
  );

  const voice = useVoiceControl(handleTranscript);

  // While we read aloud the mic hears the speaker; drop that half-heard phrase once reading ends
  // so it doesn't swallow whatever the cook says next.
  const { reset: resetVoice } = voice;
  const wasSpeaking = useRef(false);
  useEffect(() => {
    if (wasSpeaking.current && !speech.speaking) resetVoice();
    wasSpeaking.current = speech.speaking;
  }, [speech.speaking, resetVoice]);

  function startCooking(at = 0) {
    if (voice.supported && !voice.listening) voice.start();
    goTo(at);
  }

  function toggleMic() {
    if (!voice.supported) return flash("Voice control isn't supported in this browser");
    if (voice.listening) {
      voice.stop();
      flash("Voice control off");
    } else {
      voice.start();
      flash("Listening — say “next”");
    }
  }

  const toggleChecked = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const controls = (
    <ControlBar
      listening={voice.listening}
      loading={voice.loading}
      supported={voice.supported}
      lastHeard={voice.lastHeard}
      error={voice.error}
      onMic={toggleMic}
      onHelp={() => setSheet("help")}
      onIngredients={() => setSheet("ingredients")}
    />
  );

  return (
    <>
      {view === "overview" && (
        <Overview
          recipe={recipe}
          screenOn={screenOn}
          checked={checked}
          onToggle={toggleChecked}
          scale={scale}
          onScale={setScale}
          onStart={startCooking}
        />
      )}

      {view === "steps" && (
        <StepView
          recipe={recipe}
          step={step}
          onPrev={() => goTo(step - 1)}
          onNext={() => goTo(step + 1)}
          onClose={() => setView("overview")}
          speech={speech.supported ? { speaking: speech.speaking, onRead: repeat, onStop: stopSpeaking } : undefined}
          onTimer={(secs, label) => {
            timers.add(secs, label);
            flash(`Timer set · ${formatClock(secs)}`);
          }}
          controls={controls}
        />
      )}

      {view === "done" && (
        <DoneView
          recipe={recipe}
          onBack={() => goTo(total - 1)}
          onRestart={() => {
            setChecked(new Set());
            setView("overview");
          }}
        />
      )}

      <TimerStrip
        timers={timers.timers}
        remaining={timers.remaining}
        onDismiss={timers.remove}
        raised={view === "steps"}
      />

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 safe-top">
          <div className="rise mt-2 rounded-full bg-ink px-4 py-2.5 text-sm text-ivory shadow-lg">{toast}</div>
        </div>
      )}

      <BottomSheet open={sheet === "ingredients"} onClose={() => setSheet(null)} title="Ingredients">
        <ScalePicker scale={scale} onScale={setScale} className="mb-3" />
        <IngredientList items={recipe.ingredients} scale={scale} checked={checked} onToggle={toggleChecked} />
      </BottomSheet>

      <BottomSheet open={sheet === "help"} onClose={() => setSheet(null)} title="Say things like…">
        <ul className="grid gap-2 pb-2">
          {[
            ["“Next” / “Done”", "Go to the next step"],
            ["“Back”", "Previous step"],
            ["“Go to step 4”", "Jump to a step"],
            ["“Ingredients”", "Show the list"],
            ["“Close”", "Hide the list"],
            ["“Set a timer for 10 minutes”", "Starts a countdown"],
            ["“How long is left?”", "Show remaining time"],
            ["“Cancel timer”", "Stops the latest timer"],
            ...(speech.supported
              ? [
                  ["“Read aloud” / “Repeat”", "Reads the step aloud"],
                  ["“Stop” / “Quiet”", "Stops reading"],
                ]
              : []),
          ].map(([phrase, what]) => (
            <li key={phrase} className="flex items-baseline justify-between gap-4 rounded-2xl bg-paper px-4 py-3">
              <span className="font-serif text-[1.05rem]">{phrase}</span>
              <span className="text-right text-xs text-muted">{what}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-center text-xs text-muted">
          Or tap the right side of the screen for next, left for back. Swiping works too.
        </p>
      </BottomSheet>
    </>
  );
}

/* ---------------------------------- Views --------------------------------- */

function Overview({
  recipe,
  screenOn,
  checked,
  onToggle,
  scale,
  onScale,
  onStart,
}: {
  recipe: Recipe;
  screenOn: boolean;
  checked: Set<number>;
  onToggle: (i: number) => void;
  scale: number;
  onScale: (f: number) => void;
  onStart: (at?: number) => void;
}) {
  const meta = [
    { label: "Prep", value: formatMinutes(recipe.prepMinutes), icon: ClockIcon },
    { label: "Cook", value: formatMinutes(recipe.cookMinutes), icon: ClockIcon },
    { label: "Total", value: formatMinutes(recipe.totalMinutes), icon: ClockIcon },
    { label: "Serves", value: recipe.yield && scaleIngredient(recipe.yield, scale), icon: UsersIcon },
  ].filter((m) => m.value);

  return (
    <main className="mx-auto min-h-dvh max-w-xl pb-36">
      <div className="safe-top sticky top-0 z-20 flex items-center justify-between bg-ivory/85 px-4 pb-2 backdrop-blur-md">
        <Link href="/" aria-label="Back" className="grid size-10 place-items-center rounded-full active:bg-oat">
          <ArrowLeftIcon />
        </Link>
        {screenOn && (
          <span className="flex items-center gap-1.5 rounded-full bg-paper px-3 py-1.5 text-xs text-ink-soft">
            <SunIcon width={14} height={14} className="text-clay" /> Screen stays on
          </span>
        )}
      </div>

      <div className="px-4">
        {(recipe.image || recipe.origin === "builtin") && (
          <RecipeCover recipe={recipe} variant="plain" className="rise aspect-[4/3] w-full rounded-[1.75rem]" />
        )}

        <header className="rise mt-6" style={{ animationDelay: "60ms" }}>
          {recipe.sourceUrl ? (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium tracking-[0.12em] text-clay uppercase"
            >
              {recipe.siteName}
              {recipe.author && <span className="text-muted normal-case tracking-normal"> · {recipe.author}</span>}
            </a>
          ) : (
            <p className="text-xs font-medium tracking-[0.12em] text-clay uppercase">{recipe.siteName}</p>
          )}
          <h1 className="mt-2 font-serif text-[2.2rem] leading-[1.08] tracking-[-0.015em]">{recipe.title}</h1>
          {recipe.description && (
            <p className="mt-3 line-clamp-3 leading-relaxed text-muted">{recipe.description}</p>
          )}
        </header>

        {meta.length > 0 && (
          <dl className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {meta.map((m) => (
              <div key={m.label} className="rounded-2xl bg-paper px-4 py-3">
                <dt className="text-[0.7rem] font-medium tracking-[0.1em] text-muted uppercase">{m.label}</dt>
                <dd className="mt-0.5 truncate font-serif text-lg">{m.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <section className="mt-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-2xl">Ingredients</h2>
            <span className="text-sm text-muted">
              {checked.size} of {recipe.ingredients.length} ready
            </span>
          </div>
          <ScalePicker scale={scale} onScale={onScale} className="mb-3" />
          <IngredientList items={recipe.ingredients} scale={scale} checked={checked} onToggle={onToggle} />
        </section>

        <section className="mt-10">
          <h2 className="mb-3 font-serif text-2xl">Method</h2>
          <ol className="grid gap-2">
            {recipe.steps.map((s, i) => (
              <li key={i}>
                {s.section && s.section !== recipe.steps[i - 1]?.section && (
                  <p className="mt-4 mb-2 text-xs font-medium tracking-[0.12em] text-muted uppercase">{s.section}</p>
                )}
                <button
                  onClick={() => onStart(i)}
                  className="flex w-full gap-4 rounded-2xl border border-line bg-card p-4 text-left active:bg-paper"
                >
                  <span className="font-serif text-lg text-clay tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <span className="line-clamp-3 text-[0.95rem] leading-relaxed text-ink-soft">{s.text}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-ivory via-ivory to-ivory/0 px-4 pt-8">
        <div className="mx-auto max-w-xl">
          <button
            onClick={() => onStart(0)}
            className="flex h-16 w-full items-center justify-center gap-3 rounded-full bg-clay text-[1.05rem] font-medium text-white shadow-[0_10px_30px_-10px_var(--clay)] transition active:scale-[0.98] active:bg-clay-deep"
          >
            <MicIcon width={20} height={20} />
            Start cooking · {recipe.steps.length} steps
          </button>
          <p className="mt-2 text-center text-xs text-muted">
            Voice control turns on when you start · say “read aloud” to hear a step
          </p>
        </div>
      </div>
    </main>
  );
}

function StepView({
  recipe,
  step,
  onPrev,
  onNext,
  onClose,
  onTimer,
  speech,
  controls,
}: {
  recipe: Recipe;
  step: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onTimer: (seconds: number, label: string) => void;
  speech?: { speaking: boolean; onRead: () => void; onStop: () => void };
  controls: ReactNode;
}) {
  const s = recipe.steps[step];
  const total = recipe.steps.length;
  const chips = findStepTimers(s.text);
  const start = useRef<{ x: number; y: number } | null>(null);

  const size =
    s.text.length < 110 ? "text-[2rem] leading-[1.18]" : s.text.length < 240 ? "text-[1.6rem] leading-[1.25]" : "text-[1.3rem] leading-[1.4]";

  function onPointerDown(e: PointerEvent) {
    start.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const from = start.current;
    start.current = null;
    if (!from) return;
    const dx = e.clientX - from.x;
    const dy = e.clientY - from.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) return dx < 0 ? onNext() : onPrev();
    if (Math.abs(dx) > 12 || Math.abs(dy) > 12) return; // scrolling, not a tap
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left < rect.width * 0.3) onPrev();
    else onNext();
  }

  return (
    <main className="fixed inset-0 z-10 flex flex-col bg-ivory">
      <div className="safe-top px-4">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <button onClick={onClose} aria-label="Exit cooking mode" className="grid size-10 place-items-center rounded-full active:bg-oat">
            <CloseIcon />
          </button>
          <p className="text-sm text-muted tabular-nums">
            Step <span className="font-medium text-ink">{step + 1}</span> of {total}
          </p>
          <span className="size-10" aria-hidden />
        </div>
        <div className="mx-auto mt-2 flex max-w-xl gap-1" aria-hidden>
          {recipe.steps.map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= step ? "bg-clay" : "bg-oat"}`}
            />
          ))}
        </div>
      </div>

      <div
        className="relative flex-1 touch-pan-y overflow-y-auto select-none"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        role="button"
        aria-label="Tap right for next step, left for previous"
      >
        <article key={step} className="rise mx-auto flex min-h-full max-w-xl flex-col justify-center px-6 py-8">
          {s.section && (
            <p className="mb-3 text-xs font-medium tracking-[0.14em] text-kraft uppercase">{s.section}</p>
          )}
          <span className="font-serif text-[4.5rem] leading-none text-clay/25 tabular-nums">
            {String(step + 1).padStart(2, "0")}
          </span>
          <p className={`mt-2 font-serif tracking-[-0.01em] text-ink ${size}`}>{s.text}</p>

          {(chips.length > 0 || speech) && (
            <div className="mt-8 flex flex-wrap gap-2">
              {speech && (
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                  onClick={speech.speaking ? speech.onStop : speech.onRead}
                  aria-pressed={speech.speaking}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition active:scale-[0.97] ${
                    speech.speaking ? "border-clay/40 bg-clay-wash text-clay-deep" : "border-line bg-card text-ink-soft"
                  }`}
                >
                  {speech.speaking ? <SpeakerOffIcon width={16} height={16} /> : <SpeakerIcon width={16} height={16} />}
                  {speech.speaking ? "Stop reading" : "Read aloud"}
                </button>
              )}
              {chips.map((c) => (
                <button
                  key={c.seconds}
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                  onClick={() => onTimer(c.seconds, `Step ${step + 1}`)}
                  className="flex items-center gap-2 rounded-full border border-clay/40 bg-clay-wash px-4 py-2.5 text-sm font-medium text-clay-deep active:scale-[0.97]"
                >
                  <TimerIcon width={16} height={16} /> Start {c.label} timer
                </button>
              ))}
            </div>
          )}

          {step === 0 && (
            <p className="mt-10 flex items-center justify-between text-xs text-muted/80">
              <span>‹ tap to go back</span>
              <span>tap for next ›</span>
            </p>
          )}
        </article>
      </div>

      {controls}
    </main>
  );
}

function DoneView({ recipe, onBack, onRestart }: { recipe: Recipe; onBack: () => void; onRestart: () => void }) {
  const { open } = useOpenRecipe();
  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-6 text-center">
      <div className="rise grid size-20 place-items-center rounded-full bg-clay-wash">
        <SparkIcon className="text-clay" width={36} height={36} />
      </div>
      <h1 className="rise mt-6 font-serif text-[2.6rem] leading-tight" style={{ animationDelay: "80ms" }}>
        Bon appétit.
      </h1>
      <p className="rise mt-3 max-w-xs text-muted" style={{ animationDelay: "140ms" }}>
        You just made <span className="text-ink">{recipe.title}</span>. Nicely done.
      </p>
      <div className="rise mt-10 flex w-full max-w-xs flex-col gap-3" style={{ animationDelay: "200ms" }}>
        <Link href="/" className="flex h-14 items-center justify-center rounded-full bg-ink font-medium text-ivory">
          Cook something else
        </Link>
        <button onClick={onBack} className="h-12 rounded-full text-sm font-medium text-ink-soft active:bg-oat">
          Back to last step
        </button>
        <button onClick={onRestart} className="h-12 rounded-full text-sm text-muted active:bg-oat">
          Start over
        </button>
      </div>
      <div className="rise mt-12 w-full" style={{ animationDelay: "260ms" }}>
        <SuggestionGrid title="Cook next" excludeId={recipe.id} onOpen={open} />
      </div>
    </main>
  );
}

/* ------------------------------- Components ------------------------------- */

function ScalePicker({ scale, onScale, className = "" }: { scale: number; onScale: (f: number) => void; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const custom = !SCALES.includes(scale);
  const pill = (on: boolean) =>
    `h-9 flex-1 rounded-full text-sm tabular-nums transition ${
      on ? "bg-card font-medium text-ink shadow-sm" : "text-muted active:bg-oat"
    }`;

  return (
    <div role="radiogroup" aria-label="Scale recipe" className={`flex gap-1 rounded-full bg-paper p-1 ${className}`}>
      {SCALES.map((f) => (
        <button key={f} role="radio" aria-checked={f === scale} onClick={() => onScale(f)} className={pill(f === scale)}>
          {formatScale(f)}
        </button>
      ))}
      {editing ? (
        <label className={`${pill(true)} flex items-center justify-center gap-0.5 px-2`}>
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            min={0.1}
            max={20}
            step={0.25}
            aria-label="Custom scale"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              const f = parseFloat(e.target.value.replace(",", "."));
              if (f > 0 && f <= 20) onScale(f);
            }}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="w-10 bg-transparent text-center text-[1rem] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
          ×
        </label>
      ) : (
        <button
          role="radio"
          aria-checked={custom}
          onClick={() => {
            setDraft(custom ? String(scale) : "");
            setEditing(true);
          }}
          className={pill(custom)}
        >
          {custom ? `${Math.round(scale * 100) / 100}×` : "Custom"}
        </button>
      )}
    </div>
  );
}

function IngredientList({
  items,
  scale,
  checked,
  onToggle,
}: {
  items: string[];
  scale: number;
  checked: Set<number>;
  onToggle: (i: number) => void;
}) {
  return (
    <ul className="overflow-hidden rounded-3xl border border-line bg-card">
      {items.map((item, i) => {
        const on = checked.has(i);
        return (
          <li key={i} className="border-b border-line last:border-0">
            <button
              onClick={() => onToggle(i)}
              aria-pressed={on}
              className="flex w-full items-start gap-3.5 px-4 py-3.5 text-left active:bg-paper"
            >
              <span
                className={`mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-full border transition ${
                  on ? "border-sage bg-sage text-white" : "border-line"
                }`}
              >
                {on && <CheckIcon width={14} height={14} strokeWidth={2.6} />}
              </span>
              <span className={`text-[1rem] leading-snug transition ${on ? "text-muted line-through decoration-muted/50" : "text-ink"}`}>
                {scaleIngredient(item, scale)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ControlBar({
  listening,
  loading,
  supported,
  lastHeard,
  error,
  onMic,
  onHelp,
  onIngredients,
}: {
  listening: boolean;
  loading: boolean;
  supported: boolean;
  lastHeard: string;
  error: string | null;
  onMic: () => void;
  onHelp: () => void;
  onIngredients: () => void;
}) {
  const status = error
    ? error
    : loading
      ? "Loading voice model…"
      : listening
      ? lastHeard
        ? `Heard “${lastHeard}”`
        : "Listening — say “next”"
      : supported
        ? "Voice control off"
        : "Tap to navigate";

  return (
    <div className="safe-bottom border-t border-line bg-ivory/95 px-6 pt-3 backdrop-blur-md">
      <p className="mb-3 flex h-4 items-center justify-center gap-2 truncate text-center text-xs text-muted">
        {status}
      </p>
      <div className="mx-auto flex max-w-xs items-center justify-between">
        <RoundButton label="Ingredients" onClick={onIngredients}>
          <ListIcon />
        </RoundButton>

        <button
          onClick={onMic}
          aria-label={listening ? "Turn voice control off" : "Turn voice control on"}
          aria-pressed={listening}
          className={`relative isolate grid size-[72px] place-items-center rounded-full transition active:scale-95 ${
            listening ? "pulse-ring bg-clay text-white" : "bg-ink text-ivory"
          } ${!supported ? "opacity-40" : ""}`}
        >
          {listening ? <MicIcon width={28} height={28} /> : <MicOffIcon width={28} height={28} />}
        </button>

        <RoundButton label="Voice commands" onClick={onHelp}>
          <HelpIcon />
        </RoundButton>
      </div>
    </div>
  );
}

function RoundButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="grid size-14 place-items-center rounded-full border border-line bg-card text-ink-soft transition active:scale-95"
    >
      {children}
    </button>
  );
}

function TimerStrip({
  timers,
  remaining,
  onDismiss,
  raised,
}: {
  timers: Timer[];
  remaining: (t: Timer) => number;
  onDismiss: (id: string) => void;
  raised: boolean;
}) {
  if (!timers.length) return null;
  return (
    <div
      className={`pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 ${
        raised ? "bottom-[calc(env(safe-area-inset-bottom)+9.5rem)]" : "bottom-32"
      }`}
    >
      <div className="pointer-events-auto flex max-w-full gap-2 overflow-x-auto pb-1">
        {timers.map((t) => {
          const left = remaining(t);
          const pct = t.done ? 1 : 1 - left / t.duration;
          return (
            <div
              key={t.id}
              className={`rise relative flex shrink-0 items-center gap-2 overflow-hidden rounded-full py-1.5 pr-1.5 pl-3.5 shadow-lg ${
                t.done ? "animate-pulse bg-clay text-white" : "bg-ink text-ivory"
              }`}
            >
              {!t.done && (
                <span
                  className="absolute inset-y-0 left-0 bg-white/10 transition-[width] duration-300"
                  style={{ width: `${pct * 100}%` }}
                  aria-hidden
                />
              )}
              <TimerIcon width={16} height={16} className="relative" />
              <span className="relative text-xs opacity-75">{t.label}</span>
              <span className="relative font-medium tabular-nums">{t.done ? "Done!" : formatClock(left)}</span>
              <button
                onClick={() => onDismiss(t.id)}
                aria-label={t.done ? "Dismiss timer" : "Cancel timer"}
                className="relative grid size-7 place-items-center rounded-full bg-white/15"
              >
                <CloseIcon width={14} height={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`fixed inset-0 z-50 transition ${open ? "visible" : "invisible"}`}
      aria-hidden={!open}
      role="dialog"
      aria-label={title}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-ink/30 backdrop-blur-[2px] transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className={`safe-bottom absolute inset-x-0 bottom-0 mx-auto flex max-h-[85dvh] max-w-xl flex-col rounded-t-[2rem] bg-ivory px-4 pt-3 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-oat" />
        <div className="mb-4 flex items-center justify-between px-1">
          <h2 className="font-serif text-2xl">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="grid size-10 place-items-center rounded-full bg-paper">
            <CloseIcon width={18} height={18} />
          </button>
        </div>
        <div className="overflow-y-auto pb-4">{children}</div>
      </div>
    </div>
  );
}
