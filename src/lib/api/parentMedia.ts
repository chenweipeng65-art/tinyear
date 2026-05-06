/** 家长端头像上传（multipart） */

export async function parentUploadAvatar(
  file: File,
  displayName: string,
  idCardLastSix: string,
  classId: number,
): Promise<{ avatarUrl: string }> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("displayName", displayName.trim());
  fd.append("idCardLastSix", idCardLastSix.replace(/\D/g, "").slice(0, 6));
  fd.append("classId", String(classId));
  const res = await fetch("/api/parent/avatar-upload", {
    method: "POST",
    body: fd,
  });
  const data = (await res.json().catch(() => ({}))) as { avatarUrl?: string; message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? "上传失败");
  }
  if (!data.avatarUrl) throw new Error("上传失败");
  return { avatarUrl: data.avatarUrl };
}
