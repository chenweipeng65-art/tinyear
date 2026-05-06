/**
 * 家长端：用姓名 + 身份证后六位定位幼儿并校验（与 verify-login 一致）。
 */
import type { PrismaClient } from "../src/generated/prisma/client.js";
import { hashIdCardLastSix } from "./hashChildId.js";
import { timingSafeEqual } from "node:crypto";
import { resolveChildForParentLogin } from "./parentResolveChild.js";

function equalHash(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}

export type VerifyParentChildResult =
  | { ok: true; child: { id: number; displayName: string; classId: number } }
  | { ok: false; status: number; message: string };

export async function verifyParentChildCredentials(
  prisma: PrismaClient,
  input: { displayName: string; idCardLastSix: string; classId: number },
): Promise<VerifyParentChildResult> {
  const name = input.displayName.trim();
  const resolved = await resolveChildForParentLogin(prisma, name, input.classId);
  if (resolved.ok === false) {
    return { ok: false, status: resolved.status, message: resolved.message };
  }
  const child = resolved.child;
  if (child.idCardLastSixHash == null) {
    return { ok: false, status: 403, message: "请先在登录页完成证件后六位绑定" };
  }
  const candidate = hashIdCardLastSix(child.displayName, input.idCardLastSix);
  if (!equalHash(candidate, child.idCardLastSixHash)) {
    return { ok: false, status: 401, message: "身份证后六位不正确" };
  }
  return {
    ok: true,
    child: { id: child.id, displayName: child.displayName, classId: child.classId },
  };
}
