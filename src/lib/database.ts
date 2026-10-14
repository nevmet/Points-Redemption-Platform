export type ProductStatus = "published" | "draft";
export type RedemptionStatus = "pending" | "processing" | "completed" | "cancelled" | "rejected";
export type PointTransactionType = "credit" | "debit";
export type ProductCategoryRow = { id: string; name: string; created_at: string };
export type ProductVariant = { id: string; name: string; points: number; attributes?: { name: string; value: string }[] };
export type ProductOption = { id: string; name: string; values: string[] };
export type SelectedProductOption = { name: string; value: string };

export type ProductRow = {
  id: string;
  name: string;
  category: string;
  points: number;
  image_url: string | null;
  image_urls?: string[];
  variants?: ProductVariant[];
  options?: ProductOption[];
  description: string;
  status: ProductStatus;
  featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ProductInsert = {
  id?: string;
  name: string;
  category: string;
  points: number;
  image_url?: string | null;
  image_urls?: string[];
  variants?: ProductVariant[];
  options?: ProductOption[];
  description?: string;
  status?: ProductStatus;
  featured?: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
};

export type ProductUpdate = Partial<ProductInsert>;

export type RedemptionRequestRow = {
  operation_id?: string;
  operation_fingerprint?: string;
  resolution_note?: string;
  refunded_at?: string;
  status_history?: { status: RedemptionStatus; at: string; by: string; note: string }[];
  selected_options?: SelectedProductOption[];
  product_name?: string;
  variant_id?: string | null;
  variant_name?: string | null;
  id: string;
  request_code: string;
  customer_name: string;
  customer_email: string;
  company: string | null;
  product_id: string | null;
  points: number;
  status: RedemptionStatus;
  created_at: string;
  updated_at: string;
};

export type RedemptionRequestInsert = {
  selected_options?: SelectedProductOption[];
  product_name?: string;
  variant_id?: string | null;
  variant_name?: string | null;
  id?: string;
  request_code?: string;
  customer_name: string;
  customer_email: string;
  company?: string | null;
  product_id: string;
  points: number;
  status?: RedemptionStatus;
  created_at?: string;
  updated_at?: string;
};

export type RedemptionRequestUpdate = Partial<RedemptionRequestInsert>;

export type PointTransactionRow = {
  refund_redemption_id?: string;
  operation_id?: string | null;
  created_by?: string | null;
  operator_name?: string | null;
  balance_after?: number | null;
  id: string;
  customer_email: string;
  description: string;
  points: number;
  type: PointTransactionType;
  created_at: string;
  order_point_request_id: string | null;
  customer_id: string | null;
};

export type PointTransactionInsert = {
  id?: string;
  customer_email: string;
  description: string;
  points: number;
  type: PointTransactionType;
  created_at?: string;
  order_point_request_id?: string | null;
  customer_id?: string | null;
};

export type OrderPointRequestRow = {
  id: string;
  order_number: string;
  customer_id: string;
  customer_email: string;
  status: "pending" | "approved" | "rejected";
  awarded_points: number | null;
  review_note: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      product_categories: {
        Row: ProductCategoryRow;
        Insert: { id?: string; name: string; created_at?: string };
        Update: { name?: string };
        Relationships: [];
      };
      products: {
        Row: ProductRow;
        Insert: ProductInsert;
        Update: ProductUpdate;
        Relationships: [];
      };
      redemption_requests: {
        Row: RedemptionRequestRow;
        Insert: RedemptionRequestInsert;
        Update: RedemptionRequestUpdate;
        Relationships: [];
      };
      point_transactions: {
        Row: PointTransactionRow;
        Insert: PointTransactionInsert;
        Update: Partial<PointTransactionInsert>;
        Relationships: [];
      };
      order_point_requests: {
        Row: OrderPointRequestRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
        update_order_point_request: { Args: { p_request_id: string; p_order_number: string }; Returns: OrderPointRequestRow[] };
        review_current_order_point_request: { Args: { p_request_id: string; p_approve: boolean; p_points: number | null; p_note: string; p_expected_order_number: string }; Returns: OrderPointRequestRow[] };
      list_admin_customers: { Args: Record<string, never>; Returns: CustomerSummary[] };
      list_admin_customer_transactions: { Args: { p_customer_id: string }; Returns: PointTransactionRow[] };
      adjust_customer_points: { Args: { p_customer_id: string; p_type: string; p_points: number; p_note: string; p_operation_id: string }; Returns: PointTransactionRow };
      submit_order_point_request: {
        Args: { p_order_number: string };
        Returns: OrderPointRequestRow[];
      };
      review_order_point_request: {
        Args: { p_request_id: string; p_approve: boolean; p_points: number | null; p_note: string };
        Returns: OrderPointRequestRow[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type CustomerSummary = { id: string; username: string; email: string; created_at: string | null; balance: number; total_credit: number; total_debit: number };
