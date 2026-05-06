/**
 * 管理端：教师密码（scrypt）与会话 Cookie（HMAC 签名）。
 */
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEYLEN = 64;

export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(plain: string, stored: string | null | undefined): boolean {
  if (!stored?.startsWith("scrypt$")) return false;
  const parts = stored.split("$");
  if (parts.length !== 3) return false;
  const [, saltHex, hashHex] = parts;
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(plain, salt, SCRYPT_KEYLEN);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export const ADMIN_SESSION_COOKIE = "admin_session";

export function createAdminSessionToken(teacherId: number, secret: string): string {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = `${teacherId}|${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}|${sig}`, "utf8").toString("base64url");
}

export function readAdminSessionToken(token: string | undefined, secret: string): number | null {
  if (!token) return null;
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const last = raw.lastIndexOf("|");
    if (last <= 0) return null;
    const sig = raw.slice(last + 1);
    const payload = raw.slice(0, last);
    const expectedSig = createHmac("sha256", secret).update(payload).digest("hex");
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expectedSig, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const [idStr, expStr] = payload.split("|");
    const teacherId = Number(idStr);
    const exp = Number(expStr);
    if (!Number.isFinite(teacherId) || !Number.isFinite(exp) || Date.now() > exp) return null;
    return teacherId;
  } catch {
    return null;
  }
}

export function adminSessionCookieValue(): string {
  return process.env.ADMIN_SESSION_SECRET ?? "dev-admin-session-secret-change-me";
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = decodeURIComponent(part.slice(idx + 1).trim());
    out[k] = v;
  }
  return out;
}
