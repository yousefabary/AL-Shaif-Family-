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

## Architecture — deployed on Vercel

This app is built to run on **Vercel**: a React (Vite) frontend served as a
static site, plus a `/api` folder of serverless functions backed by a
**Postgres** database (e.g. Vercel Postgres or Neon). This is a different
setup than a traditional always-on server — it needs no server to manage,
scales automatically, and deploys on every `git push`.

```
api/            Serverless functions (the backend)
  _lib/           shared helpers: db.js (Postgres pool + schema + seeding),
                   auth.js (admin passcode cookie), format.js, seed.json
  people/          GET/POST /api/people, GET/PUT/DELETE /api/people/:id
  auth/            login / logout / status
  export.js        full JSON backup download
client/         React + Vite frontend (D3 tree visualization)
  public/source/    the original PDF, served for in-app reference
vercel.json     build configuration
```

## One-time setup: add a Postgres database

The API needs a database to talk to. In your Vercel project dashboard:

1. Go to **Storage → Create Database → Postgres** (Vercel's own Postgres,
   powered by Neon — the free tier is plenty for this).
2. **Connect** it to this project. Vercel automatically adds a `POSTGRES_URL`
   environment variable to the project — no code changes needed.
3. In **Settings → Environment Variables**, also set:
   - `ADMIN_PASSWORD` — the passcode required to add/edit/delete people.
   - `SESSION_SECRET` — any long random string (this signs the admin login
     cookie; **required** on serverless — without a fixed value, logins would
     get invalidated on cold starts).
4. Redeploy. The very first request to `/api/people` automatically creates
   the database table and seeds it from `api/_lib/seed.json` — nothing else
   to run by hand.

## Running locally

Requires Node.js 18+ and the [Vercel CLI](https://vercel.com/docs/cli)
(`npm i -g vercel`, or just use `npx vercel`).

```bash
npm run install:all
vercel link          # first time only — links this folder to your Vercel project
vercel env pull       # pulls POSTGRES_URL / ADMIN_PASSWORD / SESSION_SECRET into .env.local
npm run dev           # runs `vercel dev` — serves the site + /api on http://localhost:3000
```

`vercel dev` runs both the static frontend and the serverless API together,
just like production. If you'd rather have Vite's fast hot-reload while
iterating on the UI, run `vercel dev` in one terminal and
`npm --prefix client run dev` in another (http://localhost:5173, proxying
`/api` to the `vercel dev` instance on port 3000).

Don't have a Vercel account yet, or want to develop against a local database
instead? Create a `.env` file at the repo root with:

```
POSTGRES_URL=postgres://user:pass@localhost:5432/alshaif
ADMIN_PASSWORD=choose-a-passcode
SESSION_SECRET=any-long-random-string
```

`vercel dev` reads `.env` / `.env.local` automatically, no `vercel link`
needed for this path.

## Editing the tree

Click **"تسجيل دخول المسؤول للتعديل"** (top left) and enter the admin
passcode to unlock editing. Once unlocked you can:

- Click any person to view their details, parent and children.
- **تعديل** — edit name, parent, gender, birth/death year, notes, photo URL.
- **إضافة ابن/ابنة** — add a child under the selected person.
- **+ إضافة جذر جديد** — add a brand-new root person (rarely needed).
- **حذف** — delete a person (asks for confirmation; deleting someone with
  children removes their whole branch, so double-check first).

All changes are saved immediately to the shared Postgres database — visible
to everyone who opens the site. That's what makes it possible to keep adding
new family members over time instead of just viewing a static picture.

## Environment variables

| Variable         | Required | Purpose                                            |
|-------------------|----------|-----------------------------------------------------|
| `POSTGRES_URL`    | yes      | Postgres connection string. Auto-set when you connect a Vercel Postgres database to the project. |
| `ADMIN_PASSWORD`  | recommended | Passcode required to add/edit/delete. Defaults to `alshaif-family` if unset — **change this before sharing the link publicly.** |
| `SESSION_SECRET`  | recommended | Signs the admin login cookie. **Set a fixed value** — without one, admin logins can get invalidated whenever a serverless instance cold-starts. |

## Backing up your data

Visit `/api/export` to download a full JSON snapshot of everyone currently in
the tree — useful before a big edit, or as a periodic backup.

## Regenerating the seed data

`tools/gen_seed.py` is the script that produced `api/_lib/seed.json` (run
`python3 tools/gen_seed.py` from the repo root). It's only used the very
first time the database is empty — once people exist, edit them through the
website, not this file.

## Tech stack

- **Backend:** Vercel serverless functions (plain Node, no framework) +
  `pg` talking to Postgres.
- **Frontend:** React + Vite, D3.js for the tree layout/zoom/pan, Cairo
  Arabic webfont, fully RTL.
