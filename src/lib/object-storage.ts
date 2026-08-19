import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.S3_BUCKET?.trim() || "media";

function s3InternalEndpoint() {
  return process.env.S3_ENDPOINT?.replace(/\/$/, "") || "";
}

function s3PublicEndpoint() {
  return (
    process.env.S3_PUBLIC_ENDPOINT?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    ""
  );
}

export function isS3Configured() {
  return Boolean(
    process.env.S3_ENDPOINT &&
      process.env.S3_ACCESS_KEY &&
      process.env.S3_SECRET_KEY,
  );
}

export function isCloudStorageConfigured() {
  return isS3Configured();
}

function createS3Client(endpoint: string) {
  return new S3Client({
    region: process.env.S3_REGION?.trim() || "us-east-1",
    endpoint,
    forcePathStyle: true,
    // MinIO rejects the AWS SDK's default CRC32 checksum headers.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
  });
}

export function getPublicObjectUrl(storagePath: string) {
  if (isS3Configured()) {
    const base = s3PublicEndpoint();
    return `${base}/${BUCKET}/${storagePath.split("/").map(encodeURIComponent).join("/")}`;
  }

  return `/uploads/${storagePath}`;
}

export async function createSignedUpload(options: {
  storagePath: string;
  contentType: string;
  upsert?: boolean;
}): Promise<{ signedUrl: string; publicUrl: string; token?: string; path: string }> {
  const { storagePath, contentType } = options;

  if (!isS3Configured()) {
    throw new Error("File storage is not configured");
  }

  const client = createS3Client(s3PublicEndpoint() || s3InternalEndpoint());
  const signedUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: storagePath,
      ContentType: contentType,
    }),
    { expiresIn: 60 * 60 },
  );
  return {
    signedUrl,
    publicUrl: getPublicObjectUrl(storagePath),
    path: storagePath,
  };
}

export async function uploadObjectBuffer(options: {
  storagePath: string;
  buffer: Buffer;
  contentType: string;
  upsert?: boolean;
}): Promise<{ publicUrl: string }> {
  const { storagePath, buffer, contentType } = options;

  if (!isS3Configured()) {
    throw new Error("File storage is not configured");
  }

  const client = createS3Client(s3InternalEndpoint());
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: storagePath,
      Body: buffer,
      ContentType: contentType,
    }),
  );
  return { publicUrl: getPublicObjectUrl(storagePath) };
}

export function storagePathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    if (url.startsWith("/recordings/")) return null;
    const parsed = new URL(url, "https://repentance101ministry.com");
    const pathname = parsed.pathname;

    const legacyMarker = "/storage/v1/object/public/uploads/";
    const legacyIdx = pathname.indexOf(legacyMarker);
    if (legacyIdx >= 0) {
      return decodeURIComponent(pathname.slice(legacyIdx + legacyMarker.length));
    }

    const mediaPrefix = `/${BUCKET}/`;
    if (pathname.startsWith(mediaPrefix)) {
      return decodeURIComponent(pathname.slice(mediaPrefix.length));
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function deleteStoredObject(storagePath: string) {
  if (!isS3Configured()) return;

  const client = createS3Client(s3InternalEndpoint());
  await client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: storagePath,
    }),
  );
}
