/**
 * Type definitions for the centralized attribute management system
 * Defines the structure of attributes and their options used in the product system
 */

import { attributes, attributeOptions, productAttributes } from "@shared/schema";

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
 * Based on the centralized attribute system
 */
export type Attribute = typeof attributes.$inferSelect;

/**
 * Interface for attribute options (e.g., "Red", "Blue", "Green" for color attribute)
 * Based on the centralized attribute system
 */
export type AttributeOption = typeof attributeOptions.$inferSelect;

/**
 * Interface for product-specific attribute data
 * Based on the centralized attribute system
 */
export type ProductAttribute = typeof productAttributes.$inferSelect;

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
  isSwatch?: boolean | null;
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