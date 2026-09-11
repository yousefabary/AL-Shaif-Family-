import crypto from "node:crypto";

// IMPORTANT: on serverless hosting (Vercel) every cold start can be a fresh
// process, so the signing secret MUST be a fixed environment variable, not
// generated at runtime — otherwise logins would randomly get invalidated.
const SECRET = process.env.SESSION_SECRET || "insecure-default-secret-please-set-SESSION_SECRET";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "alshaif-family";

if (!process.env.SESSION_SECRET) {
  console.warn(
    "[warning] SESSION_SECRET is not set — using an insecure default. Set it in your environment before deploying publicly."
  );
}
if (!process.env.ADMIN_PASSWORD) {
  console.warn(
    "[warning] ADMIN_PASSWORD is not set — using the default editing passcode 'alshaif-family'. Set ADMIN_PASSWORD before deploying publicly."
  );
}

const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;

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
      Date.now() - Number(value) < THIRTY_DAYS_MS
    );
  } catch {
    return false;
  }
}

export function loginToken(password) {
  if (password !== ADMIN_PASSWORD) return null;
  return sign(String(Date.now()));
}

export function parseCookies(req) {
  const header = req.headers?.cookie;
  const out = {};
  if (!header) return out;
  header.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  });
  return out;
}

export function isAdminRequest(req) {
  const cookies = parseCookies(req);
  return verify(cookies.admin_token);
}

export function setAdminCookie(res, token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `admin_token=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${
      THIRTY_DAYS_MS / 1000
    }${secure}`
  );
}

export function clearAdminCookie(res) {
  res.setHeader("Set-Cookie", "admin_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0");
}
