# 1. Getting started

This guide takes you from a fresh machine to the app running in your browser.

## Step 1: Install the prerequisites

| Tool | Version | Check with |
| --- | --- | --- |
| Node.js | 18.17 or newer (20 LTS or 22 LTS recommended) | `node -v` |
| npm | 9 or newer (ships with Node) | `npm -v` |
| Git | any recent version | `git --version` |

If `node -v` prints nothing or a version below 18.17, install Node first.

- **Kali / Debian / Ubuntu:** use [nvm](https://github.com/nvm-sh/nvm):
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  source ~/.bashrc
  nvm install --lts
  ```
- **macOS:** `brew install node` or nvm as above.
- **Windows:** install the LTS build from [nodejs.org](https://nodejs.org), or use nvm-windows.

## Step 2: Get the code

```bash
git clone https://github.com/linuxnaga/oscp-lab.git
cd oscp-lab
```

If you're testing a branch that hasn't been merged yet, check it out:

```bash
git checkout feat/oscp-command-center
```

## Step 3: Install dependencies

```bash
npm install
```

This downloads Next.js, React, Tailwind and lucide-react into `node_modules/`. It takes a minute on the first run.

## Step 4: Start the development server

```bash
npm run dev
```

You should see:

```
  ▲ Next.js 14.2.33
  - Local:        http://localhost:3000
 ✓ Ready
```

Open **http://localhost:3000** in your browser. You'll land on the Operator Dashboard at rank `0x01 // Script Kiddie` with 0 XP.

Code changes reload automatically while `npm run dev` is running. Stop it with `Ctrl+C`.

## Step 5 (optional): Run a production build

The production build is faster and is what you'd deploy.

```bash
npm run build     # compiles and prerenders every page
npm start         # serves the build on http://localhost:3000
```

To use another port: `npm start -- -p 8080` (or `npm run dev -- -p 8080`).

## Step 6 (optional): Run the checks

| Command | What it checks |
| --- | --- |
| `npm run typecheck` | TypeScript in strict mode (`tsc --noEmit`) |
| `npm run lint` | ESLint with `next/core-web-vitals` |
| `npm run validate:data` | Exactly 200 labs in the right domain ranges, unique ids/names/IPs, 20 flagships, 40+ flashcards and 25+ questions |

A healthy repo prints:

```
✓ 200 labs (Web Exploitation: 40, Linux PrivEsc: 40, Windows PrivEsc: 40, Active Directory: 40, Pivoting & Tunneling: 20, Exam Chains: 20), 43 flashcards, 26 questions
```

## Accessing it from another device (optional)

To open the app from a phone or a second machine on your LAN:

```bash
npm run dev -- -H 0.0.0.0
```

Then browse to `http://<your-machine-ip>:3000`. Progress is stored per browser, so each device has its own. Use Export/Import (see [Progress & backup](03-progress-and-backup.md)) to move it.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Port 3000 is in use` | Next.js picks 3001 automatically, or start with `-p <port>`. To free 3000: `lsof -i :3000` then `kill <PID>`. |
| `SyntaxError` or `Unsupported engine` on install | Your Node is too old. Upgrade to 18.17+ (`nvm install --lts`). |
| Page is blank or styles are missing after pulling changes | Stop the server, run `rm -rf .next`, then `npm run dev` again. |
| `npm install` fails behind a proxy | Set `npm config set proxy http://host:port` and `https-proxy` the same way. |
| Progress vanished | You may be in a private window, have cleared site data, or switched browser or port (storage is per origin, and `localhost:3000` differs from `localhost:3001`). Restore from an exported JSON backup. |

Next: [User guide →](02-user-guide.md)
