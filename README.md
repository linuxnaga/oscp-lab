# OSCP Command Center

A gamified OSCP (PEN-200) preparation web app: an operator dashboard, a 200-lab command center, SM-2 spaced-repetition flashcards and a scenario-based exam question bank. Everything runs in the browser, and progress is saved to `localStorage`.

## Quick start (step by step)

1. **Install Node.js 18.17+** (20 or 22 LTS recommended). Check it with `node -v`.
2. **Clone the repo:**
   ```bash
   git clone https://github.com/linuxnaga/oscp-lab.git
   cd oscp-lab
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Start the app:**
   ```bash
   npm run dev
   ```
5. **Open http://localhost:3000.** Click **Resume LAB-001** on the dashboard to start your first lab.

For a production build: `npm run build && npm start`.

## Documentation

| Guide | What's in it |
| --- | --- |
| [1. Getting started](docs/01-getting-started.md) | Prerequisites, install, dev and production runs, LAN access, troubleshooting |
| [2. User guide](docs/02-user-guide.md) | A 10-minute first-session walkthrough and step-by-step use of all four modules and shortcuts |
| [3. Progress & backup](docs/03-progress-and-backup.md) | XP, ranks, streaks, achievements, Export/Import/Reset, backup file format, how SM-2 scheduling works |
| [4. Extending the content](docs/04-extending-content.md) | How the 200-lab generator works, and recipes for adding techniques, flagship labs, flashcards, questions and achievements |
| [5. Architecture](docs/05-architecture.md) | Folder layout, state flow, `useOscpStore` API, design tokens, deployment |

Other scripts:

| Script | What it does |
| --- | --- |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` (strict mode) |
| `npm run lint` | ESLint (`next/core-web-vitals`) |
| `npm run validate:data` | Checks there are 200 labs in the right domain ranges, unique ids/names/IPs, 40+ flashcards and 25+ questions |

## Modules

| Route | Module |
| --- | --- |
| `/` | **Operator Dashboard**: rank badge, XP bar, streak, labs pwned, quick resume, domain mastery cards, SVG skill radar, activity feed and achievements |
| `/labs` | **200-Lab Command Center**: search (name, CVE, tool, technique) and filters (OS, difficulty, domain, status). Each lab opens a drawer with target metadata, a simulated nmap summary, foothold and privesc intel, an attack checklist, an auto-saving scratchpad and flag submission. `?lab=LAB-042` deep-links straight to a lab. |
| `/flashcards` | **Tactical Flashcards**: 3D flip cards (`Space` flips, `1`–`4` rate, `→` skips) scheduled with SM-2. You can review only due cards or cram the whole deck. |
| `/exam-bank` | **Exam Question Bank**: terminal-output scenarios with four options, immediate grading, an explanation, and a breakdown of why each option is right or wrong. |

## Gamification

* XP: Easy lab 100, Medium 250, Hard/AD chain 500, flashcard rating 10, first correct answer to a question 50.
* Ranks: `0x01 Script Kiddie` (0) → `0x02 Junior Pentester` (1,000) → `0x03 Exploit Specialist` (5,000) → `0x04 Red Team Operator` (15,000) → `0x05 OSCP Certified` (35,000).
* Daily streak (local calendar days) and 13 achievements, including First Blood, AD Domain Admin, 100 Labs Pwned, Tunnel Vision and Flashcard Master.
* **Export / Import JSON** in the sidebar backs up or restores all progress.

## Project layout

```
src/
  app/                 Next.js App Router pages (/, /labs, /flashcards, /exam-bank)
  components/          UI (AppShell, Dashboard, labs/, Flashcards, ExamBank, SkillRadar, ui)
  context/OscpContext  useOscpStore: React context + localStorage persistence
  data/labs.ts         20 flagship labs + deterministic generator → ALL_LABS (LAB-001..LAB-200)
  data/flashcards.ts   43 flashcards
  data/questions.ts    26 scenario questions
  lib/                 gamification rules, SM-2 scheduler, helpers
  types/oscp.ts        shared types
```

Lab ranges: 001–040 Web, 041–080 Linux PrivEsc, 081–120 Windows PrivEsc, 121–160 Active Directory, 161–180 Pivoting & Tunneling, 181–200 Exam Chains.

## About the content

Lab and question content is written as study material. It covers how to recognise each vulnerability class during enumeration, the methodology to follow, which tooling applies, and how each issue is remediated. It deliberately leaves out copy-paste exploit payloads. Flashcards give exact syntax for recon, enumeration and tunnelling tools; for attack techniques they explain the concept. Practise the hands-on exploitation in an environment you're authorised to use, such as OffSec's PG/PEN-200 labs, HTB or your own VMs.

Flags are deterministic 32-character hex strings per lab. Because there are no real target machines behind them, the "Reveal hint / flag format" toggle shows them, so you can log a box once you've rooted its real-world counterpart.
