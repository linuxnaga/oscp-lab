"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Brain, CalendarClock, Keyboard, RotateCw, Shuffle } from "lucide-react";
import type { FlashcardCategory, Sm2Rating } from "@/types/oscp";
import { FLASHCARD_CATEGORIES } from "@/types/oscp";
import { useOscpStore } from "@/context/OscpContext";
import { FLASHCARDS } from "@/data/flashcards";
import { XP_REWARDS } from "@/lib/gamification";
import { RATING_LABELS, initialSm2, previewInterval } from "@/lib/sm2";
import { cn } from "@/lib/util";
import { Card, CommandBlock, Pill } from "./ui";

type CatFilter = "All" | FlashcardCategory;
type Mode = "due" | "all";

const RATING_STYLE: Record<Sm2Rating, string> = {
  1: "border-crit/50 text-crit hover:bg-crit/10",
  2: "border-privesc/50 text-privesc hover:bg-privesc/10",
  3: "border-enum/50 text-enum hover:bg-enum/10",
  4: "border-pwn/50 text-pwn hover:bg-pwn/10",
};

export function Flashcards() {
  const { state, rateFlashcard, hydrated } = useOscpStore();
  const [cat, setCat] = useState<CatFilter>("All");
  const [mode, setMode] = useState<Mode>("due");
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [lastXp, setLastXp] = useState(0);

  // Re-evaluate due cards periodically so "Again" cards come back after 10 minutes.
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const deck = useMemo(() => {
    const inCat = FLASHCARDS.filter((c) => cat === "All" || c.category === cat);
    if (mode === "all") return inCat;
    return inCat
      .filter((c) => (state.flashcards[c.id]?.due ?? 0) <= now)
      .sort((a, b) => (state.flashcards[a.id]?.due ?? 0) - (state.flashcards[b.id]?.due ?? 0));
  }, [cat, mode, state.flashcards, now]);

  const card = deck.length ? deck[index % deck.length] : null;
  const sm = card ? state.flashcards[card.id] ?? initialSm2(0) : null;

  useEffect(() => {
    setIndex(0);
    setFlipped(false);
  }, [cat, mode]);

  const rate = useCallback(
    (r: Sm2Rating) => {
      if (!card || !flipped) return;
      rateFlashcard(card.id, r);
      setLastXp((x) => x + XP_REWARDS.flashcard);
      setFlipped(false);
      // In "due" mode the rated card leaves the deck, so the same index shows the next card.
      if (mode === "all") setIndex((i) => i + 1);
      setNow(Date.now());
    },
    [card, flipped, mode, rateFlashcard],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")) return;
      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (["1", "2", "3", "4"].includes(e.key)) {
        rate(Number(e.key) as Sm2Rating);
      } else if (e.key === "ArrowRight") {
        setFlipped(false);
        setIndex((i) => i + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rate]);

  const counts = useMemo(() => {
    const due = FLASHCARDS.filter((c) => (state.flashcards[c.id]?.due ?? 0) <= now).length;
    const learned = FLASHCARDS.filter((c) => (state.flashcards[c.id]?.repetitions ?? 0) >= 2).length;
    return { due, learned };
  }, [state.flashcards, now]);

  return (
    <div className={cn("space-y-5 transition-opacity", hydrated ? "opacity-100" : "opacity-0")}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-enum">{"// tactical flashcards"}</p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-100 sm:text-3xl">Commit the commands to memory.</h1>
        </div>
        <div className="flex gap-4 font-mono text-xs text-gray-500">
          <span>
            due <span className="text-privesc">{counts.due}</span>
          </span>
          <span>
            learned <span className="text-pwn">{counts.learned}</span>/{FLASHCARDS.length}
          </span>
          <span>
            session <span className="text-pwn">+{lastXp} XP</span>
          </span>
        </div>
      </div>

      <Card className="flex flex-wrap items-center gap-2 p-3">
        {(["All", ...FLASHCARD_CATEGORIES] as CatFilter[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={cn(
              "rounded-md border px-2.5 py-1 font-mono text-xs transition",
              cat === c ? "border-enum/50 bg-enum/10 text-enum" : "border-edge text-gray-400 hover:text-gray-200",
            )}
          >
            {c}
          </button>
        ))}
        <div className="ml-auto flex overflow-hidden rounded-md border border-edge">
          {(["due", "all"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn("flex items-center gap-1 px-2.5 py-1 font-mono text-xs", mode === m ? "bg-pwn/10 text-pwn" : "text-gray-400")}
            >
              {m === "due" ? <CalendarClock className="h-3 w-3" /> : <Shuffle className="h-3 w-3" />}
              {m === "due" ? "Due" : "Cram all"}
            </button>
          ))}
        </div>
      </Card>

      {!card || !sm ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <Brain className="h-10 w-10 text-pwn" />
          <div className="text-lg text-gray-200">Nothing due in this category.</div>
          <p className="max-w-md text-sm text-gray-500">SM-2 has scheduled your next reviews. Come back later, or switch to “Cram all” to practise ahead.</p>
          <button type="button" onClick={() => setMode("all")} className="mt-2 rounded-md border border-pwn/40 px-3 py-1.5 font-mono text-xs text-pwn hover:bg-pwn/10">
            Cram all cards
          </button>
        </Card>
      ) : (
        <>
          <div className="flip-scene mx-auto w-full max-w-3xl">
            <div
              className={cn("flip-card relative min-h-[380px] cursor-pointer", flipped && "is-flipped")}
              onClick={() => setFlipped((f) => !f)}
              role="button"
              tabIndex={0}
              aria-label={flipped ? "Show question" : "Show answer"}
              onKeyDown={(e) => e.key === "Enter" && setFlipped((f) => !f)}
            >
              {/* Front */}
              <div className="flip-face absolute inset-0 flex flex-col rounded-2xl border border-edge bg-surface p-6 sm:p-8">
                <CardHeader category={card.category} position={(index % deck.length) + 1} total={deck.length} reps={sm.repetitions} />
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-center text-xl font-medium leading-relaxed text-gray-100 sm:text-2xl">{card.front}</p>
                </div>
                <div className="flex items-center justify-center gap-2 font-mono text-xs text-gray-500">
                  <RotateCw className="h-3.5 w-3.5" />
                  press <kbd className="rounded border border-edge bg-obsidian px-1.5">Space</kbd> or click to flip
                </div>
              </div>

              {/* Back */}
              <div className="flip-face flip-back absolute inset-0 flex flex-col overflow-y-auto rounded-2xl border border-pwn/30 bg-surface p-6 sm:p-8">
                <CardHeader category={card.category} position={(index % deck.length) + 1} total={deck.length} reps={sm.repetitions} />
                <p className="mt-2 text-sm leading-relaxed text-gray-300">{card.answer}</p>
                {card.syntax && <CommandBlock code={card.syntax} className="mt-4" />}
                <dl className="mt-4 grid gap-x-4 gap-y-1.5 sm:grid-cols-[auto_1fr]">
                  {card.flags.map((f) => (
                    <div key={f.flag} className="contents">
                      <dt className="font-mono text-xs text-enum">{f.flag}</dt>
                      <dd className="text-xs text-gray-400">{f.meaning}</dd>
                    </div>
                  ))}
                </dl>
                {card.note && <p className="mt-3 text-xs italic text-gray-500">{card.note}</p>}
              </div>
            </div>
          </div>

          <div className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-2 sm:grid-cols-4">
            {([1, 2, 3, 4] as Sm2Rating[]).map((r) => (
              <button
                key={r}
                type="button"
                disabled={!flipped}
                onClick={() => rate(r)}
                className={cn(
                  "rounded-lg border bg-surface px-3 py-2.5 font-mono text-sm transition disabled:cursor-not-allowed disabled:opacity-30",
                  RATING_STYLE[r],
                )}
              >
                <div>
                  {r}: {RATING_LABELS[r]}
                </div>
                <div className="text-[10px] opacity-70">{previewInterval(sm, r)}</div>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 font-mono text-[11px] text-gray-500">
            <Keyboard className="h-3.5 w-3.5" />
            Space flip · 1–4 rate (+{XP_REWARDS.flashcard} XP) · → skip
          </div>
        </>
      )}
    </div>
  );
}

function CardHeader({ category, position, total, reps }: { category: FlashcardCategory; position: number; total: number; reps: number }) {
  return (
    <div className="flex items-center justify-between">
      <Pill className="border-enum/30 bg-enum/5 text-enum">{category}</Pill>
      <span className="font-mono text-[11px] text-gray-500">
        {position}/{total} · reps {reps}
      </span>
    </div>
  );
}
