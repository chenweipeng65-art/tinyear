/**
 * 家长端登录分享链接（在保留 Hash 路由的前提下，用查询参数承载目标路径）。
 *
 * 纯 Hash 链接（如 `https://a.com/#/parent/login`）在微信等场景里常被截成只剩 `#/...`，
 * 对方无法还原完整地址。将路由写在 `?open=` 中（位于 `#` 之前），整段 URL 可被正常复制与打开。
 */
export function getParentLoginShareUrl() {
  const { origin, pathname } = window.location;
  let base = pathname.replace(/\/index\.html$/i, "");
  base = base.replace(/\/+$/, "") || "";
  const path = base === "" ? "/" : base;
  const url = new URL(path, origin);
  url.searchParams.set("open", "/parent/login");
  return url.href;
}
