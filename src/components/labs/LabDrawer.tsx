"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  Flag,
  KeyRound,
  NotebookPen,
  Radar,
  ShieldAlert,
  Skull,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import type { ChecklistKey, Lab } from "@/types/oscp";
import { useOscpStore, type FlagResult } from "@/context/OscpContext";
import { cn } from "@/lib/util";
import { DifficultyPill, Pill, Terminal } from "../ui";

const CHECKLIST: { key: ChecklistKey; label: string }[] = [
  { key: "recon", label: "1. Recon & Nmap" },
  { key: "foothold", label: "2. Initial Foothold (local.txt)" },
  { key: "privesc", label: "3. Privilege Escalation" },
  { key: "proof", label: "4. Root/SYSTEM Proof (proof.txt)" },
];

function nmapOutput(lab: Lab): string {
  const rows = lab.ports.map((p) => {
    const port = `${p.port}/${p.proto}`.padEnd(10);
    const svc = p.service.padEnd(15);
    return `${port}open  ${svc}${p.version}`;
  });
  return [
    `# Nmap 7.95 scan initiated as: nmap -p- -sC -sV ${lab.ip}`,
    `Nmap scan report for ${lab.name}.oscp.lab (${lab.ip})`,
    "Host is up (0.031s latency).",
    `Not shown: ${65535 - lab.ports.length} closed tcp ports (reset)`,
    "PORT      STATE  SERVICE        VERSION",
    ...rows,
    "",
    "Service detection performed. 1 IP address (1 host up) scanned.",
  ].join("\n");
}

export function LabDrawer({ lab, onClose }: { lab: Lab; onClose: () => void }) {
  const { labProgress, toggleChecklist, state, setNote } = useOscpStore();
  const prog = labProgress(lab.id);
  const done = prog.completedAt !== undefined;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="lab-title">
      <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-label="Close lab" />
      <div className="relative flex h-full w-full max-w-3xl animate-slide-in flex-col border-l border-edge bg-obsidian shadow-2xl">
        {/* Header */}
        <div className={cn("flex items-start justify-between gap-4 border-b px-5 py-4", done ? "border-pwn/40 bg-pwn/5" : "border-edge bg-surface")}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-gray-500">
              <span>{lab.id}</span>
              <ChevronRight className="h-3 w-3" />
              <span>{lab.domain}</span>
              {lab.flagship && <Pill className="border-privesc/40 bg-privesc/10 text-privesc">flagship</Pill>}
            </div>
            <h2 id="lab-title" className="mt-1 flex items-center gap-2 font-mono text-xl font-bold text-gray-100">
              {done && <Skull className="h-5 w-5 text-pwn" />}
              {lab.name}
            </h2>
            <p className="mt-1 text-sm text-gray-400">{lab.summary}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-500 hover:bg-edge hover:text-gray-200" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {done && (
            <div className="flex animate-pop-in items-center gap-3 rounded-lg border border-pwn/50 bg-pwn/10 px-4 py-3 text-pwn">
              <Sparkles className="h-5 w-5" />
              <div className="font-mono text-sm">
                <div className="font-bold">TARGET PWNED · +{lab.xp} XP</div>
                <div className="text-xs text-pwn/80">Rooted {new Date(prog.completedAt ?? 0).toLocaleString()}</div>
              </div>
            </div>
          )}

          {/* 1. Metadata */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Meta label="Target IP" value={<span className="font-mono text-enum">{lab.ip}</span>} />
            <Meta label="OS" value={lab.os} />
            <Meta label="Difficulty" value={<DifficultyPill difficulty={lab.difficulty} />} />
            <Meta label="XP reward" value={<span className="font-mono text-pwn">{lab.xp} XP</span>} />
            <div className="col-span-2 sm:col-span-4">
              <div className="flex flex-wrap gap-1.5">
                {lab.tags.map((t) => (
                  <Pill key={t} className="border-enum/30 bg-enum/5 text-enum">
                    {t}
                  </Pill>
                ))}
                {lab.cves.map((c) => (
                  <Pill key={c} className="border-crit/40 bg-crit/10 text-crit">
                    {c}
                  </Pill>
                ))}
              </div>
            </div>
          </section>

          {lab.chain && (
            <section>
              <Heading icon={<Radar className="h-4 w-4 text-enum" />}>Network map</Heading>
              <div className="grid gap-2 sm:grid-cols-3">
                {lab.chain.map((h) => (
                  <div key={h.hostname} className="rounded-lg border border-edge bg-surface p-3">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500">{h.role}</div>
                    <div className="font-mono text-sm font-semibold text-gray-100">{h.hostname}</div>
                    <div className="font-mono text-[11px] text-enum">{h.ip}</div>
                    <div className="mt-1 text-[11px] text-gray-500">{h.os}</div>
                    <div className="mt-1 text-xs text-gray-400">{h.summary}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 2. Enumeration & foothold */}
          <section className="space-y-3">
            <Heading icon={<Radar className="h-4 w-4 text-enum" />}>Enumeration &amp; foothold intel</Heading>
            <Terminal label={`nmap ${lab.ip}`}>{nmapOutput(lab)}</Terminal>
            <IntelBlock color="text-enum" title={lab.foothold.vector} details={lab.foothold.details} steps={lab.foothold.steps} />
          </section>

          {/* 3. PrivEsc */}
          <section className="space-y-3">
            <Heading icon={<ShieldAlert className="h-4 w-4 text-privesc" />}>Privilege escalation path</Heading>
            <IntelBlock color="text-privesc" title={lab.privesc.vector} details={lab.privesc.details} steps={lab.privesc.steps} />
            <div className="flex flex-wrap items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5 text-gray-500" />
              {[...new Set([...lab.tools, ...lab.privesc.tooling])].map((t) => (
                <code key={t} className="rounded border border-edge bg-surface px-1.5 py-0.5 font-mono text-[11px] text-gray-300">
                  {t}
                </code>
              ))}
            </div>
            <p className="rounded-lg border border-edge bg-surface/60 px-3 py-2 text-xs text-gray-400">
              <span className="font-mono text-pwn">remediation:</span> {lab.remediation}
            </p>
          </section>

          {/* 4. Checklist */}
          <section>
            <Heading icon={<CheckCircle2 className="h-4 w-4 text-pwn" />}>Attack checklist</Heading>
            <div className="grid gap-2 sm:grid-cols-2">
              {CHECKLIST.map(({ key, label }) => {
                const checked = prog.checklist[key];
                return (
                  <label
                    key={key}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 font-mono text-sm transition",
                      checked ? "border-pwn/40 bg-pwn/10 text-pwn" : "border-edge bg-surface text-gray-300 hover:border-gray-600",
                    )}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggleChecklist(lab.id, key)} className="h-4 w-4 accent-emerald-500" />
                    {label}
                  </label>
                );
              })}
            </div>
          </section>

          {/* 5. Scratchpad */}
          <Scratchpad key={lab.id} labId={lab.id} initial={state.notes[lab.id] ?? ""} onSave={setNote} />

          {/* 6. Flags */}
          <FlagSubmission lab={lab} />
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-edge bg-surface px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500">{label}</div>
      <div className="mt-0.5 text-sm text-gray-200">{value}</div>
    </div>
  );
}

function Heading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h3 className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-gray-400">
      {icon}
      {children}
    </h3>
  );
}

function IntelBlock({ color, title, details, steps }: { color: string; title: string; details: string; steps: string[] }) {
  return (
    <div className="rounded-lg border border-edge bg-surface p-4">
      <div className={cn("font-mono text-sm font-semibold", color)}>{title}</div>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-300">{details}</p>
      <ol className="mt-3 space-y-1.5">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2 text-sm text-gray-400">
            <span className={cn("font-mono text-xs", color)}>{String(i + 1).padStart(2, "0")}</span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Scratchpad({ labId, initial, onSave }: { labId: string; initial: string; onSave: (id: string, t: string) => void }) {
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    if (text === initial) return;
    setSaved(false);
    const t = window.setTimeout(() => {
      onSave(labId, text);
      setSaved(true);
    }, 500);
    return () => window.clearTimeout(t);
  }, [text, initial, labId, onSave]);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-gray-400">
          <NotebookPen className="h-4 w-4 text-enum" />
          Pentester scratchpad
        </h3>
        <span className={cn("font-mono text-[10px]", saved ? "text-gray-500" : "text-privesc")}>{saved ? "saved" : "saving…"}</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        rows={8}
        placeholder={"## Recon\n- open ports, versions, interesting paths\n\n## Creds\n\n## Foothold\n\n## PrivEsc"}
        className="w-full resize-y rounded-lg border border-edge bg-surface p-3 font-mono text-[13px] leading-relaxed text-gray-200 placeholder:text-gray-600 focus:border-enum/60 focus:outline-none"
        aria-label="Lab notes"
      />
    </section>
  );
}

function FlagSubmission({ lab }: { lab: Lab }) {
  const { labProgress, submitFlag } = useOscpStore();
  const prog = labProgress(lab.id);
  const [reveal, setReveal] = useState(false);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-gray-400">
          <Flag className="h-4 w-4 text-crit" />
          Flag submission
        </h3>
        <button type="button" onClick={() => setReveal((r) => !r)} className="flex items-center gap-1 font-mono text-[11px] text-gray-500 hover:text-gray-300">
          {reveal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {reveal ? "Hide hint / flag format" : "Reveal hint / flag format"}
        </button>
      </div>
      {reveal && (
        <div className="mb-3 space-y-1.5 rounded-lg border border-privesc/30 bg-privesc/5 p-3 text-xs text-gray-300">
          <div>
            <span className="font-mono text-privesc">hint:</span> {lab.hint}
          </div>
          <div>
            <span className="font-mono text-privesc">format:</span> 32 lowercase hex characters, e.g. <code className="font-mono">{"0".repeat(32)}</code>.
          </div>
          <div className="text-gray-400">
            Self-paced mode: after you have rooted this box in your own lab, these are the flags to log it:
          </div>
          <div className="font-mono text-[11px]">
            local.txt <span className="text-pwn">{lab.flags.local}</span>
            <br />
            proof.txt <span className="text-pwn">{lab.flags.proof}</span>
          </div>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <FlagInput label="local.txt" icon={<KeyRound className="h-4 w-4" />} done={prog.localSubmitted} onSubmit={(v) => submitFlag(lab.id, "local", v)} />
        <FlagInput label="proof.txt" icon={<Skull className="h-4 w-4" />} done={prog.proofSubmitted} onSubmit={(v) => submitFlag(lab.id, "proof", v)} />
      </div>
    </section>
  );
}

function FlagInput({ label, icon, done, onSubmit }: { label: string; icon: React.ReactNode; done: boolean; onSubmit: (v: string) => FlagResult }) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<FlagResult | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    const r = onSubmit(value);
    setResult(r);
    if (r === "ok") setValue("");
  };

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-pwn/40 bg-pwn/10 px-3 py-2.5 font-mono text-sm text-pwn">
        <CheckCircle2 className="h-4 w-4" />
        {label} captured
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-1">
      <div className={cn("flex overflow-hidden rounded-lg border bg-surface", result === "wrong" ? "border-crit/60" : "border-edge focus-within:border-enum/60")}>
        <span className="flex items-center gap-1.5 border-r border-edge px-3 font-mono text-xs text-gray-400">
          {icon}
          {label}
        </span>
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setResult(null);
          }}
          placeholder="paste flag"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 font-mono text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none"
          aria-label={`Submit ${label}`}
        />
        <button type="submit" className="bg-edge px-3 font-mono text-xs text-gray-200 hover:bg-gray-700">
          submit
        </button>
      </div>
      {result === "wrong" && <div className="font-mono text-[11px] text-crit">Incorrect flag. Try harder.</div>}
    </form>
  );
}
