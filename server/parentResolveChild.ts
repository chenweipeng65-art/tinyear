/**
 * 家长端按幼儿姓名定位记录：仅在管理端勾选「在教师端展示」的班级（`teacherVisible`）中查找，
 * 与教师端可见班级一致；未传 `classId` 时在全部展示班中按姓名匹配（唯一则成功，重名则冲突）。
 */
import type { PrismaClient } from "../src/generated/prisma/client.js";

export type ParentResolvedChild = {
  id: number;
  displayName: string;
  classId: number;
  idCardLastSixHash: string | null;
};

export type ResolveParentChildResult =
  | { ok: true; child: ParentResolvedChild }
  | { ok: false; reason: "not_found" | "ambiguous"; status: number; message: string };

const visibleClassWhere = { teacherVisible: true as const };

export async function resolveChildForParentLogin(
  prisma: PrismaClient,
  displayName: string,
  explicitClassId?: number,
): Promise<ResolveParentChildResult> {
  const name = displayName.trim();

  if (explicitClassId != null) {
    const child = await prisma.child.findFirst({
      where: {
        classId: explicitClassId,
        displayName: name,
        schoolClass: visibleClassWhere,
      },
      select: { id: true, displayName: true, classId: true, idCardLastSixHash: true },
    });
    if (!child) {
      return {
        ok: false,
        reason: "not_found",
        status: 404,
        message: "未找到该幼儿。请确认姓名、证件与园方登记一致，且所在班级已在园内向家长开放展示",
      };
    }
    return { ok: true, child };
  }

  const rows = await prisma.child.findMany({
    where: { displayName: name, schoolClass: visibleClassWhere },
    orderBy: { id: "asc" },
    take: 2,
    select: { id: true, displayName: true, classId: true, idCardLastSixHash: true },
  });

  if (rows.length === 0) {
    return {
      ok: false,
      reason: "not_found",
      status: 404,
      message: "未找到该幼儿。请确认姓名与园方登记一致，且幼儿所在班级已在园内向家长开放展示",
    };
  }

  if (rows.length > 1) {
    return {
      ok: false,
      reason: "ambiguous",
      status: 409,
      message: "该姓名在多个展示的班级中存在，请联系老师确认后再登录",
    };
  }

  return { ok: true, child: rows[0] };
}
