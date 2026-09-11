import crypto from "node:crypto";

// Simple, dependency-free session token so anyone with the admin passcode
// can edit the tree, without needing a full user/accounts system.
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "alshaif-family";

if (!process.env.ADMIN_PASSWORD) {
  console.warn(
    "\n[warning] ADMIN_PASSWORD is not set — using the default editing passcode 'alshaif-family'.\n" +
      "          Set ADMIN_PASSWORD in your environment before deploying publicly.\n"
  );
}

function sign(value) {
  const h = crypto.createHmac("sha256", SECRET).update(value).digest("hex");
  return `${value}.${h}`;
}

function verify(token) {
  if (!token || !token.includes(".")) return false;
  const [value, h] = token.split(".");
  const expected = crypto.createHmac("sha256", SECRET).update(value).digest("hex");
  try {
    return (
      crypto.timingSafeEqual(Buffer.from(h), Buffer.from(expected)) &&
      Date.now() - Number(value) < 1000 * 60 * 60 * 24 * 30 // 30 days
    );
  } catch {
    return false;
  }
}

export function login(password) {
  if (password !== ADMIN_PASSWORD) return null;
  return sign(String(Date.now()));
}

export function requireAdmin(req, res, next) {
  const token = req.cookies?.admin_token;
  if (!verify(token)) {
    return res.status(401).json({ error: "غير مصرح - يلزم تسجيل الدخول كمسؤول للتعديل" });
  }
  next();
}

export function isAdmin(req) {
  return verify(req.cookies?.admin_token);
}
