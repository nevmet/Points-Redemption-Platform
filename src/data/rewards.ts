export type RewardProduct = {
  id: number;
  translationKey: string;
  name: string;
  category: string;
  points: number;
  image: string;
  description: string;
  status: "Published" | "Draft";
  featured?: boolean;
};

export const rewardProducts: RewardProduct[] = [
  {
    id: 1,
    translationKey: "weekendExplorerBackpack",
    name: "Weekend Explorer Backpack",
    category: "Apple",
    points: 1200,
    image: "/images/product/product-01.jpg",
    description: "A lightweight everyday backpack for short trips and city commutes.",
    status: "Published",
    featured: true,
  },
  {
    id: 2,
    translationKey: "arcticLunchCooler",
    name: "Arctic Lunch Cooler",
    category: "Apple",
    points: 850,
    image: "/images/product/product-02.jpg",
    description: "Compact insulated storage for lunches, samples, and daily essentials.",
    status: "Published",
  },
  {
    id: 3,
    translationKey: "everydayCanvasTote",
    name: "Everyday Canvas Tote",
    category: "Apple",
    points: 980,
    image: "/images/product/product-03.jpg",
    description: "A durable canvas tote with room for documents and small accessories.",
    status: "Published",
    featured: true,
  },
  {
    id: 4,
    translationKey: "customTravelDuffel",
    name: "Custom Travel Duffel",
    category: "Apple",
    points: 1600,
    image: "/images/product/product-04.jpg",
    description: "A roomy duffel designed for travel, trade shows, and weekend plans.",
    status: "Published",
  },
  {
    id: 5,
    translationKey: "canvasUtilityPouch",
    name: "Canvas Utility Pouch",
    category: "Apple",
    points: 600,
    image: "/images/product/product-05.jpg",
    description: "A practical pouch for samples, cables, stationery, or small gifts.",
    status: "Published",
  },
];

export const redemptionHistory = [
  { id: "REW-24018", product: "Custom Travel Duffel", productKey: "customTravelDuffel", date: "18 Sep 2026", status: "Processing", points: 1600 },
  { id: "REW-23972", product: "Canvas Utility Pouch", productKey: "canvasUtilityPouch", date: "04 Aug 2026", status: "Completed", points: 600 },
  { id: "REW-23891", product: "Arctic Lunch Cooler", productKey: "arcticLunchCooler", date: "19 Jul 2026", status: "Completed", points: 850 },
];

export const customerTransactions = [
  { label: "Order #BS-1048 confirmed", labelKey: "order1048", date: "22 Sep 2026", points: "+2,400", type: "credit" },
  { label: "Weekend Explorer Backpack redeemed", labelKey: "backpackRedeemed", date: "20 Sep 2026", points: "-1,200", type: "debit" },
  { label: "Order #BS-1019 confirmed", labelKey: "order1019", date: "04 Aug 2026", points: "+1,600", type: "credit" },
];
