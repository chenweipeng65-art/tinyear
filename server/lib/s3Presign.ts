/**
 * S3 兼容存储的 AWS Signature V4 预签名 POST。
 * 仅依赖 Node crypto，供服务端上传工具使用。
 */
import crypto from "node:crypto";

export type PresignedPostOptions = {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  key: string;
  expiresInSeconds?: number;
  acl?: string;
  contentTypeStartsWith?: string;
  endpoint?: string;
};

export type PresignedPostResult = {
  url: string;
  fields: Record<string, string>;
};

function hmac(key: string | Buffer, str: string): Buffer {
  return crypto.createHmac("sha256", key).update(str, "utf8").digest();
}

function getSignatureKey(secretKey: string, date: string, region: string, service: string): Buffer {
  const kDate = hmac(`AWS4${secretKey}`, date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

export class S3PresignedPost {
  static create(options: PresignedPostOptions): PresignedPostResult {
    const {
      bucket,
      region,
      accessKeyId,
      secretAccessKey,
      key,
      expiresInSeconds = 3600,
      acl = "public-read",
      endpoint,
      contentTypeStartsWith,
    } = options;

    const now = new Date();
    const shortDate = now.toISOString().slice(0, 10).replace(/-/g, "");
    const amzDate = `${shortDate}T000000Z`;
    const credential = `${accessKeyId}/${shortDate}/${region}/s3/aws4_request`;

    const expiration = new Date(now.getTime() + expiresInSeconds * 1000).toISOString();

    const conditions: unknown[] = [
      { bucket },
      { key },
      { acl },
      { "x-amz-algorithm": "AWS4-HMAC-SHA256" },
      { "x-amz-credential": credential },
      { "x-amz-date": amzDate },
    ];

    if (contentTypeStartsWith) {
      conditions.push(["starts-with", "$Content-Type", contentTypeStartsWith]);
    }

    const policy = { expiration, conditions };
    const policyBase64 = Buffer.from(JSON.stringify(policy)).toString("base64");

    const signingKey = getSignatureKey(secretAccessKey, shortDate, region, "s3");
    const signature = hmac(signingKey, policyBase64).toString("hex");

    return {
      url: endpoint || `https://${bucket}.s3.${region}.amazonaws.com/`,
      fields: {
        key,
        acl,
        "x-amz-algorithm": "AWS4-HMAC-SHA256",
        "x-amz-credential": credential,
        "x-amz-date": amzDate,
        policy: policyBase64,
        "x-amz-signature": signature,
      },
    };
  }
}

/** 按模板生成对象 key */
export function generateObjectKey(nameStyle: string, fileName: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();
  const names = fileName.split(".");
  const fileExt = names.at(-1);
  const filename = names.slice(0, names.length - 1).join(".");
  const random = Math.random().toString(36).substring(2, 15);

  return nameStyle
    .replace(/YYYY/g, String(year))
    .replace(/MM/g, String(month))
    .replace(/DD/g, String(day))
    .replace(/HH/g, String(hour))
    .replace(/mm/g, String(minute))
    .replace(/ss/g, String(second))
    .replace(/filename/g, filename ?? "")
    .replace(/file_ext/g, fileExt ?? "")
    .replace(/random/g, random);
}
