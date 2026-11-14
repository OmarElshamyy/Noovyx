import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const DATA_IMAGE_RE = /^data:(image\/(?:png|jpeg|jpg|webp|avif));base64,([A-Za-z0-9+/=]+)$/i;

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/avif": "avif",
};

export function isBase64DataImage(value: string): boolean {
  return DATA_IMAGE_RE.test(value.trim());
}

export function decodeBase64DataImage(dataUrl: string): {
  mimeType: string;
  ext: string;
  buffer: Buffer;
  sha256: string;
} | null {
  const match = DATA_IMAGE_RE.exec(dataUrl.trim());
  if (!match) return null;
  const mimeType = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 16);
  const ext = MIME_EXT[mimeType] || "png";
  return { mimeType, ext, buffer, sha256 };
}

export async function migrateImageUrlToStorage(
  rawUrl: string,
  options: {
    supabase: SupabaseClient | null;
    bucket: "product-images" | "cms-assets";
    entitySlug: string;
    position: number;
    dryRun: boolean;
  },
): Promise<{ finalUrl: string; storagePath: string | null; extractedBase64: boolean; byteSize: number }> {
  const trimmed = rawUrl.trim();
  const decoded = decodeBase64DataImage(trimmed);

  if (!decoded) {
    return {
      finalUrl: trimmed,
      storagePath: null,
      extractedBase64: false,
      byteSize: 0,
    };
  }

  const safeSlug =
    options.entitySlug
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "asset";

  const storagePath = `migrated/${safeSlug}/${options.position}-${decoded.sha256}.${decoded.ext}`;

  if (options.dryRun || !options.supabase) {
    return {
      finalUrl: `supabase-storage://${options.bucket}/${storagePath}`,
      storagePath,
      extractedBase64: true,
      byteSize: decoded.buffer.byteLength,
    };
  }

  const { error } = await options.supabase.storage.from(options.bucket).upload(storagePath, decoded.buffer, {
    contentType: decoded.mimeType,
    cacheControl: "31536000",
    upsert: true,
  });

  if (error) {
    throw new Error(`Storage migration failed for "${storagePath}": ${error.message}`);
  }

  const { data } = options.supabase.storage.from(options.bucket).getPublicUrl(storagePath);
  return {
    finalUrl: data.publicUrl,
    storagePath,
    extractedBase64: true,
    byteSize: decoded.buffer.byteLength,
  };
}
