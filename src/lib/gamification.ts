import type {
  Achievement,
  Difficulty,
  Domain,
  Lab,
  OscpState,
  Rank,
} from "@/types/oscp";
import { DOMAINS } from "@/types/oscp";

export const XP_REWARDS = {
  lab: { Easy: 100, Medium: 250, Hard: 500 } as Record<Difficulty, number>,
  flashcard: 10,
  question: 50,
} as const;

export const RANKS: Rank[] = [
  { code: "0x01", title: "Script Kiddie", min: 0, max: 999, color: "#94a3b8" },
  { code: "0x02", title: "Junior Pentester", min: 1000, max: 4999, color: "#38bdf8" },
  { code: "0x03", title: "Exploit Specialist", min: 5000, max: 14999, color: "#10b981" },
  { code: "0x04", title: "Red Team Operator", min: 15000, max: 34999, color: "#f59e0b" },
  { code: "0x05", title: "OSCP Certified", min: 35000, max: null, color: "#ef4444" },
];

export function rankForXp(xp: number): Rank {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].min) return RANKS[i];
  }
  return RANKS[0];
}

export interface RankProgress {
  rank: Rank;
  level: number; // 1-based rank index
  next: Rank | null;
  pct: number; // 0-100 toward next rank
  toNext: number; // XP remaining
}

export function rankProgress(xp: number): RankProgress {
  const rank = rankForXp(xp);
  const idx = RANKS.indexOf(rank);
  const next = RANKS[idx + 1] ?? null;
  if (!next) return { rank, level: idx + 1, next: null, pct: 100, toNext: 0 };
  const span = next.min - rank.min;
  const pct = Math.min(100, Math.max(0, ((xp - rank.min) / span) * 100));
  return { rank, level: idx + 1, next, pct, toNext: next.min - xp };
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-blood", name: "First Blood", description: "Pwn your first lab.", icon: "droplet", color: "#ef4444" },
  { id: "ten-down", name: "Ten Down", description: "Pwn 10 labs.", icon: "target", color: "#38bdf8" },
  { id: "half-century", name: "Half Century", description: "Pwn 50 labs.", icon: "shield", color: "#10b981" },
  { id: "centurion", name: "100 Labs Pwned", description: "Pwn 100 labs.", icon: "skull", color: "#f59e0b" },
  { id: "full-clear", name: "Full Clear", description: "Pwn all 200 labs.", icon: "trophy", color: "#ef4444" },
  { id: "domain-admin", name: "AD Domain Admin", description: "Pwn 10 Active Directory labs.", icon: "crown", color: "#f59e0b" },
  { id: "tunnel-vision", name: "Tunnel Vision", description: "Pwn 5 Pivoting & Tunneling labs.", icon: "network", color: "#38bdf8" },
  { id: "root-dance", name: "Root Dance", description: "Pwn 10 Linux PrivEsc labs.", icon: "terminal", color: "#10b981" },
  { id: "nt-authority", name: "NT AUTHORITY\\SYSTEM", description: "Pwn 10 Windows PrivEsc labs.", icon: "key", color: "#38bdf8" },
  { id: "exam-ready", name: "Exam Ready", description: "Complete 3 full exam simulation chains.", icon: "layers", color: "#ef4444" },
  { id: "flashcard-master", name: "Flashcard Master", description: "Rate 100 flashcard reviews.", icon: "brain", color: "#10b981" },
  { id: "on-fire", name: "On Fire", description: "Reach a 7-day study streak.", icon: "flame", color: "#f59e0b" },
  { id: "sharpshooter", name: "Sharpshooter", description: "Answer 20 exam questions correctly.", icon: "target", color: "#10b981" },
];

export function completedLabIds(state: OscpState): string[] {
  return Object.entries(state.labs)
    .filter(([, p]) => p.completedAt !== undefined)
    .map(([id]) => id);
}

export interface DomainMastery {
  domain: Domain;
  total: number;
  done: number;
  pct: number;
}

export function domainMastery(state: OscpState, labs: Lab[]): DomainMastery[] {
  const done = new Set(completedLabIds(state));
  return DOMAINS.map((domain) => {
    const inDomain = labs.filter((l) => l.domain === domain);
    const d = inDomain.filter((l) => done.has(l.id)).length;
    return {
      domain,
      total: inDomain.length,
      done: d,
      pct: inDomain.length ? (d / inDomain.length) * 100 : 0,
    };
  });
}

export function correctQuestionCount(state: OscpState): number {
  return Object.values(state.questions).filter((a) => a.some((x) => x.correct)).length;
}

/** Returns ids of achievements whose criteria are met by the given state. */
export function earnedAchievements(state: OscpState, labs: Lab[]): string[] {
  const done = new Set(completedLabIds(state));
  const count = done.size;
  const byDomain = (d: Domain) => labs.filter((l) => l.domain === d && done.has(l.id)).length;
  const out: string[] = [];
  if (count >= 1) out.push("first-blood");
  if (count >= 10) out.push("ten-down");
  if (count >= 50) out.push("half-century");
  if (count >= 100) out.push("centurion");
  if (count >= labs.length && labs.length > 0) out.push("full-clear");
  if (byDomain("Active Directory") >= 10) out.push("domain-admin");
  if (byDomain("Pivoting & Tunneling") >= 5) out.push("tunnel-vision");
  if (byDomain("Linux PrivEsc") >= 10) out.push("root-dance");
  if (byDomain("Windows PrivEsc") >= 10) out.push("nt-authority");
  if (byDomain("Exam Chains") >= 3) out.push("exam-ready");
  if (state.flashcardReviews >= 100) out.push("flashcard-master");
  if (state.streak.longest >= 7) out.push("on-fire");
  if (correctQuestionCount(state) >= 20) out.push("sharpshooter");
  return out;
}
