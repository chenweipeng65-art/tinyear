import type { jsPDF } from "jspdf";

/**
 * 桌面端直接 save；移动端在 await 栅格化后已脱离用户手势，部分浏览器会拦截
 * `a[download]`。优先新开标签展示 Blob PDF，便于用系统「分享 / 存储到文件」保存。
 */
export function savePdfWithMobileFallback(pdf: jsPDF, filename: string): void {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );

  if (!isMobile) {
    pdf.save(filename);
    return;
  }

  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  const newTab = window.open(url, "_blank", "noopener,noreferrer");
  if (newTab) {
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    return;
  }

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener noreferrer";
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
}
