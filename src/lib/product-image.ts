export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PRODUCT_IMAGES = 8;
export function productImages(product: { image_urls?: string[]; image_url?: string | null }): string[] {
  return product.image_urls?.length ? product.image_urls : product.image_url ? [product.image_url] : [];
}
export const PRODUCT_IMAGE_TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;

// Determine the extension from bytes, never from the uploaded filename.
export function productImageExtension(bytes: Uint8Array): keyof typeof PRODUCT_IMAGE_TYPES | null {
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpg";
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)) return "png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "webp";
  return null;
}
