/**
 * TypeScript Type Guards for TeeMeYou
 * 
 * This file contains type guard functions that help with runtime type checking
 * and type narrowing to improve type safety throughout the application.
 * 
 * Type guards perform runtime checks that narrow TypeScript types for improved
 * type safety and help prevent runtime errors caused by unexpected types.
 */

/**
 * Check if a value is defined (not null or undefined)
 * 
 * @example
 * const value: string | null | undefined = getValueFromSomewhere();
 * if (isDefined(value)) {
 *   // TypeScript knows value is string here
 *   console.log(value.length); // Safe
 * }
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Check if a value is null
 */
export function isNull(value: unknown): value is null {
  return value === null;
}

/**
 * Check if a value is undefined
 */
export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

/**
 * Check if a value is a non-empty string
 * 
 * @example
 * const value: unknown = getValueFromSomewhere();
 * if (isNonEmptyString(value)) {
 *   // TypeScript knows value is string here
 *   console.log(value.toUpperCase()); // Safe
 * }
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if a value is a valid number (not NaN or Infinity)
 * 
 * @example
 * const value: unknown = getValueFromSomewhere();
 * if (isValidNumber(value)) {
 *   // TypeScript knows value is number here
 *   console.log(value.toFixed(2)); // Safe
 * }
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Check if a value is a valid integer
 */
export function isInteger(value: unknown): value is number {
  return isValidNumber(value) && Number.isInteger(value);
}

/**
 * Check if a value is a valid positive number
 */
export function isPositiveNumber(value: unknown): value is number {
  return isValidNumber(value) && value > 0;
}

/**
 * Check if a value is a valid non-negative number (zero or positive)
 */
export function isNonNegativeNumber(value: unknown): value is number {
  return isValidNumber(value) && value >= 0;
}

/**
 * Check if a value is a valid date object (not invalid date)
 * 
 * @example
 * const value: unknown = getValueFromSomewhere();
 * if (isValidDate(value)) {
 *   // TypeScript knows value is Date here
 *   console.log(value.toISOString()); // Safe
 * }
 */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Check if a value is a plain object (not array, null, etc.)
 * 
 * @example
 * const value: unknown = getValueFromSomewhere();
 * if (isPlainObject(value)) {
 *   // TypeScript knows value is Record<string, unknown> here
 *   const keys = Object.keys(value); // Safe
 * }
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if a value is a non-empty array
 * 
 * @example
 * const value: unknown = getValueFromSomewhere();
 * if (isNonEmptyArray(value)) {
 *   // TypeScript knows value is unknown[] here
 *   console.log(value.length); // Safe
 * }
 */
export function isNonEmptyArray<T>(value: unknown): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Check if a value is a valid array of a specific type
 * 
 * @example
 * const value: unknown = getValueFromSomewhere();
 * if (isArrayOf(value, isNonEmptyString)) {
 *   // TypeScript knows value is string[] here
 *   const upperCaseValues = value.map(v => v.toUpperCase()); // Safe
 * }
 */
export function isArrayOf<T>(
  value: unknown,
  itemGuard: (item: unknown) => item is T
): value is T[] {
  return Array.isArray(value) && value.every(item => itemGuard(item));
}

/**
 * Check if a value has a specific property
 * 
 * @example
 * const value: unknown = getValueFromSomewhere();
 * if (hasProperty(value, 'id')) {
 *   // TypeScript knows value has an 'id' property
 *   console.log(value.id); // Safe
 * }
 */
export function hasProperty<K extends string>(
  value: unknown,
  property: K
): value is { [P in K]: unknown } {
  return isPlainObject(value) && property in value;
}

/**
 * Check if an object has all required properties
 * 
 * @example
 * const value: unknown = getValueFromSomewhere();
 * if (hasProperties(value, ['id', 'name'])) {
 *   // TypeScript knows value has both 'id' and 'name' properties
 *   console.log(value.id, value.name); // Safe
 * }
 */
export function hasProperties<K extends string>(
  value: unknown,
  properties: K[]
): value is { [P in K]: unknown } {
  if (!isPlainObject(value)) return false;
  return properties.every(prop => prop in value);
}

/**
 * Type guard for checking if a value matches a record structure
 * with specific property types
 * 
 * @example
 * interface User { id: number; name: string; }
 * const isUser = makeTypeGuard<User>({
 *   id: isValidNumber,
 *   name: isNonEmptyString
 * });
 * 
 * const value: unknown = getValueFromSomewhere();
 * if (isUser(value)) {
 *   // TypeScript knows value is User here
 *   console.log(value.id, value.name); // Safe
 * }
 */
export function makeTypeGuard<T extends Record<string, unknown>>(
  propertyGuards: {
    [K in keyof T]: (value: unknown) => boolean;
  }
) {
  return (value: unknown): value is T => {
    if (!isPlainObject(value)) return false;
    
    for (const key in propertyGuards) {
      if (!hasProperty(value, key)) return false;
      if (!propertyGuards[key](value[key])) return false;
    }
    
    return true;
  };
}

/**
 * Data Model Type Guards
 */

// Import types from schema
import {
  User,
  Product,
  Category,
  CartItem,
  Order,
  Attribute,
  Supplier,
  Catalog
} from './schema';

/**
 * Type guard for User objects
 */
export const isUser = makeTypeGuard<User>({
  id: isInteger,
  username: isNonEmptyString,
  email: isNonEmptyString,
  isActive: (v): v is boolean => typeof v === 'boolean',
  role: isNonEmptyString,
  createdAt: isValidDate,
  updatedAt: isValidDate
});

/**
 * Type guard for Product objects
 */
export const isProduct = makeTypeGuard<Product>({
  id: isInteger,
  name: isNonEmptyString,
  slug: isNonEmptyString,
  price: isValidNumber,
  isActive: (v): v is boolean => typeof v === 'boolean',
  createdAt: isValidDate
});

/**
 * Type guard for Category objects
 */
export const isCategory = makeTypeGuard<Category>({
  id: isInteger,
  name: isNonEmptyString,
  slug: isNonEmptyString,
  isActive: (v): v is boolean => typeof v === 'boolean', 
  level: isNonNegativeNumber,
  displayOrder: isInteger
});

/**
 * Type guard for CartItem objects
 */
export const isCartItem = makeTypeGuard<CartItem>({
  id: isInteger,
  productId: isInteger,
  quantity: isPositiveNumber,
  createdAt: isValidDate
});

/**
 * Type guard for Order objects
 */
export const isOrder = makeTypeGuard<Order>({
  id: isInteger,
  userId: isInteger,
  status: isNonEmptyString,
  totalAmount: isValidNumber,
  createdAt: isValidDate
});

/**
 * Type guard for Attribute objects
 */
export const isAttribute = makeTypeGuard<Attribute>({
  id: isInteger,
  name: isNonEmptyString,
  displayName: isNonEmptyString,
  attributeType: isNonEmptyString,
  createdAt: isValidDate,
  updatedAt: isValidDate
});

/**
 * Type guard for Supplier objects
 */
export const isSupplier = makeTypeGuard<Supplier>({
  id: isInteger,
  name: isNonEmptyString,
  isActive: (v): v is boolean => typeof v === 'boolean',
  createdAt: isValidDate,
  updatedAt: isValidDate
});

/**
 * Type guard for Catalog objects
 */
export const isCatalog = makeTypeGuard<Catalog>({
  id: isInteger,
  name: isNonEmptyString,
  supplierId: isInteger,
  isActive: (v): v is boolean => typeof v === 'boolean',
  createdAt: isValidDate,
  updatedAt: isValidDate
});