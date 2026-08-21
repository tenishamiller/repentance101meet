/** Profile photos are shown in small circles; keep the stored file small too. */
export const AVATAR_MAX_EDGE = 512;
export const AVATAR_WEBP_QUALITY = 80;

export type OptimizedImage = {
  buffer: Buffer;
  contentType: string;
  ext: string;
};

/**
 * Auto-orient (EXIF), square-cover resize, and encode WebP.
 * Falls back to the original bytes if sharp is unavailable or the file is not an image.
 */
export async function optimizeAvatarImage(
  input: Buffer,
  originalContentType?: string,
): Promise<OptimizedImage> {
  try {
    const sharp = (await import("sharp")).default;
    const buffer = await sharp(input, { failOn: "none", animated: false })
      .rotate()
      .resize(AVATAR_MAX_EDGE, AVATAR_MAX_EDGE, {
        fit: "cover",
        withoutEnlargement: true,
      })
      .webp({ quality: AVATAR_WEBP_QUALITY })
      .toBuffer();

    return { buffer, contentType: "image/webp", ext: ".webp" };
  } catch {
    const fallbackType = originalContentType?.startsWith("image/")
      ? originalContentType
      : "image/jpeg";
    const ext =
      fallbackType === "image/png"
        ? ".png"
        : fallbackType === "image/webp"
          ? ".webp"
          : fallbackType === "image/gif"
            ? ".gif"
            : ".jpg";
    return { buffer: input, contentType: fallbackType, ext };
  }
}
