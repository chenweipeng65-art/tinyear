/**
 * 在用户点击的同步阶段打开空白页，异步完成后再把地址指过去。
 * 移动端 Safari/Chrome 会在「await 很久之后」拦截 `window.open(真实URL)`，成长档案栅格化较慢时必现。
 */
export function openBlankTabForPdfExport(): Window | null {
  try {
    return window.open("about:blank", "_blank");
  } catch {
    return null;
  }
}

export function closePdfExportPlaceholder(w: Window | null): void {
  if (!w || w.closed) return;
  try {
    w.close();
  } catch {
    /* ignore */
  }
}

/**
 * 打开公网 PDF。若传入 `placeholder`（来自 `openBlankTabForPdfExport`），则优先向其导航，避免弹窗拦截。
 */
export function openPdfFromPublicUrl(url: string, placeholder: Window | null = null): void {
  if (placeholder && !placeholder.closed) {
    try {
      placeholder.location.replace(url);
      return;
    } catch {
      /* 个别环境 replace 失败则回退 */
    }
  }
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (opened) return;
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
