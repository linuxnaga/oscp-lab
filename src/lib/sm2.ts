import type { Sm2Rating, Sm2State } from "@/types/oscp";

const DAY = 24 * 60 * 60 * 1000;
const MIN = 60 * 1000;

export function initialSm2(now: number = Date.now()): Sm2State {
  return { repetitions: 0, interval: 0, easeFactor: 2.5, due: now, lapses: 0 };
}

/**
 * Map the 4-button UI onto SM-2 quality grades (0-5):
 *   1 Again -> 1 (fail), 2 Hard -> 3, 3 Good -> 4, 4 Easy -> 5.
 */
export const RATING_TO_QUALITY: Record<Sm2Rating, number> = { 1: 1, 2: 3, 3: 4, 4: 5 };

export const RATING_LABELS: Record<Sm2Rating, string> = {
  1: "Again",
  2: "Hard",
  3: "Good",
  4: "Easy",
};

/**
 * Classic SuperMemo-2 scheduling.
 * - quality < 3 resets repetitions; card is re-shown in 10 minutes.
 * - Otherwise interval goes 1d -> 6d -> interval * EF.
 * - EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)), floored at 1.3.
 * Easy gets a small 1.3x bonus on the interval, Hard a 0.8x penalty (after rep 2).
 */
export function reviewSm2(prev: Sm2State, rating: Sm2Rating, now: number = Date.now()): Sm2State {
  const q = RATING_TO_QUALITY[rating];
  let { repetitions, interval, easeFactor, lapses } = prev;

  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  if (q < 3) {
    repetitions = 0;
    interval = 0;
    lapses += 1;
    return { repetitions, interval, easeFactor, lapses, lastReviewed: now, due: now + 10 * MIN };
  }

  repetitions += 1;
  if (repetitions === 1) interval = 1;
  else if (repetitions === 2) interval = 6;
  else interval = Math.round(interval * easeFactor);

  if (repetitions > 2) {
    if (rating === 4) interval = Math.round(interval * 1.3);
    if (rating === 2) interval = Math.max(1, Math.round(interval * 0.8));
  }

  return { repetitions, interval, easeFactor, lapses, lastReviewed: now, due: now + interval * DAY };
}

/** Human-readable preview of when a card would next be due for a rating. */
export function previewInterval(prev: Sm2State, rating: Sm2Rating): string {
  const next = reviewSm2(prev, rating, 0);
  if (next.interval === 0) return "10m";
  if (next.interval < 30) return `${next.interval}d`;
  if (next.interval < 365) return `${Math.round(next.interval / 30)}mo`;
  return `${(next.interval / 365).toFixed(1)}y`;
}
