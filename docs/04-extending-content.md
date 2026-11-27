# 4. Extending the content

All content lives in `src/data/` as plain TypeScript. TypeScript checks every new entry against the types in `src/types/oscp.ts`, so a missing field fails `npm run typecheck` instead of breaking the UI.

After any content change, run:

```bash
npm run typecheck && npm run validate:data
```

---

## How the 200 labs are built

`src/data/labs.ts` exports `ALL_LABS`, built once by `buildCurriculum()`:

```
DOMAIN_PLAN (in order)          ids          count
  Web Exploitation              LAB-001–040    40
  Linux PrivEsc                 LAB-041–080    40
  Windows PrivEsc               LAB-081–120    40
  Active Directory              LAB-121–160    40
  Pivoting & Tunneling          LAB-161–180    20
  Exam Chains                   LAB-181–200    20
```

For each domain, in order:

1. The domain's **flagship labs** (from `FLAGSHIPS`) fill the first slots.
2. The remaining slots are filled by `generateLab(domain, slot, index)`, which:
   - picks a technique from the domain's pool (`WEB_TECHNIQUES`, `LINUX_TECHNIQUES`, `WINDOWS_TECHNIQUES`, `AD_TECHNIQUES`, `PIVOT_TECHNIQUES`, or `CHAIN_ENTRIES` for exam chains) in round-robin order
   - varies difficulty with a stable hash so the same technique appears at different difficulties
   - picks a web stack or AD domain name for flavour
   - assigns a unique codename (e.g. `silent-raven`) from a 15 × 15 adjective/noun grid.
3. `buildCurriculum()` then adds the id, IP (`10.10.11.<10+n>`), XP (from difficulty), the `flagship` flag and two deterministic flags (FNV-1a hash of the id).

Everything is deterministic: the same code always produces the same 200 labs, ids and flags. That matters because saved progress is keyed by lab id.

> ⚠️ **Lab ids are positional.** Adding or removing a flagship, or changing a domain's count, shifts the ids after it, and existing progress for those labs will point at different labs. Prefer adding **techniques** to a pool (which only changes generated labs' content, not ids). If you do re-number, tell users to export first.

---

## Recipe: add a technique to the generator

This is the easiest way to add variety without changing any ids.

1. Open `src/data/labs.ts` and find the pool for your domain, e.g. `LINUX_TECHNIQUES`.
2. Append an object matching the `Technique` interface:

   ```ts
   {
     name: "Writable Logrotate Config",
     tags: ["Logrotate", "Race Condition"],
     tools: ["pspy", "linpeas"],
     base: "Medium",                       // Easy | Medium | Hard: the starting difficulty
     // ports: [...]                       // optional; omit to use the domain default
     foothold: {
       vector: "Exposed admin panel with default credentials",
       details: "What the attacker finds and why it is vulnerable.",
       steps: ["Recon step", "Confirm the issue", "Gain access"],
     },
     privesc: {
       vector: "Logrotate running as root on a user-writable log directory",
       details: "Why the misconfiguration leads to root.",
       tooling: ["pspy64", "ls -la /var/log/app"],
       steps: ["Find the job", "Check permissions"],
     },
     remediation: "How a defender fixes it.",
     hint: "A one-line nudge shown behind the Reveal toggle.",
   },
   ```

3. Run `npm run validate:data`. It must still report 200 labs.

With more techniques in a pool, the round-robin spreads across them, so each technique appears fewer times.

---

## Recipe: add or edit a flagship lab

1. In `src/data/labs.ts`, find `const FLAGSHIPS: Draft[] = [`.
2. Edit an existing entry or copy one as a template. A `Draft` is a `Lab` without `id`, `ip`, `xp`, `flags` or `flagship` (those are added for you):

   ```ts
   {
     name: "mylab",                         // unique, lowercase codename
     os: "Linux",                           // Linux | Windows | Active Directory
     difficulty: "Medium",
     domain: "Linux PrivEsc",               // decides which id range it lands in
     tags: ["Tag1", "Tag2"],
     cves: [],                              // e.g. ["CVE-2021-4034"]
     tools: ["nmap", "linpeas"],
     summary: "One-sentence description shown on the card.",
     ports: [p(22, "ssh", "OpenSSH 8.9p1"), p(80, "http", "Apache 2.4.52")],
     foothold: { vector: "...", details: "...", steps: ["..."] },
     privesc:  { vector: "...", details: "...", tooling: ["..."], steps: ["..."] },
     remediation: "...",
     hint: "...",
     // chain: [...]                        // optional network map for pivot/exam labs
   },
   ```

3. Keep the number of flagships per domain at or below that domain's count in `DOMAIN_PLAN`.
4. Run `npm run validate:data`. It expects exactly **20** flagships. If you intentionally change that, update the check in `scripts/validate-data.ts`.

---

## Recipe: add a flashcard

1. Open `src/data/flashcards.ts`.
2. Append to `FLASHCARDS`:

   ```ts
   {
     id: "fc-lin-08",                       // unique and never reused: SM-2 history is keyed by id
     category: "Linux PrivEsc",             // Enumeration | Web | Linux PrivEsc | Windows PrivEsc | Active Directory | Tunneling
     front: "The objective or scenario.",
     answer: "The tool and approach in a sentence or two.",
     syntax: "tool -flag <TARGET>",         // optional; multiline with \n; <PLACEHOLDERS> are highlighted
     flags: [
       { flag: "-flag", meaning: "What it does." },
     ],
     note: "Optional extra tip.",
   },
   ```

3. The card is due immediately for every user.

**Syntax highlighting rules** (`CommandBlock` in `src/components/ui.tsx`): the first word is green (the command), `sudo` is amber, `-x`/`--long` options are cyan, `<PLACEHOLDERS>` are amber, quoted strings are light amber, and anything after ` #` is a grey comment.

---

## Recipe: add an exam question

1. Open `src/data/questions.ts`.
2. Append to `QUESTIONS`:

   ```ts
   {
     id: "q-27",                            // unique and never reused
     category: "Windows PrivEsc",           // one of the 6 domains
     title: "Short title",
     scenario: "One or two sentences of context.",
     terminalLabel: "whoami /priv",         // shown in the terminal window's title bar
     terminal: `...raw output, use a template literal...`,
     question: "What is the best next step?",
     options: ["A", "B", "C", "D"],         // exactly four
     correctIndex: 1,                       // 0–3
     explanation: "Why the correct answer works.",
     rationale: [                           // one line per option, same order as options
       "Why A is wrong",
       "Why B is right",
       "Why C is wrong",
       "Why D is wrong",
     ],
   },
   ```

3. Inside a template literal, escape backslashes (Windows paths) as `\\` and backticks as `` \` ``.

---

## Recipe: add an achievement

1. Add an entry to `ACHIEVEMENTS` in `src/lib/gamification.ts` (`id`, `name`, `description`, `icon`, `color`). `icon` must be one of the `AchievementIcon` names in `src/types/oscp.ts`.
2. Add its unlock rule to `earnedAchievements()` in the same file.

## Recipe: change XP values or ranks

Edit `XP_REWARDS` and `RANKS` in `src/lib/gamification.ts`. Lab XP is derived from difficulty at build time, so the cards and drawer update automatically.

Next: [Architecture →](05-architecture.md)
