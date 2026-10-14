import type { ProductVariant } from "./database.ts";
export const MAX_PRODUCT_VARIANTS = 30;
export const MAX_VARIANT_FIELDS = 5;

export function validateProductVariants(value: unknown): ProductVariant[] {
  const invalid = (): never => { throw new Error("variantInvalid"); };
  if (!Array.isArray(value) || value.length > MAX_PRODUCT_VARIANTS) return invalid();
  const ids = new Set<string>();
  const names = new Set<string>();
  let fieldSignature: string | undefined;
  return value.map((entry: unknown) => {
    if (!entry || typeof entry !== "object") return invalid();
    const row = entry as Record<string, unknown>;
    if (typeof row.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(row.id) || ids.has(row.id)) return invalid();
    let attributes: ProductVariant["attributes"];
    if (row.attributes !== undefined) {
      if (!Array.isArray(row.attributes) || !row.attributes.length || row.attributes.length > MAX_VARIANT_FIELDS) return invalid();
      const fields = new Set<string>();
      attributes = row.attributes.map((attribute: unknown) => {
        if (!attribute || typeof attribute !== "object") return invalid();
        const item = attribute as Record<string, unknown>;
        if (typeof item.name !== "string" || typeof item.value !== "string") return invalid();
        const name = item.name.trim().replace(/\s+/g, " ");
        const value = item.value.trim().replace(/\s+/g, " ");
        if (!name || name.length > 30 || !value || value.length > 60 || fields.has(name.toLowerCase())) return invalid();
        fields.add(name.toLowerCase());
        return { name, value };
      });
    } else if (typeof row.name !== "string" || !row.name.trim() || row.name.length > 100) return invalid();
    const signature = JSON.stringify(attributes?.map((item) => item.name) || []);
    if (fieldSignature !== undefined && fieldSignature !== signature) return invalid();
    fieldSignature = signature;
    const name = attributes ? attributes.map((item) => `${item.name}: ${item.value}`).join(" / ") : (row.name as string).trim().replace(/\s+/g, " ");
    const combination = JSON.stringify(attributes ? attributes.map((item) => item.value.toLowerCase()) : [name.toLowerCase()]);
    if (names.has(combination) || typeof row.points !== "number" || !Number.isInteger(row.points) || row.points < 1 || row.points > 2147483647) return invalid();
    ids.add(row.id); names.add(combination);
    return { id: row.id, name, points: row.points, ...(attributes ? { attributes } : {}) };
  });
}
