/**
 * S3 兼容上传工具入口（预签名 + 服务端直传）。
 * @example
 * import { uploadBufferToS3, createPresignedUpload } from "./lib/s3.js";
 */
export { S3PresignedPost, generateObjectKey } from "./s3Presign.js";
export {
  getS3ConfigFromEnv,
  createPresignedUpload,
  uploadBufferToS3,
  type S3EnvConfig,
  type PresignedUpload,
} from "./s3UploadService.js";
