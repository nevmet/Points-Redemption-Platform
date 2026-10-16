export type AppUser = {
  id: string;
  username: string;
  email: string;
  role: "customer" | "admin";
  avatarUrl?: string | null;
};
