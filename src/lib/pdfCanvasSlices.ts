import type { jsPDF } from "jspdf";

/** 将整页长图按 A4 高度切片写入 PDF（位图 → 多页 JPEG） */
export function addCanvasSlicesToPdf(pdf: jsPDF, canvas: HTMLCanvasElement) {
  const margin = 10;
  const pdfPageW = pdf.internal.pageSize.getWidth();
  const pdfPageH = pdf.internal.pageSize.getHeight();
  const contentWmm = pdfPageW - 2 * margin;
  const contentHmm = pdfPageH - 2 * margin;

  const cw = canvas.width;
  const ch = canvas.height;
  if (cw < 2 || ch < 2) throw new Error("画布无效");

  const scale = contentWmm / cw;
  let srcY = 0;
  let first = true;

  while (srcY < ch) {
    const slicePx = Math.min(ch - srcY, Math.max(1, Math.ceil(contentHmm / scale)));
    const slice = document.createElement("canvas");
    slice.width = cw;
    slice.height = slicePx;
    const ctx = slice.getContext("2d");
    if (!ctx) throw new Error("无法创建画布上下文");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cw, slicePx);
    ctx.drawImage(canvas, 0, srcY, cw, slicePx, 0, 0, cw, slicePx);

    const jpg = slice.toDataURL("image/jpeg", 0.88);
    const sliceHmm = slicePx * scale;

    if (!first) pdf.addPage();
    first = false;
    pdf.addImage(jpg, "JPEG", margin, margin, contentWmm, sliceHmm);
    srcY += slicePx;
  }
}
