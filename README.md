# شجرة عائلة آل الشايف (Al-Shaif Family Tree)

An interactive, editable website for the Al-Shaif family tree — built from the
original poster **"مشجر آل الشايف - النسخة الثانية"** (2018, by eng. Najm Aldeen
Nasser Hassan Al-Shaif, based on the 1st edition by Capt. Ali bin Naji bin
Ahmed Al-Shaif, 1403H).

- Full ancestral chain from آدم عليه السلام through the classical Qahtani /
  Hashid‑Bakil genealogy down to **الشايف** and his descendants.
- Interactive, zoomable, collapsible family-tree diagram (right‑to‑left,
  Arabic UI).
- Search by name, jump straight to any person in the tree.
- **Add / edit / delete** family members at any time — new births, corrections,
  new branches — protected by a simple admin passcode.
- The original PDF poster is viewable inside the app for reference
  ("عرض الوثيقة الأصلية (PDF)") while you complete or correct entries.

## ⚠️ About the data

The original poster is extremely dense (many hundreds of names in small
clusters joined by curved connecting lines). This app currently seeds **494
people**: the complete ancestral backbone and every major named branch,
transcribed by careful visual reading of the source PDF, plus a large sample
of the descendant names. Some deep leaf-level names from the busiest clusters
were not yet included, and a few branch attachments in the densest areas are
best-effort where lines crossed in the original.

Use the built-in editor (open the original PDF side-by-side via **"عرض
الوثيقة الأصلية"**) to add anyone missing and correct anything that looks off
— that's exactly what the add/edit tools are for.

## Project structure

```
server/         Express API + SQLite storage (server/data/family.db)
  data/seed.json  Initial data, loaded once into the database on first run
client/         React + Vite frontend (D3 tree visualization)
  public/source/  The original PDF, served for in-app reference
```

## Running locally

Requires Node.js 18+.

```bash
npm run install:all     # installs server + client dependencies
npm run build            # builds the React frontend into client/dist
ADMIN_PASSWORD=choose-a-strong-passcode npm start
```

Then open http://localhost:3001

For frontend development with hot reload (in a second terminal, after
`npm start` is running the API on port 3001):

```bash
npm run dev:client       # http://localhost:5173, proxies /api to :3001
```

## Editing the tree

Click **"تسجيل دخول المسؤول للتعديل"** (top left) and enter the admin
passcode to unlock editing. Once unlocked you can:

- Click any person to view their details, parent and children.
- **تعديل** — edit name, parent, gender, birth/death year, notes, photo URL.
- **إضافة ابن/ابنة** — add a child under the selected person.
- **+ إضافة جذر جديد** — add a brand-new root person (rarely needed).
- **حذف** — delete a person (asks for confirmation; deleting someone with
  children removes their whole branch, so double-check first).

All changes are saved immediately to the server's database, visible to
everyone who opens the site — this is what makes it possible to keep adding
new family members over time instead of just viewing a static picture.

## Environment variables

| Variable         | Default              | Purpose                                            |
|-------------------|----------------------|-----------------------------------------------------|
| `ADMIN_PASSWORD`  | `alshaif-family`     | Passcode required to add/edit/delete. **Change this before deploying publicly.** |
| `SESSION_SECRET`  | random per process   | Signs the admin login cookie. Set a fixed value if you run multiple server instances/restarts and want logins to persist. |
| `PORT`            | `3001`               | HTTP port the server listens on.                    |
| `DB_PATH`         | `server/data/family.db` | Where the SQLite database file lives.            |
| `CORS_ORIGIN`     | reflect request origin | Restrict this in production if serving the API from a different origin than the frontend. |

Create a `.env`-style setup however your host expects (most platforms let you
set these as dashboard "environment variables" — no code changes needed).

## Deploying so the whole family can reach it

Any host that runs a persistent Node.js process works (this app is **not**
a static site — it needs the small backend for saved edits to be shared by
everyone). A few options:

### Docker (works almost anywhere: a VPS, Fly.io, Render, Railway, etc.)

```bash
docker build -t al-shaif-family-tree .
docker run -d -p 3001:3001 \
  -e ADMIN_PASSWORD=choose-a-strong-passcode \
  -v al-shaif-data:/app/server/data \
  al-shaif-family-tree
```

The `-v al-shaif-data:/app/server/data` volume is important — it's where the
SQLite database (all the family data people add) lives, so it must persist
across container restarts/redeploys.

### A plain VPS (e.g. a small Ubuntu server)

```bash
git clone <this repo>
cd AL-Shaif-Family-Treee-
npm run install:all && npm run build
ADMIN_PASSWORD=choose-a-strong-passcode PORT=3001 npm start
```

Put it behind Nginx/Caddy for HTTPS and a real domain, and use a process
manager (`pm2 start server/index.js --name al-shaif-tree`, or a systemd unit)
so it restarts automatically.

### Render / Railway / Fly.io (Node app hosting)

Point the platform at this repo, set the build command to
`npm run install:all && npm run build`, the start command to `npm start`, add
a **persistent disk** mounted at `server/data` (so the database survives
deploys), and set `ADMIN_PASSWORD` in the dashboard.

## Backing up your data

`GET /api/export` (while logged in isn't required) downloads a full JSON
snapshot of everyone currently in the tree — useful before a big edit, or as
a periodic backup. The live SQLite file at `server/data/family.db` is also a
complete backup on its own; copy it anywhere to save a snapshot.

## Tech stack

- **Backend:** Node.js, Express, better-sqlite3 (file-based SQL database, no
  external database server needed).
- **Frontend:** React + Vite, D3.js for the tree layout/zoom/pan, Cairo
  Arabic webfont, fully RTL.
