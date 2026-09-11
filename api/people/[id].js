import { ensureReady, getPool } from "../_lib/db.js";
import { isAdminRequest } from "../_lib/auth.js";
import { rowToPerson } from "../_lib/format.js";

async function getDescendantIds(pool, id) {
  const { rows } = await pool.query(
    `WITH RECURSIVE descendants AS (
       SELECT id FROM people WHERE parent_id = $1
       UNION ALL
       SELECT p.id FROM people p JOIN descendants d ON p.parent_id = d.id
     )
     SELECT id FROM descendants`,
    [id]
  );
  return new Set(rows.map((r) => r.id));
}

export default async function handler(req, res) {
  try {
    await ensureReady();
    const pool = getPool();
    const { id } = req.query;

    if (req.method === "GET") {
      const { rows } = await pool.query("SELECT * FROM people WHERE id = $1", [id]);
      if (!rows.length) return res.status(404).json({ error: "غير موجود" });
      return res.status(200).json(rowToPerson(rows[0]));
    }

    if (req.method === "PUT") {
      if (!isAdminRequest(req)) {
        return res.status(401).json({ error: "غير مصرح - يلزم تسجيل الدخول كمسؤول للتعديل" });
      }
      const { rows: existingRows } = await pool.query("SELECT * FROM people WHERE id = $1", [id]);
      if (!existingRows.length) return res.status(404).json({ error: "غير موجود" });
      const existing = existingRows[0];

      const { name, parentId, gender, birthYear, deathYear, note, photoUrl } = req.body || {};

      if (parentId !== undefined && parentId !== existing.parent_id) {
        if (parentId === id) {
          return res.status(400).json({ error: "لا يمكن أن يكون الشخص أباً لنفسه" });
        }
        if (parentId) {
          const { rows: parentRows } = await pool.query("SELECT id FROM people WHERE id = $1", [parentId]);
          if (!parentRows.length) return res.status(400).json({ error: "الأب المحدد غير موجود" });
          const descendantIds = await getDescendantIds(pool, id);
          if (descendantIds.has(parentId)) {
            return res.status(400).json({ error: "لا يمكن نقل الشخص إلى أحد ذريته" });
          }
        }
      }

      const fields = [];
      const values = [];
      let i = 1;
      const set = (col, val) => {
        fields.push(`${col} = $${i++}`);
        values.push(val);
      };
      if (name !== undefined) set("name", name.trim());
      if (parentId !== undefined) set("parent_id", parentId || null);
      if (gender !== undefined) set("gender", gender || null);
      if (birthYear !== undefined) set("birth_year", birthYear || null);
      if (deathYear !== undefined) set("death_year", deathYear || null);
      if (note !== undefined) set("note", note || null);
      if (photoUrl !== undefined) set("photo_url", photoUrl || null);
      fields.push("updated_at = now()");
      values.push(id);

      const { rows } = await pool.query(
        `UPDATE people SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
        values
      );
      return res.status(200).json(rowToPerson(rows[0]));
    }

    if (req.method === "DELETE") {
      if (!isAdminRequest(req)) {
        return res.status(401).json({ error: "غير مصرح - يلزم تسجيل الدخول كمسؤول للتعديل" });
      }
      const { rows: existingRows } = await pool.query("SELECT id FROM people WHERE id = $1", [id]);
      if (!existingRows.length) return res.status(404).json({ error: "غير موجود" });

      const cascade = req.query.mode === "cascade";
      const { rows: childRows } = await pool.query(
        "SELECT COUNT(*)::int AS c FROM people WHERE parent_id = $1",
        [id]
      );
      if (childRows[0].c > 0 && !cascade) {
        return res.status(409).json({
          error: "لهذا الشخص أبناء في الشجرة. احذف الفرع بالكامل بتأكيد إضافي أو انقل الأبناء أولاً.",
          childCount: childRows[0].c,
        });
      }

      await pool.query("DELETE FROM people WHERE id = $1", [id]); // ON DELETE CASCADE removes descendants
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, PUT, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "خطأ في الخادم" });
  }
}
