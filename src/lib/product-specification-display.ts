import type { TFunction } from "i18next";
import type { PointTransactionRow, ProductVariant } from "./database";

const terms: Record<string, string[]> = {
  series: ["系列", "series"], storage: ["内存", "存储", "存储容量", "storage", "memory"],
  color: ["颜色", "色彩", "color", "colour"], model: ["型号", "model"],
  size: ["尺寸", "大小", "size"], material: ["材质", "material"], capacity: ["容量", "capacity"],
  style: ["款式", "风格", "style"], version: ["版本", "version"], configuration: ["规格", "配置", "configuration"],
  burgundy: ["勃艮第酒红色", "勃艮第红", "酒红色", "酒红", "burgundy", "burgundy red"],
  glacierBlue: ["冰川蓝色", "冰川蓝", "glacier blue"], silver: ["银色", "银", "silver"],
  black: ["黑色", "黑", "black"], white: ["白色", "白", "white"],
  blue: ["蓝色", "蓝", "blue"], red: ["红色", "红", "red"], green: ["绿色", "绿", "green"],
  gold: ["金色", "金", "gold"], pink: ["粉色", "粉红色", "pink"], purple: ["紫色", "紫", "purple"],
  gray: ["灰色", "灰", "gray", "grey"], orange: ["橙色", "橙", "orange"],
  yellow: ["黄色", "黄", "yellow"], brown: ["棕色", "棕", "brown"], beige: ["米色", "米白色", "beige"],
  small: ["小号", "small"], medium: ["中号", "medium"], large: ["大号", "large"],
};
const keys = new Map(Object.entries(terms).flatMap(([key, aliases]) => aliases.map((alias) => [alias, key] as const)));

// Display translations never change the identifiers or values sent to the server.
// Custom terms can be entered as “中文 | English” without changing the product schema.
export function specificationTerm(value: string, t: TFunction, language: string): string {
  const text = value.trim();
  const bilingual = text.split(/\s*[|｜]\s*/);
  if (bilingual.length === 2 && bilingual.every(Boolean)) return language.startsWith("zh") ? bilingual[0] : bilingual[1];
  const key = keys.get(text.toLowerCase());
  return key ? t(`productSpecifications.${key}`) : value;
}

export function specificationText(value: string, t: TFunction, language: string): string {
  return value.split(" / ").map((part) => {
    const match = part.match(/^([^:：]+)[:：]\s*(.+)$/);
    return match ? `${specificationTerm(match[1], t, language)}: ${specificationTerm(match[2], t, language)}` : specificationTerm(part, t, language);
  }).join(" / ");
}

export function variantText(variant: ProductVariant, t: TFunction, language: string): string {
  return variant.attributes?.length
    ? variant.attributes.map((item) => `${specificationTerm(item.name, t, language)}: ${specificationTerm(item.value, t, language)}`).join(" / ")
    : specificationText(variant.name, t, language);
}

export function pointDescription(row: Pick<PointTransactionRow, "description" | "type" | "operation_id">, t: TFunction, language: string): string {
  if (row.type !== "debit" || row.operation_id) return row.description;
  const [name, ...specifications] = row.description.split(" · ");
  return [name, ...specifications.map((text) => specificationText(text, t, language))].join(" · ");
}
