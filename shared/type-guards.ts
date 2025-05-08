/**
 * Shared type guard utilities for the TeeMeYou application
 * These utilities provide consistent null/undefined handling and type narrowing
 */

/**
 * Type guard to check if a value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard to check if a value is not defined (is null or undefined)
 */
export function isNotDefined<T>(value: T | null | undefined): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Type guard to check if a value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard to check if a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

/**
 * Type guard to check if a value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard to check if a value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Type guard to check if a value is an array
 */
export function isArray<T>(value: unknown): value is Array<T> {
  return Array.isArray(value);
}

/**
 * Type guard to check if a value is a non-empty array
 */
export function isNonEmptyArray<T>(value: unknown): value is Array<T> {
  return isArray(value) && value.length > 0;
}

/**
 * Type guard to check if a value is an object (not null, not an array)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard to check if a value is a Date
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Type guard to check if a value is a function
 */
export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

/**
 * Type guard to check if a value is a promise
 */
export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return isObject(value) && isFunction((value as any).then);
}

/**
 * Type guard that checks if all items in an array satisfy a predicate
 */
export function allItemsMatch<T>(
  array: unknown,
  predicate: (item: unknown) => item is T
): array is T[] {
  return isArray(array) && array.every(predicate);
}

/**
 * Type guard to check if a value is a record with specific key-value types
 */
export function isRecord<K extends string | number | symbol, V>(
  value: unknown,
  valueGuard: (val: unknown) => val is V
): value is Record<K, V> {
  if (!isObject(value)) return false;
  
  return Object.values(value).every(val => valueGuard(val));
}

/**
 * Safely cast a value to a specific type, returning undefined if the cast fails
 */
export function safeCast<T>(value: unknown, typeGuard: (val: unknown) => val is T): T | undefined {
  return typeGuard(value) ? value : undefined;
}

/**
 * Assert that a value is of a specific type, throwing an error if not
 */
export function assertType<T>(
  value: unknown,
  typeGuard: (val: unknown) => val is T,
  errorMessage = 'Type assertion failed'
): asserts value is T {
  if (!typeGuard(value)) {
    throw new Error(errorMessage);
  }
}

/**
 * Ensure a value is defined, throwing an error if undefined or null
 */
export function ensureDefined<T>(
  value: T | null | undefined,
  errorMessage = 'Value is undefined or null'
): T {
  if (value === undefined || value === null) {
    throw new Error(errorMessage);
  }
  return value;
}

/**
 * Convert a nullable value to a default value if null/undefined
 */
export function withDefault<T>(value: T | null | undefined, defaultValue: T): T {
  return isDefined(value) ? value : defaultValue;
}

/**
 * Type utility to make all properties in a type required (non-nullable)
 */
export type Required<T> = {
  [P in keyof T]-?: T[P];
};

/**
 * Type utility to make all properties in a type potentially undefined
 */
export type Nullable<T> = {
  [P in keyof T]: T[P] | null | undefined;
};

/**
 * Type utility for polymorphic result (success or error)
 */
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Create a success result
 */
export function success<T>(data: T): Result<T> {
  return { success: true, data };
}

/**
 * Create an error result
 */
export function failure<E = Error>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Type utility for discriminated union with status field
 */
export type AsyncStatus<T, E = Error> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E };