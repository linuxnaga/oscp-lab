"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  ActivityEvent,
  ActivityKind,
  ChecklistKey,
  LabProgress,
  OscpState,
  Sm2Rating,
} from "@/types/oscp";
import { ALL_LABS, LABS_BY_ID } from "@/data/labs";
import { QUESTIONS_BY_ID } from "@/data/questions";
import {
  ACHIEVEMENTS,
  XP_REWARDS,
  earnedAchievements,
  rankForXp,
} from "@/lib/gamification";
import { initialSm2, reviewSm2 } from "@/lib/sm2";
import { dayKey, daysBetween, uid } from "@/lib/util";

const STORAGE_KEY = "oscp-command-center:v1";
const MAX_ACTIVITY = 60;

export function emptyState(): OscpState {
  return {
    version: 1,
    xp: 0,
    streak: { current: 0, longest: 0, lastActiveDay: null },
    labs: {},
    notes: {},
    flashcards: {},
    flashcardReviews: 0,
    questions: {},
    achievements: {},
    activity: [],
    lastLabId: null,
  };
}

function emptyLabProgress(): LabProgress {
  return {
    checklist: { recon: false, foothold: false, privesc: false, proof: false },
    localSubmitted: false,
    proofSubmitted: false,
  };
}

/** Defensive merge so older / hand-edited exports never crash the app. */
function normalize(raw: unknown): OscpState {
  const base = emptyState();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<OscpState>;
  return {
    ...base,
    xp: typeof r.xp === "number" && r.xp >= 0 ? r.xp : 0,
    streak: { ...base.streak, ...(r.streak ?? {}) },
    labs: r.labs && typeof r.labs === "object" ? r.labs : {},
    notes: r.notes && typeof r.notes === "object" ? r.notes : {},
    flashcards: r.flashcards && typeof r.flashcards === "object" ? r.flashcards : {},
    flashcardReviews: typeof r.flashcardReviews === "number" ? r.flashcardReviews : 0,
    questions: r.questions && typeof r.questions === "object" ? r.questions : {},
    achievements: r.achievements && typeof r.achievements === "object" ? r.achievements : {},
    activity: Array.isArray(r.activity) ? r.activity.slice(0, MAX_ACTIVITY) : [],
    lastLabId: typeof r.lastLabId === "string" ? r.lastLabId : null,
  };
}

function event(kind: ActivityKind, message: string, xp: number): ActivityEvent {
  return { id: uid(), kind, message, xp, at: Date.now() };
}

/** Touch streak, award XP, log activity, then evaluate rank-ups and achievements. */
function commit(prev: OscpState, next: OscpState, gained: number, log: ActivityEvent[]): OscpState {
  const today = dayKey();
  const streak = { ...next.streak };
  if (streak.lastActiveDay !== today) {
    const gap = streak.lastActiveDay ? daysBetween(streak.lastActiveDay, today) : Infinity;
    streak.current = gap === 1 ? streak.current + 1 : 1;
    streak.lastActiveDay = today;
    streak.longest = Math.max(streak.longest, streak.current);
  }

  let state: OscpState = { ...next, streak, xp: next.xp + gained };
  const events = [...log];

  const before = rankForXp(prev.xp);
  const after = rankForXp(state.xp);
  if (after.min > before.min) {
    events.push(event("rank-up", `Promoted to ${after.code} // ${after.title}`, 0));
  }

  const unlocked = { ...state.achievements };
  for (const id of earnedAchievements(state, ALL_LABS)) {
    if (!unlocked[id]) {
      unlocked[id] = Date.now();
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      if (a) events.push(event("achievement", `Achievement unlocked: ${a.name}`, 0));
    }
  }
  state = {
    ...state,
    achievements: unlocked,
    activity: [...events.reverse(), ...state.activity].slice(0, MAX_ACTIVITY),
  };
  return state;
}

export type FlagResult = "ok" | "wrong" | "already";

interface OscpStore {
  state: OscpState;
  hydrated: boolean;
  labProgress: (id: string) => LabProgress;
  toggleChecklist: (id: string, key: ChecklistKey) => void;
  submitFlag: (id: string, which: "local" | "proof", value: string) => FlagResult;
  setNote: (id: string, text: string) => void;
  setLastLab: (id: string) => void;
  rateFlashcard: (id: string, rating: Sm2Rating) => void;
  answerQuestion: (id: string, selected: number) => boolean;
  exportJson: () => string;
  importJson: (json: string) => { ok: true } | { ok: false; error: string };
  reset: () => void;
}

const OscpContext = createContext<OscpStore | null>(null);

export function OscpProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OscpState>(emptyState);
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setState(normalize(JSON.parse(raw)));
    } catch {
      // Corrupt storage: start fresh rather than crash.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Quota exceeded or private mode: progress stays in memory.
    }
  }, [state, hydrated]);

  const labProgress = useCallback(
    (id: string) => state.labs[id] ?? emptyLabProgress(),
    [state.labs],
  );

  const toggleChecklist = useCallback((id: string, key: ChecklistKey) => {
    setState((prev) => {
      const p = prev.labs[id] ?? emptyLabProgress();
      const lp: LabProgress = { ...p, checklist: { ...p.checklist, [key]: !p.checklist[key] } };
      return { ...prev, labs: { ...prev.labs, [id]: lp }, lastLabId: id };
    });
  }, []);

  const submitFlag = useCallback((id: string, which: "local" | "proof", value: string): FlagResult => {
    const lab = LABS_BY_ID[id];
    if (!lab) return "wrong";
    const current = stateRef.current.labs[id] ?? emptyLabProgress();
    const already = which === "local" ? current.localSubmitted : current.proofSubmitted;
    if (already) return "already";
    if (value.trim().toLowerCase() !== lab.flags[which].toLowerCase()) return "wrong";

    setState((prev) => {
      const p = prev.labs[id] ?? emptyLabProgress();
      const lp: LabProgress = {
        ...p,
        localSubmitted: which === "local" ? true : p.localSubmitted,
        proofSubmitted: which === "proof" ? true : p.proofSubmitted,
        checklist: {
          ...p.checklist,
          ...(which === "local" ? { foothold: true } : { privesc: true, proof: true }),
        },
      };
      const log: ActivityEvent[] = [
        event("flag", `${lab.id} ${lab.name}: ${which === "local" ? "local.txt" : "proof.txt"} captured`, 0),
      ];
      let gained = 0;
      if (lp.localSubmitted && lp.proofSubmitted && p.completedAt === undefined) {
        lp.completedAt = Date.now();
        gained = lab.xp;
        log.push(event("lab-complete", `Pwned ${lab.id} ${lab.name} (${lab.difficulty})`, lab.xp));
      }
      return commit(prev, { ...prev, labs: { ...prev.labs, [id]: lp }, lastLabId: id }, gained, log);
    });
    return "ok";
  }, []);

  const setNote = useCallback((id: string, text: string) => {
    setState((prev) => ({ ...prev, notes: { ...prev.notes, [id]: text } }));
  }, []);

  const setLastLab = useCallback((id: string) => {
    setState((prev) => (prev.lastLabId === id ? prev : { ...prev, lastLabId: id }));
  }, []);

  const rateFlashcard = useCallback((id: string, rating: Sm2Rating) => {
    setState((prev) => {
      const sm = reviewSm2(prev.flashcards[id] ?? initialSm2(), rating);
      const next: OscpState = {
        ...prev,
        flashcards: { ...prev.flashcards, [id]: sm },
        flashcardReviews: prev.flashcardReviews + 1,
      };
      // Keep the feed readable: only log every 10th review.
      const log =
        next.flashcardReviews % 10 === 0
          ? [event("flashcard", `${next.flashcardReviews} flashcard reviews completed`, 0)]
          : [];
      return commit(prev, next, XP_REWARDS.flashcard, log);
    });
  }, []);

  const answerQuestion = useCallback((id: string, selected: number): boolean => {
    const q = QUESTIONS_BY_ID[id];
    if (!q) return false;
    const correct = selected === q.correctIndex;
    setState((prev) => {
      const history = prev.questions[id] ?? [];
      const firstCorrect = correct && !history.some((h) => h.correct);
      const next: OscpState = {
        ...prev,
        questions: { ...prev.questions, [id]: [...history, { selected, correct, at: Date.now() }] },
      };
      const gained = firstCorrect ? XP_REWARDS.question : 0;
      const log = [
        event(
          "question",
          `${correct ? "Correct" : "Missed"}: ${q.title}${correct && !firstCorrect ? " (repeat, no XP)" : ""}`,
          gained,
        ),
      ];
      return commit(prev, next, gained, log);
    });
    return correct;
  }, []);

  const exportJson = useCallback(
    () => JSON.stringify({ exportedAt: new Date().toISOString(), ...stateRef.current }, null, 2),
    [],
  );

  const importJson = useCallback((json: string) => {
    try {
      const parsed: unknown = JSON.parse(json);
      if (!parsed || typeof parsed !== "object" || (parsed as { version?: unknown }).version !== 1) {
        return { ok: false as const, error: "Not an OSCP Command Center v1 backup." };
      }
      const s = normalize(parsed);
      setState({ ...s, activity: [event("import", "Progress restored from backup", 0), ...s.activity] });
      return { ok: true as const };
    } catch {
      return { ok: false as const, error: "File is not valid JSON." };
    }
  }, []);

  const reset = useCallback(() => setState(emptyState()), []);

  const value = useMemo<OscpStore>(
    () => ({
      state,
      hydrated,
      labProgress,
      toggleChecklist,
      submitFlag,
      setNote,
      setLastLab,
      rateFlashcard,
      answerQuestion,
      exportJson,
      importJson,
      reset,
    }),
    [state, hydrated, labProgress, toggleChecklist, submitFlag, setNote, setLastLab, rateFlashcard, answerQuestion, exportJson, importJson, reset],
  );

  return <OscpContext.Provider value={value}>{children}</OscpContext.Provider>;
}

export function useOscpStore(): OscpStore {
  const ctx = useContext(OscpContext);
  if (!ctx) throw new Error("useOscpStore must be used inside <OscpProvider>");
  return ctx;
}
