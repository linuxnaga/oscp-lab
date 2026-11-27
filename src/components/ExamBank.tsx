"use client";

import { useMemo, useState } from "react";
import { BookOpenCheck, Check, ChevronLeft, ChevronRight, RotateCcw, X } from "lucide-react";
import type { Domain } from "@/types/oscp";
import { DOMAINS } from "@/types/oscp";
import { useOscpStore } from "@/context/OscpContext";
import { QUESTIONS } from "@/data/questions";
import { XP_REWARDS } from "@/lib/gamification";
import { cn } from "@/lib/util";
import { Card, DOMAIN_COLOR, Pill, Terminal } from "./ui";

type CatFilter = "All" | Domain;
const LETTERS = ["A", "B", "C", "D"] as const;

export function ExamBank() {
  const { state, answerQuestion, hydrated } = useOscpStore();
  const [cat, setCat] = useState<CatFilter>("All");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const list = useMemo(() => QUESTIONS.filter((q) => cat === "All" || q.category === cat), [cat]);
  const q = list[Math.min(index, list.length - 1)];
  const history = q ? state.questions[q.id] ?? [] : [];
  const everCorrect = history.some((h) => h.correct);
  const answered = selected !== null;

  const go = (i: number) => {
    setIndex((i + list.length) % list.length);
    setSelected(null);
  };

  const pick = (i: number) => {
    if (answered || !q) return;
    setSelected(i);
    answerQuestion(q.id, i);
  };

  const solved = QUESTIONS.filter((x) => state.questions[x.id]?.some((h) => h.correct)).length;
  const attempts = Object.values(state.questions).reduce((n, a) => n + a.length, 0);
  const correctAttempts = Object.values(state.questions).reduce((n, a) => n + a.filter((h) => h.correct).length, 0);

  return (
    <div className={cn("space-y-5 transition-opacity", hydrated ? "opacity-100" : "opacity-0")}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-privesc">{"// exam question bank"}</p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-100 sm:text-3xl">Read the output. Pick the vector.</h1>
        </div>
        <div className="flex gap-4 font-mono text-xs text-gray-500">
          <span>
            solved <span className="text-pwn">{solved}</span>/{QUESTIONS.length}
          </span>
          <span>
            accuracy <span className="text-enum">{attempts ? Math.round((correctAttempts / attempts) * 100) : 0}%</span>
          </span>
        </div>
      </div>

      <Card className="flex flex-wrap gap-2 p-3">
        {(["All", ...DOMAINS] as CatFilter[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              setCat(c);
              setIndex(0);
              setSelected(null);
            }}
            className={cn(
              "rounded-md border px-2.5 py-1 font-mono text-xs transition",
              cat === c ? "border-privesc/50 bg-privesc/10 text-privesc" : "border-edge text-gray-400 hover:text-gray-200",
            )}
          >
            {c}
            {c !== "All" && <span className="ml-1 text-gray-600">{QUESTIONS.filter((x) => x.category === c).length}</span>}
          </button>
        ))}
      </Card>

      {!q ? (
        <Card className="p-10 text-center text-sm text-gray-500">No questions in this category.</Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
          <Card className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Pill className="border-transparent bg-edge text-gray-300">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: DOMAIN_COLOR[q.category] }} />
                  {q.category}
                </Pill>
                {everCorrect && (
                  <Pill className="border-pwn/40 bg-pwn/10 text-pwn">
                    <Check className="h-3 w-3" /> solved
                  </Pill>
                )}
              </div>
              <span className="font-mono text-[11px] text-gray-500">
                Q{index + 1} / {list.length} · {q.id}
              </span>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-100">{q.title}</h2>
              <p className="mt-1 text-sm text-gray-400">{q.scenario}</p>
            </div>

            <Terminal label={q.terminalLabel}>{q.terminal}</Terminal>

            <p className="font-medium text-gray-200">{q.question}</p>

            <div className="grid gap-2">
              {q.options.map((opt, i) => {
                const isCorrect = i === q.correctIndex;
                const isPicked = i === selected;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={answered}
                    onClick={() => pick(i)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition",
                      !answered && "border-edge bg-obsidian text-gray-300 hover:border-gray-500",
                      answered && isCorrect && "border-pwn/60 bg-pwn/10 text-gray-100",
                      answered && isPicked && !isCorrect && "border-crit/60 bg-crit/10 text-gray-100",
                      answered && !isCorrect && !isPicked && "border-edge bg-obsidian text-gray-500",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[11px]",
                        answered && isCorrect ? "bg-pwn text-obsidian" : answered && isPicked ? "bg-crit text-white" : "bg-edge text-gray-400",
                      )}
                    >
                      {answered && isCorrect ? <Check className="h-3 w-3" /> : answered && isPicked ? <X className="h-3 w-3" /> : LETTERS[i]}
                    </span>
                    <span className="flex-1">
                      {opt}
                      {answered && <span className={cn("mt-1 block text-xs", isCorrect ? "text-pwn/90" : "text-gray-500")}>{q.rationale[i]}</span>}
                    </span>
                  </button>
                );
              })}
            </div>

            {answered && (
              <div className={cn("animate-pop-in rounded-lg border p-4", selected === q.correctIndex ? "border-pwn/40 bg-pwn/5" : "border-crit/40 bg-crit/5")}>
                <div className={cn("font-mono text-sm font-bold", selected === q.correctIndex ? "text-pwn" : "text-crit")}>
                  {selected === q.correctIndex
                    ? history.filter((h) => h.correct).length > 1
                      ? "CORRECT (already solved, no XP)"
                      : `CORRECT · +${XP_REWARDS.question} XP`
                    : `INCORRECT · answer is ${LETTERS[q.correctIndex]}`}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-gray-300">{q.explanation}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <button type="button" onClick={() => go(index - 1)} className="flex items-center gap-1 rounded-md border border-edge px-3 py-1.5 font-mono text-xs text-gray-300 hover:border-gray-500">
                <ChevronLeft className="h-3.5 w-3.5" /> prev
              </button>
              {answered && (
                <button type="button" onClick={() => setSelected(null)} className="flex items-center gap-1 font-mono text-xs text-gray-500 hover:text-gray-300">
                  <RotateCcw className="h-3.5 w-3.5" /> retry
                </button>
              )}
              <button type="button" onClick={() => go(index + 1)} className="flex items-center gap-1 rounded-md bg-privesc px-3 py-1.5 font-mono text-xs font-semibold text-obsidian hover:brightness-110">
                next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </Card>

          {/* Question map */}
          <Card className="h-fit p-4">
            <div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-gray-500">
              <BookOpenCheck className="h-3.5 w-3.5" /> question map
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {list.map((x, i) => {
                const h = state.questions[x.id] ?? [];
                const ok = h.some((a) => a.correct);
                const tried = h.length > 0;
                return (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => go(i)}
                    title={x.title}
                    className={cn(
                      "aspect-square rounded font-mono text-[11px] transition",
                      i === index && "ring-2 ring-privesc",
                      ok ? "bg-pwn/20 text-pwn" : tried ? "bg-crit/20 text-crit" : "bg-edge text-gray-400 hover:bg-gray-700",
                    )}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
