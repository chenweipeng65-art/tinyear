type ApiErrorBody = { error?: string; message?: string };

export async function apiGet<T>(path: string): Promise<T> {
  const url = path.startsWith("/api") ? path : `/api${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url);
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  if (!res.ok) {
    const b = body as ApiErrorBody;
    const msg = b.message ?? b.error ?? `请求失败 (${res.status})`;
    throw new Error(msg);
  }
  return body as T;
}
