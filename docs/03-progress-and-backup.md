# 3. Progress, gamification and backup

All progress lives in your browser's `localStorage` under the key **`oscp-command-center:v1`**. Nothing is sent to a server.

## How XP is earned

| Action | XP | Notes |
| --- | --- | --- |
| Pwn an Easy lab | 100 | Awarded once, when both `local.txt` and `proof.txt` are captured |
| Pwn a Medium lab | 250 | |
| Pwn a Hard lab or Exam Chain | 500 | All 20 Exam Chain labs are Hard |
| Rate a flashcard | 10 | Every rating, any button |
| Answer an exam question correctly | 50 | First correct answer per question only |

## Ranks

Your rank is calculated from total XP:

| Rank | XP range |
| --- | --- |
| `0x01 // Script Kiddie` | 0 – 999 |
| `0x02 // Junior Pentester` | 1,000 – 4,999 |
| `0x03 // Exploit Specialist` | 5,000 – 14,999 |
| `0x04 // Red Team Operator` | 15,000 – 34,999 |
| `0x05 // OSCP Certified` | 35,000+ |

A rank-up is logged in the activity feed.

## Daily streak

- Your streak goes up by one on your first study action (flag submission, flashcard rating or exam answer) of each new **local calendar day**.
- Miss a full day and it resets to 1 on your next action.
- Your best ever streak is kept separately.

## Achievements (13)

| Badge | How to unlock |
| --- | --- |
| First Blood | Pwn 1 lab |
| Ten Down | Pwn 10 labs |
| Half Century | Pwn 50 labs |
| 100 Labs Pwned | Pwn 100 labs |
| Full Clear | Pwn all 200 labs |
| AD Domain Admin | Pwn 10 Active Directory labs |
| Tunnel Vision | Pwn 5 Pivoting & Tunneling labs |
| Root Dance | Pwn 10 Linux PrivEsc labs |
| NT AUTHORITY\SYSTEM | Pwn 10 Windows PrivEsc labs |
| Exam Ready | Pwn 3 Exam Chain labs |
| Flashcard Master | 100 flashcard reviews |
| On Fire | 7-day streak |
| Sharpshooter | 20 exam questions solved |

Achievements are checked after every study action and stay unlocked.

## Back up your progress (Export)

1. Click **Export** in the sidebar footer. On mobile, use the **Backup** panel at the bottom of the dashboard.
2. Your browser downloads `oscp-progress-YYYY-MM-DD.json`.
3. Keep it somewhere safe, such as a private Git repo, cloud drive or USB stick.

Export regularly, especially before clearing browser data, switching browsers or changing the port you run on.

## Restore or move progress (Import)

1. Open the app in the target browser or device.
2. Click **Import** (sidebar footer, or the dashboard's Backup panel on mobile) and choose your exported `.json` file.
3. You'll see *Progress restored*, and an entry appears in the activity feed.

Importing **replaces** the current progress in that browser; it does not merge. If the file isn't a valid v1 backup you'll see an error and nothing changes.

## Start over (Reset)

1. Click **Reset** in the sidebar footer.
2. Confirm the prompt. All XP, labs, notes, flashcard schedules and question history are wiped.

Export first if there's any chance you'll want it back.

## What's inside a backup file

```jsonc
{
  "exportedAt": "2026-11-27T06:40:00.000Z",
  "version": 1,
  "xp": 1720,
  "streak": { "current": 4, "longest": 9, "lastActiveDay": "2026-11-27" },
  "labs": {
    "LAB-001": {
      "checklist": { "recon": true, "foothold": true, "privesc": true, "proof": true },
      "localSubmitted": true,
      "proofSubmitted": true,
      "completedAt": 1764224400000
    }
  },
  "notes": { "LAB-001": "## Recon\n22, 80 ..." },
  "flashcards": {
    "fc-enum-01": { "repetitions": 2, "interval": 6, "easeFactor": 2.6, "due": 1764742800000, "lastReviewed": 1764224400000, "lapses": 0 }
  },
  "flashcardReviews": 37,
  "questions": { "q-01": [{ "selected": 0, "correct": true, "at": 1764224400000 }] },
  "achievements": { "first-blood": 1764224400000 },
  "activity": [ /* last 60 events */ ],
  "lastLabId": "LAB-002"
}
```

Unknown or missing fields are filled with defaults on import, so a hand-edited file won't crash the app.

## How the flashcard schedule works (SM-2)

Each card keeps a *repetition count*, an *interval* in days and an *ease factor* (starting at 2.5).

| You press | What happens |
| --- | --- |
| **Again** (1) | Repetitions reset to 0, the ease factor drops, and the card is due again in **10 minutes**. |
| **Hard** (2), **Good** (3), **Easy** (4) | Repetitions + 1. The interval goes **1 day → 6 days → previous interval × ease factor**. From the third repetition, Easy multiplies the interval by 1.3 and Hard by 0.8. |

The ease factor is updated with the classic SM-2 formula and never drops below 1.3. Cards you find hard come back often, and cards you know well drift months apart.

Next: [Extending the content →](04-extending-content.md)
