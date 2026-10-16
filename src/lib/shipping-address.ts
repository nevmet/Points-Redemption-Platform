export const addressLimits = { recipient: 120, phone: 50, country: 100, region: 100, city: 100, postalCode: 30, line1: 200, line2: 200 } as const;
export type ShippingAddress = Record<keyof typeof addressLimits, string>;
export const requiredAddressFields: (keyof ShippingAddress)[] = ["recipient", "phone", "country", "city", "line1"];
export const emptyShippingAddress: ShippingAddress = { recipient: "", phone: "", country: "", region: "", city: "", postalCode: "", line1: "", line2: "" };

/** Only accept address fields; never pass identity or role fields to storage. */
export function normalizeShippingAddress(value: unknown): ShippingAddress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const result = { ...emptyShippingAddress };
  for (const field of Object.keys(addressLimits) as (keyof ShippingAddress)[]) {
    if (typeof input[field] !== "string") return null;
    const text = input[field].trim();
    if (text.length > addressLimits[field] || Array.from(text).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) return null;
    result[field] = text;
  }
  return requiredAddressFields.every(field => result[field]) ? result : null;
}
