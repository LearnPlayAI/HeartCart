export const ATTRIBUTE_TYPES = [
  'text',
  'select',
  'multiselect',
  'boolean',
  'number',
  'date',
  'color',
  'size',
  'file',
  'image'
] as const;

export type AttributeType = typeof ATTRIBUTE_TYPES[number];

export interface Attribute {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  attributeType: AttributeType;
  isFilterable: boolean;
  isSwatch: boolean;
  isRequired: boolean;
  isVariant: boolean;
  validationRules: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttributeOption {
  id: number;
  attributeId: number;
  value: string;
  displayValue: string;
  sortOrder: number;
  metadata: Record<string, any> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CatalogAttribute {
  id: number;
  catalogId: number;
  attributeId: number;
  overrideDisplayName: string | null;
  isRequired: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
  attribute?: Attribute;
}

export interface CategoryAttribute {
  id: number;
  categoryId: number;
  attributeId: number;
  catalogAttributeId: number | null;
  overrideDisplayName: string | null;
  isRequired: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
  attribute?: Attribute;
  catalogAttribute?: CatalogAttribute;
}

export interface ProductAttribute {
  id: number;
  productId: number;
  attributeId: number;
  categoryAttributeId: number | null;
  overrideDisplayName: string | null;
  isRequired: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
  attribute?: Attribute;
  categoryAttribute?: CategoryAttribute;
}

export interface ProductAttributeValue {
  id: number;
  productId: number;
  attributeId: number;
  optionId: number | null;
  textValue: string | null;
  numberValue: number | null;
  dateValue: string | null;
  booleanValue: boolean | null;
  sortOrder: number;
  priceAdjustment: string | null;
  createdAt?: string;
  updatedAt?: string;
  attribute?: Attribute;
  option?: AttributeOption;
}

export interface CatalogAttributeOption {
  id: number;
  catalogAttributeId: number;
  value: string;
  displayValue: string;
  baseOptionId: number | null;
  sortOrder: number;
  metadata: Record<string, any> | null;
  createdAt?: string;
  updatedAt?: string;
  baseOption?: AttributeOption;
}

export interface CategoryAttributeOption {
  id: number;
  categoryAttributeId: number;
  value: string;
  displayValue: string;
  baseOptionId: number | null;
  catalogOptionId: number | null;
  sortOrder: number;
  metadata: Record<string, any> | null;
  createdAt?: string;
  updatedAt?: string;
  baseOption?: AttributeOption;
  catalogOption?: CatalogAttributeOption;
}

export interface ProductAttributeOption {
  id: number;
  productAttributeId: number;
  value: string;
  displayValue: string;
  baseOptionId: number | null;
  categoryOptionId: number | null;
  sortOrder: number;
  priceAdjustment: string | null;
  metadata: Record<string, any> | null;
  createdAt?: string;
  updatedAt?: string;
  baseOption?: AttributeOption;
  categoryOption?: CategoryAttributeOption;
}