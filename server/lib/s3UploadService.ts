/**
 * 基于环境变量的 S3 兼容上传服务（预签名 POST + multipart/form-data）。
 * 所需变量与仓库根目录 `.env` 中 `S3_*` 一致。
 */
import { S3PresignedPost, generateObjectKey } from "./s3Presign.js";

const DEFAULT_NAME_STYLE = "YYYY-MM-DD-HH-mm-ss-filename-file.file_ext";

export type S3EnvConfig = {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  region: string;
  cdnUrl: string;
  /** 对象 key 命名模板（YYYY、MM、filename、file_ext、random 等占位符） */
  nameStyle: string;
};

function trimTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

/** 从 `process.env` 读取配置；缺项时抛出明确错误（需在入口已 `import "dotenv/config"`） */
export function getS3ConfigFromEnv(): S3EnvConfig {
  const endpoint = process.env.S3_ENDPOINT?.trim() ?? "";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim() ?? "";
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim() ?? "";
  const bucketName = process.env.S3_BUCKET_NAME?.trim() ?? "";
  const region = process.env.S3_REGION?.trim() ?? "";
  const cdnUrl = process.env.S3_CDN?.trim() ?? "";

  const missing: string[] = [];
  if (!endpoint) missing.push("S3_ENDPOINT");
  if (!accessKeyId) missing.push("S3_ACCESS_KEY_ID");
  if (!secretAccessKey) missing.push("S3_SECRET_ACCESS_KEY");
  if (!bucketName) missing.push("S3_BUCKET_NAME");
  if (!region) missing.push("S3_REGION");
  if (!cdnUrl) missing.push("S3_CDN");
  if (missing.length) {
    throw new Error(`S3 配置不完整，请检查 .env：缺少 ${missing.join(", ")}`);
  }

  return {
    endpoint,
    accessKeyId,
    secretAccessKey,
    bucketName,
    region,
    cdnUrl,
    nameStyle: process.env.S3_OBJECT_NAME_STYLE?.trim() || DEFAULT_NAME_STYLE,
  };
}

export type PresignedUpload = {
  /** 浏览器或 Node fetch POST 的目标 URL */
  postUrl: string;
  /** 表单隐藏字段（需与 file 字段一并提交） */
  fields: Record<string, string>;
  /** 本次上传使用的对象 key */
  objectKey: string;
  /** 上传成功后可访问的 URL（CDN + key） */
  publicUrl: string;
};

/**
 * 为指定原始文件名生成预签名 POST 参数（不读 body，仅签名）。
 */
export function createPresignedUpload(originalFileName: string, options?: { expiresInSeconds?: number }): PresignedUpload {
  const config = getS3ConfigFromEnv();
  const objectKey = generateObjectKey(config.nameStyle, originalFileName);
  const { url, fields } = S3PresignedPost.create({
    bucket: config.bucketName,
    region: config.region,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    key: objectKey,
    acl: "public-read",
    expiresInSeconds: options?.expiresInSeconds ?? 600,
    endpoint: config.endpoint,
  });

  return {
    postUrl: url,
    fields,
    objectKey,
    publicUrl: `${trimTrailingSlash(config.cdnUrl)}/${objectKey}`,
  };
}

/**
 * 在服务端将二进制上传到 S3 兼容存储，返回 CDN 公网 URL。
 */
export async function uploadBufferToS3(
  body: Buffer | Uint8Array,
  originalFileName: string,
  contentType = "application/octet-stream",
): Promise<string> {
  const config = getS3ConfigFromEnv();
  const objectKey = generateObjectKey(config.nameStyle, originalFileName);
  const { url, fields } = S3PresignedPost.create({
    bucket: config.bucketName,
    region: config.region,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    key: objectKey,
    acl: "public-read",
    expiresInSeconds: 600,
    endpoint: config.endpoint,
  });

  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
  /** 拷贝为独立 `ArrayBuffer`，避免 Node `Buffer` / `ArrayBufferLike` 与 DOM `BlobPart` 类型冲突 */
  const ab = new ArrayBuffer(buf.byteLength);
  new Uint8Array(ab).set(buf);
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    form.append(k, v);
  }
  form.append("file", new Blob([ab], { type: contentType }), originalFileName);

  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`S3 上传失败 HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
  }

  return `${trimTrailingSlash(config.cdnUrl)}/${objectKey}`;
}
