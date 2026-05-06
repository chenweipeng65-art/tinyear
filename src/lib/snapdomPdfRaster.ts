/**
 * PDF 导出栅格化：用 @zumer/snapdom 做 DOM→Canvas（替代 html2canvas）。
 * - 页面内节点：直接 snapdom(element)
 * - 纯 HTML 字符串：隐藏 iframe + srcdoc 同源渲染后再对 body 快照（与部署预览图思路一致）
 */
import { snapdom } from "@zumer/snapdom";
import type { SnapdomOptions } from "@zumer/snapdom";

const baseSnap: SnapdomOptions = {
  backgroundColor: "#ffffff",
  embedFonts: true,
};

async function waitBodyImages(body: HTMLElement): Promise<void> {
  await Promise.all(
    Array.from(body.querySelectorAll("img")).map(
      (img) =>
        new Promise<void>((res) => {
          if (img.complete && img.naturalHeight > 0) res();
          else {
            img.onload = () => res();
            img.onerror = () => res();
          }
        }),
    ),
  );
}

function isMobileExportDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/** 当前页已挂载的 DOM（如分析报告导出根节点） */
export async function snapdomRasterizeElement(
  element: Element,
  overrides?: Partial<SnapdomOptions>,
): Promise<HTMLCanvasElement> {
  const opts: SnapdomOptions = { ...baseSnap, dpr: 1.55, ...overrides };
  const result = await snapdom(element, opts);
  return result.toCanvas(opts);
}

/**
 * 成长档案等：把已转义的 HTML 片段挂到当前文档再栅格化（与抽屉内导出同源路径）。
 * 避免隐藏 iframe + srcdoc 在部分手机浏览器上 snapdom/排版失败。
 */
export async function snapdomRasterizeExportFragment(
  innerHtml: string,
  widthPx: number,
  overrides?: Partial<SnapdomOptions>,
): Promise<HTMLCanvasElement> {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    `width:${widthPx}px`,
    "opacity:0",
    "pointer-events:none",
    "z-index:-1",
    "background:#ffffff",
  ].join(";");
  host.innerHTML = innerHtml;
  document.body.appendChild(host);
  try {
    const root = host.firstElementChild;
    if (!root) throw new Error("导出内容为空");
    await waitBodyImages(host);
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    await new Promise((r) => setTimeout(r, isMobileExportDevice() ? 420 : 220));
    const mobile = isMobileExportDevice();
    const dpr = mobile ? 1.12 : 1.65;
    return await snapdomRasterizeElement(root, { dpr, ...overrides });
  } finally {
    host.remove();
  }
}

/** 将导出用 HTML 片段包成完整 srcdoc 文档（UTF-8 + 白底 + 固定版心宽度） */
export function wrapExportFragmentAsSrcdoc(innerFragment: string, widthPx: number): string {
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"/><style>
html,body{margin:0;padding:0;background:#fff;}
body{box-sizing:border-box;width:${widthPx}px;}
</style></head><body>${innerFragment}</body></html>`;
}

/**
 * 在隐藏 iframe 中加载 srcdoc，对 document.body 做 snapdom，再输出 Canvas。
 * innerFragment 须已转义，避免 XSS。
 */
export async function snapdomRasterizeSrcdoc(
  srcdoc: string,
  widthPx: number,
  overrides?: Partial<SnapdomOptions>,
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    // 避免 visibility:hidden：部分移动 WebKit 不对隐藏 iframe 做完整排版，snapdom 会得到空/错画布。
    iframe.style.cssText = [
      "position:fixed",
      "left:0",
      "top:0",
      `width:${widthPx}px`,
      "min-height:320px",
      "border:none",
      "opacity:0",
      "pointer-events:none",
      "z-index:-1",
    ].join(";");
    // 仅 allow-same-origin 时，部分机型上 canvas/字体子资源受限；导出 HTML 无外链脚本，放宽以便 snapdom。
    iframe.sandbox.add("allow-same-origin");
    iframe.sandbox.add("allow-scripts");

    const cleanup = () => {
      iframe.remove();
    };

    iframe.onload = () => {
      void (async () => {
        try {
          const body = iframe.contentDocument?.body;
          if (!body) throw new Error("iframe 无 body");
          await waitBodyImages(body);
          await new Promise((r) => requestAnimationFrame(() => r(undefined)));
          await new Promise((r) => setTimeout(r, 320));
          const opts: SnapdomOptions = { ...baseSnap, dpr: 1.65, ...overrides };
          const result = await snapdom(body, opts);
          const canvas = await result.toCanvas(opts);
          cleanup();
          resolve(canvas);
        } catch (e) {
          cleanup();
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      })();
    };

    iframe.onerror = () => {
      cleanup();
      reject(new Error("iframe 加载失败"));
    };

    document.body.appendChild(iframe);
    iframe.srcdoc = srcdoc;
  });
}
