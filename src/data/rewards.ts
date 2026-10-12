export type RewardCategory = "All" | "Travel" | "Daily" | "Branding";

export type RewardProduct = {
  id: number;
  name: string;
  category: Exclude<RewardCategory, "All">;
  points: number;
  image: string;
  description: string;
  status: "Published" | "Draft";
  featured?: boolean;
};

export const rewardProducts: RewardProduct[] = [
  {
    id: 1,
    name: "Weekend Explorer Backpack",
    category: "Travel",
    points: 1200,
    image: "/images/product/product-01.jpg",
    description: "A lightweight everyday backpack for short trips and city commutes.",
    status: "Published",
    featured: true,
  },
  {
    id: 2,
    name: "Arctic Lunch Cooler",
    category: "Daily",
    points: 850,
    image: "/images/product/product-02.jpg",
    description: "Compact insulated storage for lunches, samples, and daily essentials.",
    status: "Published",
  },
  {
    id: 3,
    name: "Everyday Canvas Tote",
    category: "Daily",
    points: 980,
    image: "/images/product/product-03.jpg",
    description: "A durable canvas tote with room for documents and small accessories.",
    status: "Published",
    featured: true,
  },
  {
    id: 4,
    name: "Custom Travel Duffel",
    category: "Travel",
    points: 1600,
    image: "/images/product/product-04.jpg",
    description: "A roomy duffel designed for travel, trade shows, and weekend plans.",
    status: "Published",
  },
  {
    id: 5,
    name: "Canvas Utility Pouch",
    category: "Branding",
    points: 600,
    image: "/images/product/product-05.jpg",
    description: "A practical pouch for samples, cables, stationery, or small gifts.",
    status: "Published",
  },
];

export const redemptionHistory = [
  { id: "REW-24018", product: "Custom Travel Duffel", date: "18 Sep 2026", status: "Processing", points: 1600 },
  { id: "REW-23972", product: "Canvas Utility Pouch", date: "04 Aug 2026", status: "Completed", points: 600 },
  { id: "REW-23891", product: "Arctic Lunch Cooler", date: "19 Jul 2026", status: "Completed", points: 850 },
];

export const customerTransactions = [
  { label: "Order #BS-1048 confirmed", date: "22 Sep 2026", points: "+2,400", type: "credit" },
  { label: "Weekend Explorer Backpack redeemed", date: "20 Sep 2026", points: "-1,200", type: "debit" },
  { label: "Order #BS-1019 confirmed", date: "04 Aug 2026", points: "+1,600", type: "credit" },
];
