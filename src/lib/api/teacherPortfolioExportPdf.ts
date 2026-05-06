/** 成长档案 PDF：服务端 S3 缓存（与 `server/routes/teacherPortfolioItem.ts` 一致） */

export async function getPortfolioExportPdfCachedUrl(
  itemId: number,
  sectionIds: string[],
): Promise<string | null> {
  const qs = encodeURIComponent([...sectionIds].sort().join(","));
  const res = await fetch(
    `/api/teacher/portfolio-archive-items/${itemId}/export-pdf?sections=${qs}`,
  );
  const data: { ok?: boolean; url?: string; message?: string } = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.message === "string" ? data.message : "查询导出地址失败");
  }
  if (!data.ok) throw new Error("查询导出地址失败");
  return typeof data.url === "string" && data.url.length > 0 ? data.url : null;
}

export async function postPortfolioExportPdf(
  itemId: number,
  sectionIds: string[],
  pdfBody: ArrayBuffer,
  fileName: string,
): Promise<string> {
  const fd = new FormData();
  fd.append("sections", [...sectionIds].sort().join(","));
  fd.append("file", new Blob([pdfBody], { type: "application/pdf" }), fileName);
  const res = await fetch(`/api/teacher/portfolio-archive-items/${itemId}/export-pdf`, {
    method: "POST",
    body: fd,
  });
  const data: { ok?: boolean; url?: string; message?: string } = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.message === "string" ? data.message : "上传 PDF 失败");
  }
  if (!data.ok || typeof data.url !== "string") {
    throw new Error(typeof data.message === "string" ? data.message : "上传 PDF 失败");
  }
  return data.url;
}
