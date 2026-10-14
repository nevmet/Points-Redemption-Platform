import type { TFunction } from "i18next";
import { rewardProducts } from "@/data/rewards";
import type { ProductRow } from "./database";

// Preserve the existing seed catalogue translations until that field is edited.
export function productText(product: ProductRow, field: "name" | "description", t: TFunction) {
  const seed = rewardProducts.find((item) => String(item.id) === product.id);
  return seed && product[field] === seed[field] ? t(`rewards.products.${seed.translationKey}.${field}`) : product[field];
}
