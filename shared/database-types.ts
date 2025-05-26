// Database-centric type definitions matching actual database schema (snake_case)

export interface Supplier {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  contact_name: string | null;
  address: string | null;
  notes: string | null;
  website: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface Catalog {
  id: number;
  name: string;
  description: string | null;
  supplier_id: number | null;
  is_active: boolean;
  default_markup_percentage: number;
  free_shipping: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  tags: string[] | null;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  slug: string;
  parent_id: number | null;
  is_active: boolean;
  sort_order: number;
  image_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  description: string | null;
  brand: string | null;
  category_id: number | null;
  supplier_id: number | null;
  catalog_id: number | null;
  is_active: boolean;
  is_featured: boolean;
  cost_price: number;
  regular_price: number;
  sale_price: number | null;
  on_sale: boolean;
  markup_percentage: number;
  image_urls: string[] | null;
  image_object_keys: string[] | null;
  main_image_index: number;
  stock_level: number;
  low_stock_threshold: number;
  backorder_enabled: boolean;
  weight: number | null;
  dimensions: string | null;
  discount_label: string | null;
  special_sale_text: string | null;
  special_sale_start: string | null;
  special_sale_end: string | null;
  is_flash_deal: boolean;
  flash_deal_end: string | null;
  taxable: boolean;
  tax_class: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  created_at: string | null;
  updated_at: string | null;
  wizard_progress: number;
  completed_steps: string[] | null;
  attributes: Record<string, any> | null;
}

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  is_admin: boolean;
  is_active: boolean;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CartItem {
  id: number;
  user_id: number;
  product_id: number;
  quantity: number;
  selected_attributes: Record<string, any> | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProductAttribute {
  id: number;
  name: string;
  type: string;
  required: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProductAttributeOption {
  id: number;
  attribute_id: number;
  value: string;
  display_value: string;
  metadata: Record<string, any> | null;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProductDraft {
  id: number;
  original_product_id: number | null;
  draft_status: string;
  created_by: number;
  created_at: string | null;
  last_modified: string | null;
  name: string;
  slug: string;
  sku: string | null;
  description: string | null;
  brand: string | null;
  category_id: number | null;
  is_active: boolean;
  is_featured: boolean;
  cost_price: number;
  regular_price: number;
  sale_price: number | null;
  on_sale: boolean;
  markup_percentage: number;
  image_urls: string[] | null;
  image_object_keys: string[] | null;
  main_image_index: number;
  stock_level: number;
  low_stock_threshold: number;
  backorder_enabled: boolean;
  attributes: Record<string, any> | null;
  supplier_id: number | null;
  weight: number | null;
  dimensions: string | null;
  discount_label: string | null;
  special_sale_text: string | null;
  special_sale_start: string | null;
  special_sale_end: string | null;
  is_flash_deal: boolean;
  flash_deal_end: string | null;
  taxable: boolean;
  tax_class: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  wizard_progress: number;
  completed_steps: string[] | null;
}

// Input types for creating/updating records
export interface CreateSupplierInput {
  name: string;
  email?: string;
  phone?: string;
  contact_name?: string;
  address?: string;
  notes?: string;
  website?: string;
  is_active?: boolean;
}

export interface CreateCatalogInput {
  name: string;
  description?: string;
  supplier_id?: number;
  is_active?: boolean;
  default_markup_percentage?: number;
  free_shipping?: boolean;
  start_date?: string;
  end_date?: string;
  tags?: string[];
}

export interface CreateProductInput {
  name: string;
  slug?: string;
  sku?: string;
  description?: string;
  brand?: string;
  category_id?: number;
  supplier_id?: number;
  catalog_id?: number;
  is_active?: boolean;
  is_featured?: boolean;
  cost_price: number;
  regular_price: number;
  sale_price?: number;
  on_sale?: boolean;
  markup_percentage?: number;
  image_urls?: string[];
  image_object_keys?: string[];
  main_image_index?: number;
  stock_level?: number;
  low_stock_threshold?: number;
  backorder_enabled?: boolean;
  weight?: number;
  dimensions?: string;
  discount_label?: string;
  special_sale_text?: string;
  special_sale_start?: string;
  special_sale_end?: string;
  is_flash_deal?: boolean;
  flash_deal_end?: string;
  taxable?: boolean;
  tax_class?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  wizard_progress?: number;
  completed_steps?: string[];
  attributes?: Record<string, any>;
}