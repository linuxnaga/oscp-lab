# 2. User guide

The app has four modules. On desktop you switch between them from the left sidebar, and on mobile from the top bar. On desktop the sidebar footer always shows your rank, XP bar, streak and the Export / Import / Reset buttons. On mobile, the backup buttons are at the bottom of the dashboard.

| Module | URL |
| --- | --- |
| Operator Dashboard | `/` |
| 200-Lab Command Center | `/labs` |
| Tactical Flashcards | `/flashcards` |
| Exam Question Bank | `/exam-bank` |

---

## Your first session (10-minute walkthrough)

1. **Open the dashboard** (`/`). Everything is at zero, and the green **Resume LAB-001** button points at the first lab.
2. **Click Resume LAB-001.** The lab drawer for *inkwell* slides in from the right.
3. **Read the intel.** Scroll through the simulated nmap output, the *Enumeration & foothold intel* and the *Privilege escalation path*.
4. **Tick `1. Recon & Nmap`** in the Attack checklist once you've done your recon.
5. **Write notes** in the *Pentester scratchpad*. It saves itself about half a second after you stop typing ("saving…" turns to "saved").
6. **Submit the flags.** Once you've rooted the box in your own lab environment, paste the `local.txt` and `proof.txt` values. For self-paced study, click **Reveal hint / flag format** to show them.
7. **Watch the payoff.** A green *TARGET PWNED · +100 XP* banner appears, the lab card gets a ✓, and the dashboard shows `1 / 200` with the *First Blood* achievement unlocked.
8. **Review some flashcards** (`/flashcards`): press `Space` to flip, then `3` for Good. Each rating is +10 XP.
9. **Answer an exam question** (`/exam-bank`): pick an option to see the grading and breakdown. A first correct answer is +50 XP.
10. **Back up your progress** with **Export** in the sidebar (see [Progress & backup](03-progress-and-backup.md)).

---

## Module A: Operator Dashboard (`/`)

What you see, top to bottom:

1. **Telemetry bar**
   - **Rank badge and XP bar**: your current rank (e.g. `0x02 // Junior Pentester`), total XP and how much is left to the next rank.
   - **Streak 🔥**: consecutive days with at least one study action (a flag, flashcard rating or exam answer), plus your best streak.
   - **Labs pwned**: `X / 200` and percentage.
   - **Cards due**: flashcards SM-2 wants you to review now, your total reviews, and questions solved.
   - **Resume button**: opens the last lab you had open if it isn't finished yet. Otherwise it opens the first unfinished lab.
2. **Domain mastery**: six cards (Web, Linux PrivEsc, Windows PrivEsc, Active Directory, Pivoting & Tunneling, Exam Chains), each with a progress bar and `done / total`.
3. **Skill radar**: a hexagon chart of the same six percentages, showing your weak areas at a glance.
4. **Recent activity**: the last 12 events, such as flags captured, labs pwned, questions answered, achievements and rank-ups.
5. **Achievements**: all 13 badges. Locked ones are dimmed with a padlock.
6. **Quick links** to the other three modules.

---

## Module B: 200-Lab Command Center (`/labs`)

### Finding a lab

1. **Search** with the box at the top. It matches lab id, name, IP, summary, tags, CVEs, tools and attack vectors. Multiple words must all match.
   - Examples: `kerberoast`, `CVE-2021-4034`, `ligolo`, `SeImpersonate`, `LAB-150`, `nfs suid`.
2. **Filter** with the buttons under the search box:
   - **OS**: All / Linux / Windows / AD
   - **Difficulty**: All / Easy / Medium / Hard
   - **Status**: All / Todo / Pwned
   - **Domain**: dropdown with the six domains
3. **Clear filters** resets everything. The counter on the right shows `showing N / 200`.

Each lab card shows its id, simulated IP, a ★ if it's one of the 20 handcrafted flagship labs, difficulty, OS, domain, the first few technique tags and either `steps/4 · XP` or **PWNED**.

### Working a lab (the drawer)

Click any card to open its drawer. The URL changes to `/labs?lab=LAB-042`, so you can bookmark or share a lab directly. Close it with **Esc**, the ✕ button or a click on the dark backdrop.

The drawer has six sections:

1. **Target metadata**: IP, OS, difficulty, XP reward, technique tags and CVE ids.
   - Pivoting and Exam Chain labs also show a **Network map** of every host in the chain (standalone → client → DC, or pivot → internal).
2. **Enumeration & foothold intel**: a simulated `nmap -p- -sC -sV` result, then the initial-access vector, how to recognise it and the methodology steps.
3. **Privilege escalation path**: the escalation vector, explanation, steps, the tooling involved and a one-line **remediation** (handy for your exam report).
4. **Attack checklist**: four checkboxes: *Recon & Nmap*, *Initial Foothold (local.txt)*, *Privilege Escalation* and *Root/SYSTEM Proof (proof.txt)*. You can tick them manually. Submitting flags ticks the matching ones for you.
5. **Pentester scratchpad**: a monospace notepad saved per lab. Use it for ports, creds, commands you ran and screenshots to take.
6. **Flag submission**: one box each for `local.txt` and `proof.txt`.
   - A wrong flag shows *Incorrect flag. Try harder.*
   - A correct `local.txt` ticks step 2. A correct `proof.txt` ticks steps 3 and 4.
   - When **both** are captured the lab is marked pwned and its XP is awarded once (Easy 100, Medium 250, Hard 500).
   - **Reveal hint / flag format** shows a nudge, the flag format (32 lowercase hex characters) and the flags themselves for self-paced logging.

### Suggested study loop per lab

1. Read the summary and nmap output, then decide on your own plan **before** reading the intel.
2. Practise the technique against a comparable box in an environment you're authorised to use (OffSec PG/PEN-200 labs, HTB, your own VMs).
3. Write your notes in the scratchpad as you go, as you would for the exam report.
4. Read the intel and remediation to fill any gaps, then submit the flags.

---

## Module C: Tactical Flashcards (`/flashcards`)

### Controls

| Key / button | Action |
| --- | --- |
| `Space` (or click the card) | Flip the card |
| `1` / **Again** | Forgot it. The card returns in 10 minutes. |
| `2` / **Hard** | Recalled with effort. Shorter interval. |
| `3` / **Good** | Recalled normally. |
| `4` / **Easy** | Instant recall. Longer interval. |
| `→` | Skip to the next card without rating |

Rating buttons only work after you've flipped the card. Each rating earns **+10 XP**. The small text under each button previews when the card will next be due (e.g. `10m`, `1d`, `6d`, `2mo`).

### Step by step

1. Pick a **category** (All, Enumeration, Web, Linux PrivEsc, Windows PrivEsc, Active Directory, Tunneling).
2. Choose a mode:
   - **Due** (default) shows only cards that are due now, oldest first. When none are left you'll see "Nothing due".
   - **Cram all** cycles through every card in the category regardless of schedule. Ratings still update the schedule.
3. Read the **front** (the objective), say or type your answer, then press `Space`.
4. The **back** shows the approach, a syntax template with placeholders like `<TARGET>` highlighted (for recon, enumeration and tunnelling tools), and a table explaining each flag.
5. Rate yourself honestly with `1`–`4`.

The header shows how many cards are due, how many you've **learned** (reviewed successfully at least twice in a row), and the XP earned this session.

---

## Module D: Exam Question Bank (`/exam-bank`)

### Step by step

1. Optionally filter by **domain**. The number next to each domain is how many questions it has.
2. Read the **scenario** and the **terminal output** (nmap, `sudo -l`, `whoami /priv`, BloodHound paths, `getcap`, etc.).
3. Click one of the four options (A–D). Grading is immediate:
   - The correct option turns green, and a wrong pick turns red.
   - Every option shows a one-line reason it's right or wrong.
   - The explanation box gives the full technical breakdown.
4. Use **next / prev** to move on, **retry** to clear your answer and try again, or click a number in the **question map** to jump.
   - Map colours: green means solved, red means attempted but not yet solved, grey means not tried.

**XP rule:** you earn **+50 XP** the first time you answer a question correctly. Repeat correct answers are recorded for your accuracy stat but give no extra XP. The header tracks *solved* and overall *accuracy*.

---

## Keyboard shortcuts summary

| Where | Key | Action |
| --- | --- | --- |
| Lab drawer | `Esc` | Close drawer |
| Flashcards | `Space` | Flip |
| Flashcards | `1` `2` `3` `4` | Again / Hard / Good / Easy |
| Flashcards | `→` | Skip card |

Shortcuts are ignored while you're typing in a text box.

Next: [Progress & backup →](03-progress-and-backup.md)
