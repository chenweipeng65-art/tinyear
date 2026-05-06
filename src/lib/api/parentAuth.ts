/** 家长登录：姓名 + 身份证后六位，与库中幼儿绑定或校验 */

export type ParentVerifyResult = { displayName: string; classId: number };

export async function parentVerifyLogin(
  displayName: string,
  idCardLastSix: string,
  classId?: number,
): Promise<ParentVerifyResult> {
  const res = await fetch("/api/parent/verify-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      displayName: displayName.trim(),
      idCardLastSix: idCardLastSix.replace(/\D/g, "").slice(0, 6),
      ...(classId != null ? { classId } : {}),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    displayName?: string;
    classId?: number;
    message?: string;
  };
  if (!res.ok) {
    if (res.status === 404) throw new Error(data.message ?? "未找到该幼儿");
    if (res.status === 409) throw new Error(data.message ?? "请选择班级或联系老师");
    if (res.status === 401) throw new Error(data.message ?? "身份证后六位不正确");
    throw new Error(data.message ?? "登录失败");
  }
  if (!data.displayName || data.classId == null) throw new Error("登录失败");
  return { displayName: data.displayName, classId: data.classId };
}
