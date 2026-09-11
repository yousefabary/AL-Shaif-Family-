import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { db } from "./db.js";
import { login, requireAdmin, isAdmin } from "./auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  })
);

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production" && process.env.DISABLE_SECURE_COOKIE !== "1",
  maxAge: 1000 * 60 * 60 * 24 * 30,
};

// ---------- helpers ----------
function rowToPerson(r) {
  return {
    id: r.id,
    name: r.name,
    parentId: r.parent_id,
    gender: r.gender,
    birthYear: r.birth_year,
    deathYear: r.death_year,
    note: r.note,
    photoUrl: r.photo_url,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function allDescendantIds(id) {
  const ids = [];
  const stack = [id];
  const childrenStmt = db.prepare("SELECT id FROM people WHERE parent_id = ?");
  while (stack.length) {
    const cur = stack.pop();
    const kids = childrenStmt.all(cur).map((r) => r.id);
    ids.push(...kids);
    stack.push(...kids);
  }
  return ids;
}

// ---------- auth ----------
app.post("/api/auth/login", (req, res) => {
  const { password } = req.body || {};
  const token = login(password);
  if (!token) return res.status(401).json({ error: "كلمة المرور غير صحيحة" });
  res.cookie("admin_token", token, cookieOpts);
  res.json({ ok: true });
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("admin_token");
  res.json({ ok: true });
});

app.get("/api/auth/status", (req, res) => {
  res.json({ isAdmin: isAdmin(req) });
});

// ---------- people ----------
app.get("/api/people", (req, res) => {
  const rows = db.prepare("SELECT * FROM people ORDER BY sort_order, name").all();
  res.json(rows.map(rowToPerson));
});

app.get("/api/people/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM people WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "غير موجود" });
  res.json(rowToPerson(row));
});

app.post("/api/people", requireAdmin, (req, res) => {
  const { name, parentId, gender, birthYear, deathYear, note, photoUrl } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: "الاسم مطلوب" });
  if (parentId) {
    const parent = db.prepare("SELECT id FROM people WHERE id = ?").get(parentId);
    if (!parent) return res.status(400).json({ error: "الأب المحدد غير موجود" });
  }
  const id = crypto.randomUUID();
  const maxOrder =
    db.prepare("SELECT COALESCE(MAX(sort_order), 0) AS m FROM people WHERE parent_id IS ?").get(
      parentId || null
    ).m + 1;

  db.prepare(
    `INSERT INTO people (id, name, parent_id, gender, birth_year, death_year, note, photo_url, sort_order)
     VALUES (@id, @name, @parentId, @gender, @birthYear, @deathYear, @note, @photoUrl, @sortOrder)`
  ).run({
    id,
    name: name.trim(),
    parentId: parentId || null,
    gender: gender || null,
    birthYear: birthYear || null,
    deathYear: deathYear || null,
    note: note || null,
    photoUrl: photoUrl || null,
    sortOrder: maxOrder,
  });

  const row = db.prepare("SELECT * FROM people WHERE id = ?").get(id);
  res.status(201).json(rowToPerson(row));
});

app.put("/api/people/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare("SELECT * FROM people WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "غير موجود" });

  const { name, parentId, gender, birthYear, deathYear, note, photoUrl } = req.body || {};

  if (parentId !== undefined && parentId !== existing.parent_id) {
    if (parentId === id) return res.status(400).json({ error: "لا يمكن أن يكون الشخص أباً لنفسه" });
    if (parentId) {
      const parent = db.prepare("SELECT id FROM people WHERE id = ?").get(parentId);
      if (!parent) return res.status(400).json({ error: "الأب المحدد غير موجود" });
      const descendants = new Set(allDescendantIds(id));
      if (descendants.has(parentId)) {
        return res.status(400).json({ error: "لا يمكن نقل الشخص إلى أحد ذريته" });
      }
    }
  }

  const fields = [];
  const params = { id };
  if (name !== undefined) {
    fields.push("name = @name");
    params.name = name.trim();
  }
  if (parentId !== undefined) {
    fields.push("parent_id = @parentId");
    params.parentId = parentId || null;
  }
  if (gender !== undefined) {
    fields.push("gender = @gender");
    params.gender = gender || null;
  }
  if (birthYear !== undefined) {
    fields.push("birth_year = @birthYear");
    params.birthYear = birthYear || null;
  }
  if (deathYear !== undefined) {
    fields.push("death_year = @deathYear");
    params.deathYear = deathYear || null;
  }
  if (note !== undefined) {
    fields.push("note = @note");
    params.note = note || null;
  }
  if (photoUrl !== undefined) {
    fields.push("photo_url = @photoUrl");
    params.photoUrl = photoUrl || null;
  }
  fields.push("updated_at = datetime('now')");

  db.prepare(`UPDATE people SET ${fields.join(", ")} WHERE id = @id`).run(params);

  const row = db.prepare("SELECT * FROM people WHERE id = ?").get(id);
  res.json(rowToPerson(row));
});

app.delete("/api/people/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare("SELECT * FROM people WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "غير موجود" });

  const cascade = req.query.mode === "cascade";
  const childCount = db.prepare("SELECT COUNT(*) AS c FROM people WHERE parent_id = ?").get(id).c;

  if (childCount > 0 && !cascade) {
    return res.status(409).json({
      error: "لهذا الشخص أبناء في الشجرة. احذف الفرع بالكامل بتأكيد إضافي أو انقل الأبناء أولاً.",
      childCount,
    });
  }

  db.prepare("DELETE FROM people WHERE id = ?").run(id); // ON DELETE CASCADE removes descendants
  res.json({ ok: true });
});

app.get("/api/export", (req, res) => {
  const rows = db.prepare("SELECT * FROM people ORDER BY sort_order, name").all();
  res.setHeader("Content-Disposition", "attachment; filename=al-shaif-family-tree-export.json");
  res.json(rows.map(rowToPerson));
});

// ---------- static client (production) ----------
const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));
app.use("/source", express.static(path.join(__dirname, "..", "client", "public", "source")));

app.get(/^(?!\/api).*/, (req, res, next) => {
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  console.log(`Al-Shaif family tree server running on http://localhost:${PORT}`);
});
