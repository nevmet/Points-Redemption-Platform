import type { ProductOption, SelectedProductOption } from "./database.ts";

export const MAX_PRODUCT_OPTIONS = 5;
export const MAX_OPTION_VALUES = 30;
const clean = (value: unknown, max: number): string => {
  if (typeof value !== "string") throw new Error("optionInvalid");
  const text = value.trim().replace(/\s+/g, " ");
  if (!text || text.length > max) throw new Error("optionInvalid");
  return text;
};

export function validateProductOptions(value: unknown): ProductOption[] {
  if (!Array.isArray(value) || value.length > MAX_PRODUCT_OPTIONS) throw new Error("optionInvalid");
  const ids = new Set<string>();
  const names = new Set<string>();
  return value.map((entry: unknown) => {
    if (!entry || typeof entry !== "object") throw new Error("optionInvalid");
    const row = entry as Record<string, unknown>;
    const name = clean(row.name, 30);
    if (typeof row.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(row.id) || ids.has(row.id) || names.has(name.toLowerCase())) throw new Error("optionInvalid");
    if (!Array.isArray(row.values) || !row.values.length || row.values.length > MAX_OPTION_VALUES) throw new Error("optionInvalid");
    const values = row.values.map((item) => clean(item, 60));
    if (new Set(values.map((item) => item.toLowerCase())).size !== values.length) throw new Error("optionInvalid");
    ids.add(row.id); names.add(name.toLowerCase());
    return { id: row.id, name, values };
  });
}

// Resolve against current server data and save names/values as an immutable snapshot.
export function resolveProductOptions(options: ProductOption[], selection: unknown): SelectedProductOption[] {
  const invalid = (): never => { throw new Error("optionUnavailable"); };
  if (selection === undefined && !options.length) return [];
  if (!Array.isArray(selection) || selection.length !== options.length) return invalid();
  const chosen = new Map<string, string>();
  for (const item of selection) {
    if (!item || typeof item !== "object" || typeof item.optionId !== "string" || typeof item.value !== "string" || chosen.has(item.optionId)) return invalid();
    chosen.set(item.optionId, item.value);
  }
  return options.map((option) => {
    const value = chosen.get(option.id);
    if (value === undefined || !option.values.includes(value)) return invalid();
    return { name: option.name, value };
  });
}
