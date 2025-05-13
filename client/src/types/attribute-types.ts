/**
 * Type definitions for the attribute management system
 * Defines the structure of attributes and their options used in the product system
 */

/**
 * Supported attribute types in the system
 */
export const ATTRIBUTE_TYPES = [
  "text",       // Simple text values (e.g., Material: "Cotton", "Polyester")
  "number",     // Numeric values (e.g., Weight: 5, 10)
  "boolean",    // True/false values
  "color",      // Color values, typically with associated hex codes
  "size",       // Size values (e.g., "S", "M", "L")
  "date",       // Date values
  "select"      // Select from predefined options
] as const;

/**
 * Attribute interface defining a product attribute
 */
export interface Attribute {
  id: number;
  name: string;                     // Internal name (e.g., "color")
  displayName: string;              // Customer-facing name (e.g., "Color")
  description: string | null;       // Optional description
  attributeType: string;            // Type of attribute (from ATTRIBUTE_TYPES)
  isFilterable: boolean;            // Whether it can be used in product filters
  isComparable?: boolean;           // Whether it can be used in product comparisons
  isSwatch: boolean;                // Whether it displays as a swatch
  isRequired: boolean;              // Whether customer must select this during checkout
  isVariant: boolean;               // Whether it's used for product variants
  sortOrder?: number;               // Display order
  displayInProductSummary?: boolean; // Whether to show in product summary
  validationRules: string | null;   // JSON string with validation rules
  createdAt?: string;               // ISO date string
  updatedAt?: string;               // ISO date string
}

/**
 * Interface for attribute options (e.g., "Red", "Blue", "Green" for color attribute)
 */
export interface AttributeOption {
  id: number;
  attributeId: number;              // ID of the parent attribute
  value: string;                    // Internal value (e.g., "red")
  displayValue?: string;            // Customer-facing value (e.g., "Ruby Red")
  sortOrder?: number;               // Display order
  metadata?: Record<string, any> | null; // Additional data (e.g., hexCode for colors)
  createdAt?: string;               // ISO date string
  updatedAt?: string;               // ISO date string
}

/**
 * Interface for attribute groups (used for categorizing attributes)
 */
export interface AttributeGroup {
  id: number;
  name: string;                    // Internal name
  displayName: string;             // Display name
  description?: string | null;     // Optional description
  sortOrder?: number;              // Display order
  createdAt?: string;              // ISO date string
  updatedAt?: string;              // ISO date string
}

/**
 * Interface for category-specific attributes
 */
export interface CategoryAttribute {
  id: number;
  categoryId: number;              // ID of the category this attribute belongs to 
  attributeId: number;             // ID of the attribute
  isRequired: boolean;             // Whether it's required for this category
  sortOrder?: number;              // Display order within this category
  createdAt?: string;              // ISO date string
  updatedAt?: string;              // ISO date string
  attribute?: Attribute;           // Optional nested attribute data
}

/**
 * Interface for product-specific attribute values
 */
export interface ProductAttributeValue {
  id: number;
  productId: number;               // ID of the product
  attributeId: number;             // ID of the attribute
  attributeOptionId?: number | null; // ID of the selected option (if applicable)
  value?: string | null;           // Custom value (for non-option attributes)
  createdAt?: string;              // ISO date string
  updatedAt?: string;              // ISO date string
  attribute?: Attribute;           // Optional nested attribute data
  attributeOption?: AttributeOption; // Optional nested option data
}

/**
 * Interface for product-specific attribute metadata
 */
export interface ProductAttributeMeta {
  id: number;
  productId: number;
  attributeId: number;
  isVariant: boolean;              // Whether this is a variant-making attribute for this product
  isVisible: boolean;              // Whether this attribute is shown for this product
  isRequired: boolean;             // Whether this attribute is required for this product
  sortOrder?: number;              // Display order for this product
  createdAt?: string;              // ISO date string
  updatedAt?: string;              // ISO date string
}

/**
 * Type for simple selected attribute 
 * Used when adding items to cart
 */
export type SelectedAttribute = {
  name: string;
  attributeType: string;
  displayName: string;
  value: string;
  displayValue?: string;
  metadata?: Record<string, any>;
  sortOrder?: number;
  description?: string | null;
  isFilterable?: boolean | null;
  isRequired?: boolean | null;
  isComparable?: boolean | null;
  isSwatch?: boolean | null;
  isVariant?: boolean | null;
  displayInProductSummary?: boolean | null;
};

/**
 * Interface for attribute display preferences
 */
export interface AttributeDisplayPreference {
  attributeId: number;
  showInList: boolean;             // Show in product listing
  showInDetail: boolean;           // Show in product detail
  showInFilters: boolean;          // Show in filters
  showInComparison: boolean;       // Show in product comparison
  displayMode: 'text' | 'swatch' | 'icon'; // How to display the attribute
}