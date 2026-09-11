import crypto from "node:crypto";
import { ensureReady, getPool } from "../_lib/db.js";
import { isAdminRequest } from "../_lib/auth.js";
import { rowToPerson } from "../_lib/format.js";

export default async function handler(req, res) {
  try {
    await ensureReady();
    const pool = getPool();

    if (req.method === "GET") {
      const { rows } = await pool.query("SELECT * FROM people ORDER BY sort_order, name");
      return res.status(200).json(rows.map(rowToPerson));
    }

    if (req.method === "POST") {
      if (!isAdminRequest(req)) {
        return res.status(401).json({ error: "غير مصرح - يلزم تسجيل الدخول كمسؤول للتعديل" });
      }
      const { name, parentId, gender, birthYear, deathYear, note, photoUrl } = req.body || {};
      if (!name || !name.trim()) return res.status(400).json({ error: "الاسم مطلوب" });

      if (parentId) {
        const { rows } = await pool.query("SELECT id FROM people WHERE id = $1", [parentId]);
        if (!rows.length) return res.status(400).json({ error: "الأب المحدد غير موجود" });
      }

      const id = crypto.randomUUID();
      const { rows: maxRows } = await pool.query(
        "SELECT COALESCE(MAX(sort_order), 0) + 1 AS m FROM people WHERE parent_id IS NOT DISTINCT FROM $1",
        [parentId || null]
      );

      const { rows } = await pool.query(
        `INSERT INTO people (id, name, parent_id, gender, birth_year, death_year, note, photo_url, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          id,
          name.trim(),
          parentId || null,
          gender || null,
          birthYear || null,
          deathYear || null,
          note || null,
          photoUrl || null,
          maxRows[0].m,
        ]
      );
      return res.status(201).json(rowToPerson(rows[0]));
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "خطأ في الخادم" });
  }
}
