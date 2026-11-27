import type { ReactNode } from "react";
import type { Difficulty, Domain } from "@/types/oscp";
import { cn } from "@/lib/util";

export const DIFFICULTY_STYLE: Record<Difficulty, string> = {
  Easy: "text-pwn border-pwn/40 bg-pwn/10",
  Medium: "text-privesc border-privesc/40 bg-privesc/10",
  Hard: "text-crit border-crit/40 bg-crit/10",
};

export const DOMAIN_COLOR: Record<Domain, string> = {
  "Web Exploitation": "#38bdf8",
  "Linux PrivEsc": "#10b981",
  "Windows PrivEsc": "#f59e0b",
  "Active Directory": "#ef4444",
  "Pivoting & Tunneling": "#a78bfa",
  "Exam Chains": "#f472b6",
};

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-edge bg-surface/90 shadow-[0_0_0_1px_rgba(255,255,255,0.01)]", className)}>
      {children}
    </div>
  );
}

export function SectionTitle({ icon, children, right }: { icon?: ReactNode; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-gray-400">
        {icon}
        {children}
      </h2>
      {right}
    </div>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] leading-5", className)}>
      {children}
    </span>
  );
}

export function DifficultyPill({ difficulty }: { difficulty: Difficulty }) {
  return <Pill className={DIFFICULTY_STYLE[difficulty]}>{difficulty}</Pill>;
}

export function ProgressBar({
  value,
  color = "#10b981",
  className,
  label,
}: {
  value: number; // 0-100
  color?: string;
  className?: string;
  label?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-edge", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      aria-label={label}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${v}%`, backgroundColor: color, boxShadow: `0 0 12px ${color}66` }}
      />
    </div>
  );
}

/** Lightweight shell-ish highlighter: comments, flags, placeholders and the leading command. */
export function CommandBlock({ code, className }: { code: string; className?: string }) {
  return (
    <pre className={cn("overflow-x-auto rounded-lg border border-edge bg-obsidian p-3 font-mono text-[13px] leading-relaxed", className)}>
      {code.split("\n").map((line, i) => (
        <div key={i} className="whitespace-pre">
          <HighlightedLine line={line} />
        </div>
      ))}
    </pre>
  );
}

function HighlightedLine({ line }: { line: string }) {
  const hashAt = line.indexOf("#");
  const code = hashAt >= 0 && (hashAt === 0 || line[hashAt - 1] === " ") ? line.slice(0, hashAt) : line;
  const comment = code.length < line.length ? line.slice(code.length) : "";
  const tokens = code.split(/(\s+)/);
  let seenCommand = false;
  return (
    <>
      {tokens.map((tok, i) => {
        if (/^\s+$/.test(tok) || tok === "") return <span key={i}>{tok}</span>;
        let cls = "text-gray-200";
        if (!seenCommand && !/^(sudo|\.\/)$/.test(tok)) {
          cls = "text-pwn font-semibold";
          seenCommand = true;
        } else if (tok === "sudo") cls = "text-privesc";
        else if (/^--?[A-Za-z]/.test(tok)) cls = "text-enum";
        else if (/<[A-Z_]+>/.test(tok)) cls = "text-privesc";
        else if (/^['"].*['"]$/.test(tok)) cls = "text-amber-200";
        else if (/^[|;&>]+$/.test(tok)) cls = "text-gray-500";
        return (
          <span key={i} className={cls}>
            {tok}
          </span>
        );
      })}
      {comment && <span className="text-gray-500">{comment}</span>}
    </>
  );
}

export function Terminal({ label, children }: { label: string; children: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-edge bg-obsidian">
      <div className="flex items-center gap-2 border-b border-edge bg-surface px-3 py-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-crit/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-privesc/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-pwn/70" />
        <span className="ml-2 font-mono text-[11px] text-gray-500">{label}</span>
      </div>
      <pre className="scanlines overflow-x-auto p-3 font-mono text-[12.5px] leading-relaxed text-gray-300">{children}</pre>
    </div>
  );
}
