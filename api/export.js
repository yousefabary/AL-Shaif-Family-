import { ensureReady, getPool } from "./_lib/db.js";
import { rowToPerson } from "./_lib/format.js";

export default async function handler(req, res) {
  try {
    await ensureReady();
    const pool = getPool();
    const { rows } = await pool.query("SELECT * FROM people ORDER BY sort_order, name");
    res.setHeader("Content-Disposition", "attachment; filename=al-shaif-family-tree-export.json");
    return res.status(200).json(rows.map(rowToPerson));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "خطأ في الخادم" });
  }
}
