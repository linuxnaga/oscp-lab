# 5. Architecture

A short tour of the code for anyone changing it.

## Stack

- **Next.js 14 App Router** with React 18 and TypeScript (strict). Every page is prerendered as static HTML, then hydrated on the client.
- **Tailwind CSS 3** with the theme colours defined in `tailwind.config.ts`.
- **lucide-react** for icons. Charts (progress bars, skill radar) are plain CSS/SVG, so there's no charting library.
- **No backend.** State lives in React context and is persisted to `localStorage`.

## Folder layout

```
src/
├── app/
│   ├── layout.tsx            Root layout: <OscpProvider> wraps <AppShell> wraps every page
│   ├── globals.css           Theme base, scanlines, 3D flip-card CSS
│   ├── icon.svg              Favicon
│   ├── page.tsx              /            → <Dashboard/>
│   ├── labs/page.tsx         /labs        → <LabsCommandCenter/>
│   ├── flashcards/page.tsx   /flashcards  → <Flashcards/>
│   └── exam-bank/page.tsx    /exam-bank   → <ExamBank/>
├── components/
│   ├── AppShell.tsx          Sidebar (desktop) / top bar (mobile), rank widget
│   ├── BackupControls.tsx    Export / Import / Reset
│   ├── Dashboard.tsx         Module A
│   ├── labs/
│   │   ├── LabsCommandCenter.tsx   Module B: search, filters, grid, ?lab= deep link
│   │   └── LabDrawer.tsx           Lab workspace: intel, checklist, scratchpad, flags
│   ├── Flashcards.tsx        Module C
│   ├── ExamBank.tsx          Module D
│   ├── SkillRadar.tsx        SVG hexagon chart
│   └── ui.tsx                Card, Pill, ProgressBar, CommandBlock (highlighter), Terminal
├── context/OscpContext.tsx   OscpProvider + useOscpStore()
├── data/                     labs.ts, flashcards.ts, questions.ts
├── lib/
│   ├── gamification.ts       XP_REWARDS, RANKS, ACHIEVEMENTS, mastery and achievement rules
│   ├── sm2.ts                SM-2 scheduler + interval preview
│   └── util.ts               dates, cn(), ids
└── types/oscp.ts             All shared types
scripts/validate-data.ts      Data integrity checks (npm run validate:data)
docs/                         This documentation
```

## State flow

```
 user action (submit flag, rate card, answer question)
        │
        ▼
 useOscpStore() action ──► setState(prev => commit(prev, next, xpGained, events))
                                      │
                                      ├─ update streak (local day)
                                      ├─ add XP
                                      ├─ log rank-up if rank changed
                                      ├─ unlock newly earned achievements
                                      └─ prepend events to activity feed (max 60)
        │
        ▼
 useEffect ──► localStorage.setItem("oscp-command-center:v1", JSON)
```

- **Hydration:** the provider starts with an empty state (matching the server-rendered HTML), then loads `localStorage` in a `useEffect` and sets `hydrated = true`. Pages fade in once hydrated to avoid a flash of zeroes.
- **Pure actions** (`toggleChecklist`, `setNote`, `setLastLab`) update state without awarding XP or touching the streak.
- **Normalisation:** `normalize()` fills defaults for any missing field, so old or hand-edited backups load safely.

## `useOscpStore()` API

| Member | Purpose |
| --- | --- |
| `state` | The full `OscpState` |
| `hydrated` | `true` once `localStorage` has been read |
| `labProgress(id)` | Progress for a lab (defaults if untouched) |
| `toggleChecklist(id, key)` | Toggle one of `recon`, `foothold`, `privesc`, `proof` |
| `submitFlag(id, "local" \| "proof", value)` | Returns `"ok"`, `"wrong"` or `"already"`; awards lab XP when both flags are in |
| `setNote(id, text)` | Save scratchpad text |
| `setLastLab(id)` | Remember the lab for *Resume* |
| `rateFlashcard(id, 1–4)` | Run SM-2, +10 XP |
| `answerQuestion(id, index)` | Record an attempt, +50 XP on first correct; returns `boolean` |
| `exportJson()` / `importJson(text)` / `reset()` | Backup and restore |

## Design tokens

| Token | Hex | Used for |
| --- | --- | --- |
| `obsidian` | `#090d16` | Page background |
| `surface` | `#111827` | Cards |
| `edge` | `#1f2937` | Borders |
| `pwn` | `#10b981` | Pwned / rooted / XP |
| `privesc` | `#f59e0b` | PrivEsc / warnings / Medium |
| `crit` | `#ef4444` | Hard / critical / wrong |
| `enum` | `#38bdf8` | Enumeration / info |

Use them as Tailwind classes: `bg-surface`, `border-edge`, `text-pwn`, `bg-crit/10`, etc.

## Deploying

The app is fully static after `npm run build`, so any Node host works (`npm start`). It also works on Vercel with zero config: import the repo and deploy. Each visitor's progress stays in their own browser.
