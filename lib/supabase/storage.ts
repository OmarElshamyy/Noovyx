import { getSupabaseBrowserClient } from "./client";

const MAX_IMAGE_FILE_BYTES = 5 * 1024 * 1024; // 5 MiB (matches bucket limit)
const ALLOWED_IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/webp", "image/avif"]);

export async function validateRasterImageMagicBytes(file: File): Promise<boolean> {
  try {
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 4) return false;

    const isPng =
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isWebp =
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50;
    const isAvif =
      bytes.length >= 12 &&
      bytes[4] === 0x66 &&
      bytes[5] === 0x74 &&
      bytes[6] === 0x79 &&
      bytes[7] === 0x70;

    return isPng || isJpeg || isWebp || isAvif;
  } catch {
    return false;
  }
}

export async function reencodeImageToWebpBlob(file: File, maxDimension = 1200): Promise<Blob> {
  if (!ALLOWED_IMAGE_MIMES.has(file.type)) {
    throw new Error("Only PNG, JPEG, WEBP, and AVIF raster images are allowed (SVG is blocked).");
  }
  if (file.size > MAX_IMAGE_FILE_BYTES) {
    throw new Error("Image file exceeds the 5 MB maximum size limit.");
  }
  const magicValid = await validateRasterImageMagicBytes(file);
  if (!magicValid) {
    throw new Error("Invalid image file header (magic-byte verification failed).");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context unavailable for image re-encoding."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to encode WEBP image blob."));
              return;
            }
            resolve(blob);
          },
          "image/webp",
          0.88,
        );
      };
      img.onerror = () => reject(new Error("Failed to load image file."));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

function safeSlugSegment(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "item"
  );
}

/**
 * Re-encodes a raster image safely in the browser (stripping EXIF/active payloads)
 * and uploads it directly to Supabase Storage using the authenticated admin session.
 */
export async function uploadImageToSupabaseStorage(
  file: File,
  options: { bucket: "product-images" | "cms-assets"; folder: string },
): Promise<{ publicUrl: string; storagePath: string }> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Supabase Storage client is not configured.");
  }

  const blob = await reencodeImageToWebpBlob(file);
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  const folder = safeSlugSegment(options.folder);
  const storagePath = `${folder}/${Date.now()}-${rand}.webp`;

  const { error } = await supabase.storage.from(options.bucket).upload(storagePath, blob, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(options.bucket).getPublicUrl(storagePath);
  return {
    publicUrl: data.publicUrl,
    storagePath,
  };
}
