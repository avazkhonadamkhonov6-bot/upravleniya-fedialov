"use client";

/** Суроғаи акси мол (ҷамъиятӣ, бо кеши як сол) */
export const imageUrl = (id: number) => `/api/images/${id}`;

/**
 * Аксро пеш аз фиристодан хурд мекунем: тарафи калон то 800px, WebP ~80% —
 * одатан 50–120 КБ. Базаи ройгон зуд пур намешавад ва сайт тез кушода мешавад.
 */
export async function compressImage(file: File, max = 800): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("not-image");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const toBlob = (type: string, q: number) => new Promise<Blob | null>((ok) => canvas.toBlob(ok, type, q));
  // Safari-и кӯҳна WebP намесозад — он гоҳ JPEG
  const webp = await toBlob("image/webp", 0.8);
  const blob = webp?.type === "image/webp" ? webp : await toBlob("image/jpeg", 0.82);
  if (!blob) throw new Error("encode");
  return blob;
}
