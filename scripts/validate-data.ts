/* Sanity checks for the data layer: run with `npm run validate:data`. */
import { ALL_LABS } from "../src/data/labs";
import { FLASHCARDS } from "../src/data/flashcards";
import { QUESTIONS } from "../src/data/questions";

const errors: string[] = [];
const check = (ok: boolean, msg: string) => {
  if (!ok) errors.push(msg);
};

check(ALL_LABS.length === 200, `expected 200 labs, got ${ALL_LABS.length}`);
ALL_LABS.forEach((l, i) => check(l.id === `LAB-${String(i + 1).padStart(3, "0")}`, `bad id at ${i}: ${l.id}`));
check(new Set(ALL_LABS.map((l) => l.name)).size === 200, "lab names are not unique");
check(new Set(ALL_LABS.map((l) => l.ip)).size === 200, "lab IPs are not unique");
check(ALL_LABS.filter((l) => l.flagship).length === 20, "expected 20 flagship labs");

const ranges: [string, number, number][] = [
  ["Web Exploitation", 1, 40],
  ["Linux PrivEsc", 41, 80],
  ["Windows PrivEsc", 81, 120],
  ["Active Directory", 121, 160],
  ["Pivoting & Tunneling", 161, 180],
  ["Exam Chains", 181, 200],
];
for (const [domain, from, to] of ranges) {
  for (let n = from; n <= to; n++) {
    const lab = ALL_LABS[n - 1];
    check(lab.domain === domain, `${lab.id} should be ${domain}, is ${lab.domain}`);
  }
}
const sig = new Set(ALL_LABS.map((l) => `${l.summary}|${l.difficulty}`));
check(sig.size === 200, `labs are not distinct (${sig.size} unique summaries)`);

check(FLASHCARDS.length >= 40, `expected 40+ flashcards, got ${FLASHCARDS.length}`);
check(new Set(FLASHCARDS.map((c) => c.id)).size === FLASHCARDS.length, "duplicate flashcard ids");
check(QUESTIONS.length >= 25, `expected 25+ questions, got ${QUESTIONS.length}`);
check(new Set(QUESTIONS.map((q) => q.id)).size === QUESTIONS.length, "duplicate question ids");

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
const byDomain = ranges.map(([d]) => `${d}: ${ALL_LABS.filter((l) => l.domain === d).length}`).join(", ");
console.log(`✓ ${ALL_LABS.length} labs (${byDomain}), ${FLASHCARDS.length} flashcards, ${QUESTIONS.length} questions`);
