import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getS3Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing R2 credentials");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

function getBucketName(): string {
  return process.env.R2_BUCKET_NAME || "kirameku-files";
}

/**
 * CORS 配置说明：
 * 请在 Cloudflare R2 控制台预设 CORS 规则，避免 Serverless 冷启动时重复配置。
 * 推荐设置：
 *   AllowedOrigins: ["*"]
 *   AllowedMethods: ["PUT", "POST", "GET", "DELETE", "HEAD"]
 *   AllowedHeaders: ["*"]
 *   MaxAgeSeconds: 3600
 */

export async function uploadFile(
  key: string,
  buffer: ArrayBuffer,
  contentType: string
): Promise<string> {
  const client = getS3Client();
  const bucket = getBucketName();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(buffer),
      ContentType: contentType,
    })
  );

  return getFileUrl(key);
}

export async function deleteFile(key: string): Promise<void> {
  const client = getS3Client();
  const bucket = getBucketName();

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
  } catch {
    // ignore
  }
}

export async function getFile(key: string): Promise<Buffer | null> {
  const client = getS3Client();
  const bucket = getBucketName();

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
    if (!response.Body) return null;
    const chunks: Buffer[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
}

export function getFileUrl(key: string): string {
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (publicUrl) {
    return `${publicUrl.replace(/\/$/, "")}/${key}`;
  }
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucket = getBucketName();
  if (accountId) {
    return `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;
  }
  return `https://r2.cloudflarestorage.com/${bucket}/${key}`;
}

export function cleanUrlPath(url: string): string {
  try {
    const parsed = new URL(url);
    let path = parsed.pathname;
    const bucket = getBucketName();
    if (path.startsWith(`/${bucket}/`)) {
      path = path.slice(bucket.length + 2);
    }
    return path.replace(/^\//, "");
  } catch {
    return url.replace(/^\//, "");
  }
}

export function isR2Url(url: string): boolean {
  try {
    const parsed = new URL(url);
    const publicUrl = process.env.R2_PUBLIC_URL;
    if (publicUrl) {
      const publicHostname = new URL(publicUrl).hostname;
      if (parsed.hostname === publicHostname) return true;
    }
    const accountId = process.env.R2_ACCOUNT_ID;
    if (accountId && parsed.hostname === `${accountId}.r2.cloudflarestorage.com`) {
      return true;
    }
    if (parsed.hostname.endsWith(".r2.cloudflarestorage.com")) return true;
    return false;
  } catch {
    return false;
  }
}

export function extractR2Urls(content: string): string[] {
  const urls: string[] = [];
  const mdImg = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
  const htmlImg = /<img[^>]+src=["'](https?:\/\/[^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = mdImg.exec(content)) !== null) urls.push(m[1]);
  while ((m = htmlImg.exec(content)) !== null) urls.push(m[1]);
  return [...new Set(urls.filter(isR2Url))];
}

export function generateFileName(ext: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}.${ext}`;
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 300
): Promise<string> {
  const client = getS3Client();
  const bucket = getBucketName();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn });
}
