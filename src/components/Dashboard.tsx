"use client";

import Link from "next/link";
import {
  Activity,
  Award,
  Brain,
  BookOpenCheck,
  Crown,
  Droplet,
  Flame,
  KeyRound,
  Layers,
  Lock,
  Network,
  Play,
  Server,
  Shield,
  Skull,
  Target,
  Terminal,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { AchievementIcon, ActivityKind } from "@/types/oscp";
import { useOscpStore } from "@/context/OscpContext";
import { ALL_LABS, LABS_BY_ID } from "@/data/labs";
import { FLASHCARDS } from "@/data/flashcards";
import { QUESTIONS } from "@/data/questions";
import { ACHIEVEMENTS, completedLabIds, correctQuestionCount, domainMastery, rankProgress } from "@/lib/gamification";
import { cn, timeAgo } from "@/lib/util";
import { SkillRadar } from "./SkillRadar";
import { Card, DOMAIN_COLOR, ProgressBar, SectionTitle } from "./ui";

const ACH_ICON: Record<AchievementIcon, LucideIcon> = {
  droplet: Droplet,
  crown: Crown,
  skull: Skull,
  network: Network,
  layers: Layers,
  flame: Flame,
  terminal: Terminal,
  shield: Shield,
  target: Target,
  brain: Brain,
  key: KeyRound,
  trophy: Trophy,
};

const ACTIVITY_STYLE: Record<ActivityKind, { icon: LucideIcon; color: string }> = {
  "lab-complete": { icon: Skull, color: "text-pwn" },
  flag: { icon: Target, color: "text-enum" },
  flashcard: { icon: Brain, color: "text-enum" },
  question: { icon: BookOpenCheck, color: "text-privesc" },
  achievement: { icon: Award, color: "text-privesc" },
  "rank-up": { icon: Zap, color: "text-crit" },
  import: { icon: Activity, color: "text-gray-400" },
};

export function Dashboard() {
  const { state, hydrated } = useOscpStore();
  const rp = rankProgress(state.xp);
  const pwned = completedLabIds(state).length;
  const mastery = domainMastery(state, ALL_LABS);
  const dueCards = FLASHCARDS.filter((c) => (state.flashcards[c.id]?.due ?? 0) <= Date.now()).length;
  const correct = correctQuestionCount(state);

  const resumeLab =
    (state.lastLabId && LABS_BY_ID[state.lastLabId] && !state.labs[state.lastLabId]?.completedAt && LABS_BY_ID[state.lastLabId]) ||
    ALL_LABS.find((l) => !state.labs[l.id]?.completedAt) ||
    null;

  return (
    <div className={cn("space-y-6 transition-opacity", hydrated ? "opacity-100" : "opacity-0")}>
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-pwn">{"// operator dashboard"}</p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-100 sm:text-3xl">Welcome back, operator.</h1>
      </div>

      {/* Telemetry bar */}
      <Card className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[1.6fr_repeat(3,1fr)_auto] lg:items-center">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="rounded-md border px-2 py-0.5 font-mono text-sm font-bold" style={{ color: rp.rank.color, borderColor: `${rp.rank.color}66`, backgroundColor: `${rp.rank.color}14` }}>
              {rp.rank.code} {"//"} {rp.rank.title}
            </span>
            <span className="font-mono text-xs text-gray-400">{state.xp.toLocaleString()} XP</span>
          </div>
          <ProgressBar value={rp.pct} color={rp.rank.color} className="mt-3 h-2.5" label="XP progress to next rank" />
          <div className="mt-1.5 font-mono text-[11px] text-gray-500">
            {rp.next ? `${rp.toNext.toLocaleString()} XP to ${rp.next.code} // ${rp.next.title}` : "Maximum rank achieved. Go book the exam."}
          </div>
        </div>
        <Stat icon={<Flame className="h-5 w-5 animate-flicker text-privesc" />} label="Streak" value={`${state.streak.current}d`} sub={`best ${state.streak.longest}d`} />
        <Stat icon={<Skull className="h-5 w-5 text-pwn" />} label="Labs pwned" value={`${pwned} / ${ALL_LABS.length}`} sub={`${Math.round((pwned / ALL_LABS.length) * 100)}% complete`} />
        <Stat icon={<Brain className="h-5 w-5 text-enum" />} label="Cards due" value={String(dueCards)} sub={`${state.flashcardReviews} reviews · ${correct}/${QUESTIONS.length} Qs`} />
        {resumeLab ? (
          <Link
            href={`/labs?lab=${resumeLab.id}`}
            className="flex items-center justify-center gap-2 rounded-lg bg-pwn px-4 py-3 font-mono text-sm font-semibold text-obsidian transition hover:brightness-110"
          >
            <Play className="h-4 w-4" />
            Resume {resumeLab.id}
          </Link>
        ) : (
          <span className="rounded-lg border border-pwn/40 px-4 py-3 text-center font-mono text-sm text-pwn">All labs pwned</span>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Domain mastery */}
        <section>
          <SectionTitle icon={<Shield className="h-3.5 w-3.5" />}>Domain mastery</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {mastery.map((m) => (
              <Card key={m.domain} className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-200">{m.domain}</span>
                  <span className="font-mono text-xs" style={{ color: DOMAIN_COLOR[m.domain] }}>
                    {Math.round(m.pct)}%
                  </span>
                </div>
                <ProgressBar value={m.pct} color={DOMAIN_COLOR[m.domain]} className="mt-3" label={`${m.domain} mastery`} />
                <div className="mt-2 font-mono text-[11px] text-gray-500">
                  {m.done} / {m.total} labs
                </div>
              </Card>
            ))}
          </div>
        </section>

        <Card className="p-4">
          <SectionTitle icon={<Target className="h-3.5 w-3.5" />}>Skill radar</SectionTitle>
          <SkillRadar data={mastery} />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Activity */}
        <section>
          <SectionTitle icon={<Activity className="h-3.5 w-3.5" />}>Recent activity</SectionTitle>
          <Card className="divide-y divide-edge">
            {state.activity.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                No activity yet. Open the{" "}
                <Link href="/labs" className="text-pwn hover:underline">
                  Lab Command Center
                </Link>{" "}
                and claim first blood.
              </div>
            ) : (
              state.activity.slice(0, 12).map((e) => {
                const { icon: Icon, color } = ACTIVITY_STYLE[e.kind];
                return (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Icon className={cn("h-4 w-4 shrink-0", color)} />
                    <span className="min-w-0 flex-1 truncate text-sm text-gray-300">{e.message}</span>
                    {e.xp > 0 && <span className="font-mono text-xs text-pwn">+{e.xp} XP</span>}
                    <span className="shrink-0 font-mono text-[11px] text-gray-500">{timeAgo(e.at)}</span>
                  </div>
                );
              })
            )}
          </Card>
        </section>

        {/* Achievements */}
        <section>
          <SectionTitle
            icon={<Award className="h-3.5 w-3.5" />}
            right={
              <span className="font-mono text-[11px] text-gray-500">
                {Object.keys(state.achievements).length} / {ACHIEVEMENTS.length}
              </span>
            }
          >
            Achievements
          </SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ACHIEVEMENTS.map((a) => {
              const unlocked = state.achievements[a.id];
              const Icon = unlocked ? ACH_ICON[a.icon] : Lock;
              return (
                <Card key={a.id} className={cn("p-3 transition", unlocked ? "animate-pop-in" : "opacity-50")}>
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-md"
                      style={{ backgroundColor: unlocked ? `${a.color}22` : "#1f2937", color: unlocked ? a.color : "#6b7280" }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 break-words text-sm font-medium leading-tight text-gray-200 [overflow-wrap:anywhere]">{a.name}</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">{a.description}</p>
                </Card>
              );
            })}
          </div>
        </section>
      </div>

      <div className="flex flex-wrap gap-3">
        <QuickLink href="/labs" icon={<Server className="h-4 w-4" />} label="Browse 200 labs" />
        <QuickLink href="/flashcards" icon={<Brain className="h-4 w-4" />} label={`Review ${dueCards} due cards`} />
        <QuickLink href="/exam-bank" icon={<BookOpenCheck className="h-4 w-4" />} label="Practise exam questions" />
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-edge bg-obsidian">{icon}</div>
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500">{label}</div>
        <div className="font-mono text-lg font-semibold text-gray-100">{value}</div>
        <div className="font-mono text-[10px] text-gray-500">{sub}</div>
      </div>
    </div>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-lg border border-edge bg-surface px-4 py-2 text-sm text-gray-300 transition hover:border-pwn/50 hover:text-pwn">
      {icon}
      {label}
    </Link>
  );
}
