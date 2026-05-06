/** 管理端 API：依赖 Cookie，须 `credentials: "include"` */

export type AdminTeacher = {
  id: number;
  displayName: string;
  loginIdentifier: string | null;
};

export type AdminClassSummary = {
  id: number;
  name: string;
  gradeBand: string;
  schoolYear: string | null;
  /** 是否在教师端展示并可选用 */
  teacherVisible: boolean;
  /** 教师端/家长端未记住选择时的默认班级（全园仅一个） */
  defaultForTeacher: boolean;
  childCount: number;
};

export type AdminChildRow = {
  id: number;
  displayName: string;
  ageBand: string | null;
  createdAt: string;
  /** 家长端是否已写入证件后六位（管理端不返回哈希本身） */
  idCardLastSixBound: boolean;
};

export type AdminClassDetail = {
  id: number;
  name: string;
  gradeBand: string;
  schoolYear: string | null;
  teacherVisible: boolean;
  defaultForTeacher: boolean;
  children: AdminChildRow[];
};

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T;
  return data;
}

export async function adminLogin(loginIdentifier: string, password: string): Promise<AdminTeacher> {
  const res = await fetch("/api/admin/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loginIdentifier, password }),
  });
  if (!res.ok) {
    throw new Error(res.status === 401 ? "账号或密码错误" : "登录失败");
  }
  return parseJson<AdminTeacher>(res);
}

export async function adminLogout(): Promise<void> {
  await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
}

export async function adminMe(): Promise<AdminTeacher | null> {
  const res = await fetch("/api/admin/me", { credentials: "include" });
  if (!res.ok) return null;
  return parseJson<AdminTeacher>(res);
}

export async function adminListClasses(): Promise<AdminClassSummary[]> {
  const res = await fetch("/api/admin/classes", { credentials: "include" });
  if (!res.ok) throw new Error("加载班级失败");
  const j = await parseJson<{ items: AdminClassSummary[] }>(res);
  return j.items;
}

export async function adminCreateClass(body: {
  name: string;
  gradeBand: string;
  schoolYear?: string | null;
  teacherVisible?: boolean;
  defaultForTeacher?: boolean;
}): Promise<AdminClassSummary> {
  const res = await fetch("/api/admin/classes", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("创建失败");
  return parseJson<AdminClassSummary>(res);
}

export async function adminUpdateClass(
  classId: number,
  body: {
    name?: string;
    gradeBand?: string;
    schoolYear?: string | null;
    teacherVisible?: boolean;
    defaultForTeacher?: boolean;
  },
): Promise<AdminClassSummary> {
  const res = await fetch(`/api/admin/classes/${classId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "保存失败");
  }
  return parseJson<AdminClassSummary>(res);
}

export async function adminDeleteClass(classId: number): Promise<void> {
  const res = await fetch(`/api/admin/classes/${classId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "删除失败");
  }
}

export async function adminGetClass(classId: number): Promise<AdminClassDetail> {
  const res = await fetch(`/api/admin/classes/${classId}`, { credentials: "include" });
  if (!res.ok) throw new Error("加载班级失败");
  return parseJson<AdminClassDetail>(res);
}

export async function adminCreateChild(
  classId: number,
  body: { displayName: string; ageBand: string | null },
): Promise<AdminChildRow> {
  const res = await fetch(`/api/admin/classes/${classId}/children`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      displayName: body.displayName.trim(),
      ageBand: body.ageBand,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = (err as { message?: string }).message;
    if (res.status === 409) throw new Error(msg ?? "本班已有同名幼儿");
    throw new Error(msg ?? "添加失败");
  }
  return parseJson<AdminChildRow>(res);
}

export function adminImportTemplateUrl(classId: number): string {
  return `/api/admin/classes/${classId}/import-template`;
}

export async function adminUpdateChild(
  classId: number,
  childId: number,
  body: { displayName?: string; idCardLastSix?: string; ageBand?: string | null },
): Promise<AdminChildRow> {
  const res = await fetch(`/api/admin/classes/${classId}/children/${childId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = (err as { message?: string }).message;
    if (res.status === 409) throw new Error(msg ?? "本班已有同名幼儿");
    throw new Error(msg ?? "保存失败");
  }
  return parseJson<AdminChildRow>(res);
}

export async function adminDeleteChild(classId: number, childId: number): Promise<void> {
  const res = await fetch(`/api/admin/classes/${classId}/children/${childId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "删除失败");
  }
}

export async function adminImportChildren(classId: number, file: File): Promise<{ imported: number; skipped: number }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`/api/admin/classes/${classId}/children/import`, {
    method: "POST",
    credentials: "include",
    body: fd,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "导入失败");
  }
  return parseJson<{ imported: number; skipped: number }>(res);
}
