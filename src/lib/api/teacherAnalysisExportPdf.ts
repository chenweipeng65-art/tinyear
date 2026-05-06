export async function getIndividualAnalysisExportPdfCachedUrl(
  analysisId: number,
): Promise<string | null> {
  const res = await fetch(`/api/teacher/ai-individual-analyses/${analysisId}/export-pdf`);
  const data: { ok?: boolean; url?: string; message?: string } = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.message === "string" ? data.message : "查询导出地址失败");
  }
  if (!data.ok) throw new Error("查询导出地址失败");
  return typeof data.url === "string" && data.url.length > 0 ? data.url : null;
}

export async function postIndividualAnalysisExportPdf(
  analysisId: number,
  pdfBody: ArrayBuffer,
  fileName: string,
): Promise<string> {
  const fd = new FormData();
  fd.append("file", new Blob([pdfBody], { type: "application/pdf" }), fileName);
  const res = await fetch(`/api/teacher/ai-individual-analyses/${analysisId}/export-pdf`, {
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

export async function getClassAnalysisExportPdfCachedUrl(analysisId: number): Promise<string | null> {
  const res = await fetch(`/api/teacher/ai-class-analyses/${analysisId}/export-pdf`);
  const data: { ok?: boolean; url?: string; message?: string } = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.message === "string" ? data.message : "查询导出地址失败");
  }
  if (!data.ok) throw new Error("查询导出地址失败");
  return typeof data.url === "string" && data.url.length > 0 ? data.url : null;
}

export async function postClassAnalysisExportPdf(
  analysisId: number,
  pdfBody: ArrayBuffer,
  fileName: string,
): Promise<string> {
  const fd = new FormData();
  fd.append("file", new Blob([pdfBody], { type: "application/pdf" }), fileName);
  const res = await fetch(`/api/teacher/ai-class-analyses/${analysisId}/export-pdf`, {
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
