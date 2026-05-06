/** 教师首页「幼儿画语」图片上传 */

export async function teacherUploadChildArtImage(
  file: File,
  childId: number,
  classId: number,
  observedAt: string,
): Promise<{ imageUrl: string; portfolioArchiveItemId: number }> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("childId", String(childId));
  fd.append("classId", String(classId));
  fd.append("observedAt", observedAt);
  const res = await fetch("/api/teacher/listening-child-art-upload", {
    method: "POST",
    body: fd,
  });
  const data = (await res.json().catch(() => ({}))) as {
    imageUrl?: string;
    portfolioArchiveItemId?: number;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(data.message ?? "上传失败");
  }
  if (!data.imageUrl || data.portfolioArchiveItemId == null) throw new Error("上传失败");
  return { imageUrl: data.imageUrl, portfolioArchiveItemId: data.portfolioArchiveItemId };
}
