import { addCanvasSlicesToPdf } from "@/lib/pdfCanvasSlices";
import { savePdfWithMobileFallback } from "@/lib/savePdfWithMobileFallback";
import { snapdomRasterizeElement } from "@/lib/snapdomPdfRaster";

async function rasterizeElementToJsPdf(element: HTMLElement) {
  const { jsPDF } = await import("jspdf");

  await new Promise((r) => requestAnimationFrame(() => r(undefined)));
  await new Promise((r) => setTimeout(r, 120));

  const canvas = await snapdomRasterizeElement(element, { dpr: 1.55 });

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  addCanvasSlicesToPdf(pdf, canvas);
  return pdf;
}

/** 栅格化为 PDF 二进制，供上传 S3 */
export async function exportElementToPdfBytes(element: HTMLElement): Promise<ArrayBuffer> {
  const pdf = await rasterizeElementToJsPdf(element);
  return pdf.output("arraybuffer") as ArrayBuffer;
}

/**
 * 将 DOM 节点栅格化为多页 A4 PDF 并下载（@zumer/snapdom → Canvas → jsPDF 切片）
 */
export async function exportElementToPdf(element: HTMLElement, filename: string): Promise<void> {
  const pdf = await rasterizeElementToJsPdf(element);
  savePdfWithMobileFallback(pdf, filename);
}
