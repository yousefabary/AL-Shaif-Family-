import { loginToken, setAdminCookie } from "../_lib/auth.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { password } = req.body || {};
  const token = loginToken(password);
  if (!token) return res.status(401).json({ error: "كلمة المرور غير صحيحة" });
  setAdminCookie(res, token);
  return res.status(200).json({ ok: true });
}
