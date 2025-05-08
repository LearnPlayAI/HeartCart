# TeeMeYou Type Definitions Reference

This document provides a comprehensive reference for the type definitions used throughout the TeeMeYou application.

## Table of Contents

1. [Core Entity Types](#core-entity-types)
2. [Input Types](#input-types)
3. [Utility Types](#utility-types)
4. [Type Guards](#type-guards)
5. [Best Practices](#best-practices)

## Core Entity Types

### User-Related Types

```typescript
// User entity returned from database queries
export type User = typeof users.$inferSelect;

// Data required to create a new user
export type InsertUser = z.infer<typeof insertUserSchema>;
```

### Product-Related Types

```typescript
// Product entity returned from database queries
export type Product = typeof products.$inferSelect;

// Data required to create a new product
export type InsertProduct = z.infer<typeof insertProductSchema>;

// Product image entity
export type ProductImage = typeof productImages.$inferSelect;

// Data required to create a product image
export type InsertProductImage = z.infer<typeof insertProductImageSchema>;
```

### Category-Related Types

```typescript
// Category entity returned from database queries
export type Category = typeof categories.$inferSelect;

// Data required to create a new category
export type InsertCategory = z.infer<typeof insertCategorySchema>;
```

### Supplier and Catalog Types

```typescript
// Supplier entity returned from database queries
export type Supplier = typeof suppliers.$inferSelect;

// Data required to create a new supplier
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

// Catalog entity returned from database queries
export type Catalog = typeof catalogs.$inferSelect;

// Data required to create a new catalog
export type InsertCatalog = z.infer<typeof insertCatalogSchema>;
```

### Cart and Order Types

```typescript
// Cart item entity returned from database queries
export type CartItem = typeof cartItems.$inferSelect;

// Data required to create a new cart item
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;

// Order entity returned from database queries
export type Order = typeof orders.$inferSelect;

// Data required to create a new order
export type InsertOrder = z.infer<typeof insertOrderSchema>;

// Order item entity returned from database queries
export type OrderItem = typeof orderItems.$inferSelect;

// Data required to create a new order item
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
```

### Attribute System Types

```typescript
// Base attribute entity
export type Attribute = typeof attributes.$inferSelect;

// Base attribute option entity
export type AttributeOption = typeof attributeOptions.$inferSelect;

// Catalog-level attribute entity
export type CatalogAttribute = typeof catalogAttributes.$inferSelect;

// Catalog-level attribute option entity
export type CatalogAttributeOption = typeof catalogAttributeOptions.$inferSelect;

// Category-level attribute entity
export type CategoryAttribute = typeof categoryAttributes.$inferSelect;

// Category-level attribute option entity
export type CategoryAttributeOption = typeof categoryAttributeOptions.$inferSelect;

// Product-level attribute entity
export type ProductAttribute = typeof productAttributes.$inferSelect;

// Product-level attribute option entity
export type ProductAttributeOption = typeof productAttributeOptions.$inferSelect;

// Product attribute value entity
export type ProductAttributeValue = typeof productAttributeValues.$inferSelect;
```

### AI and Settings Types

```typescript
// AI recommendation entity
export type AiRecommendation = typeof aiRecommendations.$inferSelect;

// AI setting entity
export type AiSetting = typeof aiSettings.$inferSelect;

// Pricing setting entity
export type Pricing = typeof pricing.$inferSelect;
```

## Input Types

All input types are derived from their corresponding entity types using Zod schemas, with auto-generated fields omitted:

```typescript
// Example: Creating a user
const newUser: InsertUser = {
  username: 'johndoe',
  password: 'hashedpassword123',
  email: 'john@example.com',
  fullName: 'John Doe'
};

// Example: Creating a product
const newProduct: InsertProduct = {
  name: 'Example Product',
  slug: 'example-product',
  categoryId: 1,
  catalogId: 2,
  price: 199.99,
  costPrice: 100.00
};
```

## Utility Types

### Nullable Type

Makes all properties in a type potentially null or undefined:

```typescript
type NullableUser = Nullable<User>;
// All properties are now potentially null/undefined
```

### Required Type

Makes all properties in a type required (non-nullable):

```typescript
type RequiredProduct = Required<Product>;
// All properties are now required
```

### Result Type

Represents a polymorphic result that can be either successful or failed:

```typescript
// Success result
const successResult: Result<User> = success({ id: 1, username: 'johndoe', ...});

// Error result
const errorResult: Result<User> = failure(new Error('User not found'));

// Using the result
if (result.success) {
  // Access result.data
} else {
  // Handle result.error
}
```

### AsyncStatus Type

Represents an async operation with various states:

```typescript
type UserFetchStatus = AsyncStatus<User>;

// Possible states:
const idle: UserFetchStatus = { status: 'idle' };
const loading: UserFetchStatus = { status: 'loading' };
const success: UserFetchStatus = { status: 'success', data: user };
const error: UserFetchStatus = { status: 'error', error: new Error('Failed to fetch') };
```

## Type Guards

Type guards are utility functions that help narrow types in TypeScript:

```typescript
// Check if a value is defined (not null or undefined)
if (isDefined(user)) {
  // user is guaranteed to be non-null and non-undefined here
}

// Check if a value is a specific type
if (isString(value)) {
  // value is guaranteed to be a string here
}

// Ensure a value is defined or throw an error
const definitelyUser = ensureDefined(possiblyNullUser, 'User must be defined');

// Assert a type or throw an error
assertType(value, isNumber, 'Value must be a number');
```

## Best Practices

1. **Always use type guards for nullable values:**
   ```typescript
   // Bad
   const username = user?.username || 'Guest';
   
   // Good
   const username = isDefined(user) ? user.username : 'Guest';
   ```

2. **Prefer Result types for functions that can fail:**
   ```typescript
   // Instead of throwing errors
   function getUserById(id: number): Result<User> {
     const user = getUser(id);
     return user ? success(user) : failure(new Error('User not found'));
   }
   ```

3. **Use AsyncStatus for loading states:**
   ```typescript
   const [userStatus, setUserStatus] = useState<AsyncStatus<User>>({ status: 'idle' });
   
   // Update status during fetch lifecycle
   setUserStatus({ status: 'loading' });
   try {
     const data = await fetchUser(id);
     setUserStatus({ status: 'success', data });
   } catch (error) {
     setUserStatus({ status: 'error', error });
   }
   ```

4. **Explicitly cast unknown types:**
   ```typescript
   // When receiving data from external sources
   const data = await response.json();
   
   // Bad
   const user = data as User;
   
   // Good
   const user = safeCast(data, isUserData) || fallbackUser;
   ```

5. **Use withDefault for safe default values:**
   ```typescript
   const displayName = withDefault(user?.displayName, 'Anonymous');
   ```