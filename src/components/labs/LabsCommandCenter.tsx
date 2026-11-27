"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Circle, Search, Server, Star, X } from "lucide-react";
import type { Difficulty, Domain, Lab, OS } from "@/types/oscp";
import { DOMAINS } from "@/types/oscp";
import { useOscpStore } from "@/context/OscpContext";
import { ALL_LABS, LABS_BY_ID } from "@/data/labs";
import { cn } from "@/lib/util";
import { Card, DOMAIN_COLOR, DifficultyPill, Pill } from "../ui";
import { LabDrawer } from "./LabDrawer";

type OsFilter = "All" | OS;
type DiffFilter = "All" | Difficulty;
type DomainFilter = "All" | Domain;
type StatusFilter = "All" | "Todo" | "Pwned";

const OS_OPTIONS: OsFilter[] = ["All", "Linux", "Windows", "Active Directory"];
const DIFF_OPTIONS: DiffFilter[] = ["All", "Easy", "Medium", "Hard"];
const STATUS_OPTIONS: StatusFilter[] = ["All", "Todo", "Pwned"];

function matchesQuery(lab: Lab, q: string): boolean {
  if (!q) return true;
  const hay = [
    lab.id,
    lab.name,
    lab.summary,
    lab.ip,
    lab.foothold.vector,
    lab.privesc.vector,
    ...lab.tags,
    ...lab.cves,
    ...lab.tools,
    ...lab.privesc.tooling,
  ]
    .join(" ")
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => hay.includes(term));
}

function CommandCenterInner() {
  const { state, setLastLab } = useOscpStore();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [query, setQuery] = useState("");
  const [os, setOs] = useState<OsFilter>("All");
  const [diff, setDiff] = useState<DiffFilter>("All");
  const [domain, setDomain] = useState<DomainFilter>("All");
  const [status, setStatus] = useState<StatusFilter>("All");

  const openId = params.get("lab");
  const openLab = openId ? LABS_BY_ID[openId] ?? null : null;

  const open = useCallback(
    (id: string) => {
      setLastLab(id);
      router.push(`${pathname}?lab=${id}`, { scroll: false });
    },
    [pathname, router, setLastLab],
  );
  const close = useCallback(() => router.push(pathname, { scroll: false }), [pathname, router]);

  useEffect(() => {
    if (openLab) setLastLab(openLab.id);
  }, [openLab, setLastLab]);

  const filtered = useMemo(
    () =>
      ALL_LABS.filter((l) => {
        const done = state.labs[l.id]?.completedAt !== undefined;
        return (
          matchesQuery(l, query.trim()) &&
          (os === "All" || l.os === os) &&
          (diff === "All" || l.difficulty === diff) &&
          (domain === "All" || l.domain === domain) &&
          (status === "All" || (status === "Pwned" ? done : !done))
        );
      }),
    [state.labs, query, os, diff, domain, status],
  );

  const anyFilter = query || os !== "All" || diff !== "All" || domain !== "All" || status !== "All";
  const clear = () => {
    setQuery("");
    setOs("All");
    setDiff("All");
    setDomain("All");
    setStatus("All");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-enum">{"// lab command center"}</p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-100 sm:text-3xl">200 targets. Pick one.</h1>
        </div>
        <div className="font-mono text-xs text-gray-500">
          showing <span className="text-gray-200">{filtered.length}</span> / {ALL_LABS.length}
        </div>
      </div>

      <Card className="space-y-3 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, CVE, tool or technique (e.g. 'kerberoast', 'CVE-2021-4034', 'ligolo')"
            className="w-full rounded-lg border border-edge bg-obsidian py-2.5 pl-9 pr-9 font-mono text-sm text-gray-200 placeholder:text-gray-600 focus:border-enum/60 focus:outline-none"
            aria-label="Search labs"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <Segmented label="OS" options={OS_OPTIONS} value={os} onChange={setOs} />
          <Segmented label="Difficulty" options={DIFF_OPTIONS} value={diff} onChange={setDiff} />
          <Segmented label="Status" options={STATUS_OPTIONS} value={status} onChange={setStatus} />
          <label className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Domain</span>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value as DomainFilter)}
              className="rounded-md border border-edge bg-obsidian px-2 py-1 font-mono text-xs text-gray-200 focus:border-enum/60 focus:outline-none"
            >
              <option value="All">All</option>
              {DOMAINS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          {anyFilter && (
            <button type="button" onClick={clear} className="font-mono text-xs text-gray-500 underline-offset-2 hover:text-gray-300 hover:underline">
              clear filters
            </button>
          )}
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-gray-500">No labs match those filters.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((lab) => {
            const prog = state.labs[lab.id];
            const done = prog?.completedAt !== undefined;
            const steps = prog ? Object.values(prog.checklist).filter(Boolean).length : 0;
            return (
              <button
                key={lab.id}
                type="button"
                onClick={() => open(lab.id)}
                className={cn(
                  "group rounded-xl border bg-surface/90 p-4 text-left transition hover:-translate-y-0.5 hover:border-gray-600",
                  done ? "border-pwn/40 shadow-[0_0_24px_-12px_#10b981]" : "border-edge",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-mono text-[11px] text-gray-500">
                      <span>{lab.id}</span>
                      <span>·</span>
                      <span>{lab.ip}</span>
                      {lab.flagship && <Star className="h-3 w-3 fill-privesc text-privesc" aria-label="Flagship lab" />}
                    </div>
                    <div className="mt-0.5 truncate font-mono text-base font-semibold text-gray-100 group-hover:text-white">{lab.name}</div>
                  </div>
                  {done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-pwn" aria-label="Pwned" /> : <Circle className="h-5 w-5 shrink-0 text-gray-700" aria-label="Todo" />}
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-400">{lab.summary}</p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <DifficultyPill difficulty={lab.difficulty} />
                  <Pill className="border-edge text-gray-400">
                    <Server className="h-3 w-3" />
                    {lab.os}
                  </Pill>
                  <Pill className="border-transparent" >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: DOMAIN_COLOR[lab.domain] }} />
                    <span className="text-gray-400">{lab.domain}</span>
                  </Pill>
                </div>
                <div className="mt-3 flex items-center justify-between font-mono text-[11px]">
                  <span className="truncate text-gray-500">{lab.tags.slice(0, 3).join(" · ")}</span>
                  <span className={done ? "text-pwn" : "text-gray-400"}>{done ? "PWNED" : `${steps}/4 · ${lab.xp} XP`}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {openLab && <LabDrawer lab={openLab} onClose={close} />}
    </div>
  );
}

function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500">{label}</span>
      <div className="flex overflow-hidden rounded-md border border-edge">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={cn("px-2.5 py-1 font-mono text-xs transition-colors", value === o ? "bg-enum/15 text-enum" : "text-gray-400 hover:bg-obsidian hover:text-gray-200")}
            aria-pressed={value === o}
          >
            {o === "Active Directory" ? "AD" : o}
          </button>
        ))}
      </div>
    </div>
  );
}

export function LabsCommandCenter() {
  return (
    <Suspense fallback={<div className="font-mono text-sm text-gray-500">loading targets…</div>}>
      <CommandCenterInner />
    </Suspense>
  );
}
