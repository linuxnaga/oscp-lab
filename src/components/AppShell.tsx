"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BookOpenCheck, Brain, Flame, LayoutDashboard, Server, Terminal } from "lucide-react";
import { useOscpStore } from "@/context/OscpContext";
import { rankProgress } from "@/lib/gamification";
import { cn } from "@/lib/util";
import { BackupControls } from "./BackupControls";
import { ProgressBar } from "./ui";

const NAV = [
  { href: "/", label: "Operator Dashboard", short: "Dashboard", icon: LayoutDashboard },
  { href: "/labs", label: "200-Lab Command Center", short: "Labs", icon: Server },
  { href: "/flashcards", label: "Tactical Flashcards", short: "Cards", icon: Brain },
  { href: "/exam-bank", label: "Exam Question Bank", short: "Exam", icon: BookOpenCheck },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { state } = useOscpStore();
  const rp = rankProgress(state.xp);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-edge bg-obsidian/80 backdrop-blur lg:flex">
        <div className="flex items-center gap-2 border-b border-edge px-5 py-4">
          <Terminal className="h-5 w-5 text-pwn" />
          <div>
            <div className="font-mono text-sm font-bold tracking-wider text-gray-100">OSCP//CMD</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-500">PEN-200 prep</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active ? "bg-pwn/10 text-pwn ring-1 ring-pwn/30" : "text-gray-400 hover:bg-surface hover:text-gray-200",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-edge p-4">
          <div>
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span style={{ color: rp.rank.color }}>
                {rp.rank.code} {"//"} {rp.rank.title}
              </span>
              <span className="flex items-center gap-1 text-privesc">
                <Flame className="h-3 w-3" />
                {state.streak.current}
              </span>
            </div>
            <ProgressBar value={rp.pct} color={rp.rank.color} className="mt-2" label="XP to next rank" />
            <div className="mt-1 font-mono text-[10px] text-gray-500">
              {state.xp.toLocaleString()} XP{rp.next ? ` · ${rp.toNext.toLocaleString()} to ${rp.next.code}` : " · max rank"}
            </div>
          </div>
          <BackupControls compact />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top nav (mobile) */}
        <header className="sticky top-0 z-30 flex items-center gap-1 overflow-x-auto border-b border-edge bg-obsidian/90 px-3 py-2 backdrop-blur lg:hidden">
          <Terminal className="mr-2 h-5 w-5 shrink-0 text-pwn" />
          {NAV.map(({ href, short, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs",
                  active ? "bg-pwn/10 text-pwn" : "text-gray-400",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {short}
              </Link>
            );
          })}
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
