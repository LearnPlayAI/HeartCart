# TeeMeYou Type Reference Documentation

This document provides comprehensive reference documentation for all TypeScript types and interfaces used throughout the TeeMeYou e-commerce platform.

## Overview

The TeeMeYou type system follows these core design principles:

1. **Explicit Type Declarations**: All types are explicitly defined in shared locations
2. **Consistent Naming**: Types follow a consistent naming convention
3. **Null Safety**: Strict null checking is enforced throughout the application
4. **Type Guards**: Helper functions verify type safety at runtime
5. **Separation of Concerns**: Clear distinction between model, view, and controller types

## Core Type Categories

### Database Models

Database model types define the structure of database tables and are located in `shared/schema.ts`. Each model has several associated types:

- **Base Type**: Represents the structure of a database table (e.g., `User`)
- **Insert Type**: Used for inserting new records (e.g., `InsertUser`)
- **Select Type**: Used when querying records (e.g., `SelectUser`)
- **Partial Types**: Used for updates (partial versions of the main types)

### API Request/Response Types

API request and response types define the structure of data exchanged between client and server:

- **Request Types**: Define the expected structure of API request bodies
- **Response Types**: Define the structure of API responses
- **Query Parameter Types**: Define URL query parameters

### UI Component Types

UI component types define the props and state for React components:

- **Props Types**: Define the props for React components
- **State Types**: Define component state structures
- **Context Types**: Define React context values

### Utility Types

Utility types provide additional type safety and helper functionality:

- **Type Guards**: Runtime type checking functions
- **Type Transformers**: Types that transform other types
- **Type Utilities**: Helper types for common patterns

## Key Type Definitions

### User & Authentication Types

```typescript
// Base User type (from schema.ts)
export type User = {
  id: number;
  username: string;
  password: string;
  email: string;
  fullName: string | null;
  profilePicture: string | null;
  phoneNumber: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  isActive: boolean;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date | null;
};

// Insert type for creating new users
export type InsertUser = Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'lastLogin'>;

// Authentication request types
export type LoginRequest = {
  username: string;
  password: string;
  rememberMe?: boolean;
};

export type RegisterRequest = {
  username: string;
  email: string;
  password: string;
  fullName?: string;
};

// Auth context type
export type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<User>;
  register: (data: RegisterRequest) => Promise<User>;
  logout: () => Promise<void>;
  error: string | null;
};
```

### Product Types

```typescript
// Base Product type (from schema.ts)
export type Product = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  categoryId: number;
  catalogId: number;
  price: number;
  costPrice: number;
  salePrice: number | null;
  discount: number | null;
  imageUrl: string | null;
  additionalImages: string[] | null;
  rating: number;
  reviewCount: number;
  isActive: boolean;
  isFeatured: boolean;
  isFlashDeal: boolean;
  flashDealEnd: Date | null;
  soldCount: number;
  supplier: string | null;
  freeShipping: boolean;
  weight: number | null;
  dimensions: string | null;
  brand: string | null;
  tags: string[] | null;
  displayOrder: number | null;
  hasBackgroundRemoved: boolean;
  originalImageObjectKey: string | null;
  createdAt: Date;
};

// Insert type for creating new products
export type InsertProduct = Omit<Product, 'id' | 'createdAt' | 'rating' | 'reviewCount' | 'soldCount'>;

// Product with related data (for detailed views)
export type ProductWithRelations = Product & {
  category: Category;
  catalog: Catalog;
  images: ProductImage[];
  attributes: ProductAttributeValue[];
};

// Product list query parameters
export type ProductQueryParams = {
  page?: number;
  limit?: number;
  categoryId?: number;
  search?: string;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'popular';
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  attributes?: Record<string, string[]>;
};
```

### Category Types

```typescript
// Base Category type (from schema.ts)
export type Category = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  imageUrl: string | null;
  isActive: boolean;
  parentId: number | null;
  level: number;
  displayOrder: number;
};

// Insert type for creating new categories
export type InsertCategory = Omit<Category, 'id'>;

// Category with children (for hierarchical display)
export type CategoryWithChildren = Category & {
  children: Category[];
};

// Category query parameters
export type CategoryQueryParams = {
  includeInactive?: boolean;
  parentId?: number | null;
  level?: number;
};
```

### Cart & Order Types

```typescript
// Base CartItem type (from schema.ts)
export type CartItem = {
  id: number;
  userId: number | null;
  productId: number;
  quantity: number;
  combinationHash: string | null;
  combinationId: number | null;
  selectedAttributes: Record<string, any> | null;
  priceAdjustment: number;
  discountData: Record<string, any> | null;
  totalDiscount: number;
  itemPrice: number | null;
  createdAt: Date;
};

// Insert type for creating cart items
export type InsertCartItem = Omit<CartItem, 'id' | 'createdAt'>;

// Cart item with product details
export type CartItemWithProduct = CartItem & {
  product: Product;
  total: number; // Calculated field: (itemPrice + priceAdjustment) * quantity - totalDiscount
};

// Complete cart (for display)
export type Cart = {
  items: CartItemWithProduct[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
};

// Order types
export type Order = {
  id: number;
  userId: number;
  status: string;
  totalAmount: number;
  shippingAddress: string;
  shippingMethod: string | null;
  paymentMethod: string | null;
  createdAt: Date;
};

export type InsertOrder = Omit<Order, 'id' | 'createdAt'>;

export type OrderItem = {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
  combinationHash: string | null;
  combinationId: number | null;
  selectedAttributes: Record<string, any> | null;
  priceAdjustment: number;
};

export type InsertOrderItem = Omit<OrderItem, 'id'>;

// Order with all details
export type OrderWithDetails = Order & {
  items: (OrderItem & { product: Product })[];
  user: User;
};
```

### Attribute System Types

```typescript
// Base Attribute type (from schema.ts)
export type Attribute = {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  attributeType: string;
  validationRules: Record<string, any> | null;
  isRequired: boolean;
  isFilterable: boolean;
  isComparable: boolean;
  isSwatch: boolean;
  displayInProductSummary: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertAttribute = Omit<Attribute, 'id' | 'createdAt' | 'updatedAt'>;

// Attribute option type
export type AttributeOption = {
  id: number;
  attributeId: number;
  value: string;
  displayValue: string;
  metadata: Record<string, any> | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertAttributeOption = Omit<AttributeOption, 'id' | 'createdAt' | 'updatedAt'>;

// Attribute values assigned to products
export type ProductAttributeValue = {
  id: number;
  productId: number;
  attributeId: number;
  optionId: number | null;
  textValue: string | null;
  numericValue: number | null;
  dateValue: Date | null;
  isMultiValue: boolean;
  sortOrder: number;
  priceAdjustment: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertProductAttributeValue = Omit<ProductAttributeValue, 'id' | 'createdAt' | 'updatedAt'>;

// Attribute with options (for display)
export type AttributeWithOptions = Attribute & {
  options: AttributeOption[];
};

// Attribute discount rule
export type AttributeDiscountRule = {
  id: number;
  name: string;
  description: string | null;
  attributeRules: Record<string, any>;
  discountType: string;
  discountValue: number;
  isActive: boolean;
  priority: number;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertAttributeDiscountRule = Omit<AttributeDiscountRule, 'id' | 'createdAt' | 'updatedAt'>;
```

### Supplier & Catalog Types

```typescript
// Base Supplier type (from schema.ts)
export type Supplier = {
  id: number;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string;
  notes: string | null;
  logo: string | null;
  website: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertSupplier = Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>;

// Catalog type
export type Catalog = {
  id: number;
  name: string;
  description: string | null;
  supplierId: number;
  defaultMarkupPercentage: number;
  isActive: boolean;
  coverImage: string | null;
  tags: string[] | null;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertCatalog = Omit<Catalog, 'id' | 'createdAt' | 'updatedAt'>;

// Catalog with supplier details
export type CatalogWithSupplier = Catalog & {
  supplier: Supplier;
};
```

### Image & File Types

```typescript
// Base ProductImage type (from schema.ts)
export type ProductImage = {
  id: number;
  productId: number;
  url: string;
  objectKey: string | null;
  isMain: boolean;
  hasBgRemoved: boolean;
  bgRemovedUrl: string | null;
  bgRemovedObjectKey: string | null;
  sortOrder: number;
  createdAt: Date;
};

export type InsertProductImage = Omit<ProductImage, 'id' | 'createdAt'>;

// File upload types
export type FileUploadResponse = {
  url: string;
  objectKey: string;
  filename: string;
  size: number;
  mimeType: string;
};

export type ImageProcessingResponse = FileUploadResponse & {
  width: number;
  height: number;
  hasBgRemoved?: boolean;
  bgRemovedUrl?: string;
  bgRemovedObjectKey?: string;
};
```

### AI Feature Types

```typescript
// AI recommendation type
export type AIRecommendation = {
  id: number;
  userId: number | null;
  productIds: number[];
  reason: string | null;
  aiResponse: Record<string, any> | null;
  createdAt: Date;
};

// AI settings type
export type AISetting = {
  id: number;
  settingName: string;
  settingValue: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// AI analysis results
export type ProductImageAnalysis = {
  tags: string[];
  suggestedCategory: string;
  colors: string[];
  brandSuggestion: string | null;
  description: string;
  confidence: number;
};

export type PriceSuggestion = {
  suggestedPrice: number;
  minPrice: number;
  maxPrice: number;
  competitivePrice: number;
  reasoning: string;
};
```

## Type Guards

Type guards are utility functions that perform runtime type checking. They are located in `shared/type-guards.ts`:

```typescript
// Check if a value is defined (not null or undefined)
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

// Check if a value is a non-empty string
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

// Check if a value is a valid number
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

// Check if a value is a valid date
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

// Check if a value is a plain object
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Type guard for User type
export function isUser(value: unknown): value is User {
  return (
    isPlainObject(value) &&
    isValidNumber((value as User).id) &&
    isNonEmptyString((value as User).username) &&
    isNonEmptyString((value as User).email)
  );
}

// Type guard for Product type
export function isProduct(value: unknown): value is Product {
  return (
    isPlainObject(value) &&
    isValidNumber((value as Product).id) &&
    isNonEmptyString((value as Product).name) &&
    isNonEmptyString((value as Product).slug)
  );
}

// Type guard for Category type
export function isCategory(value: unknown): value is Category {
  return (
    isPlainObject(value) &&
    isValidNumber((value as Category).id) &&
    isNonEmptyString((value as Category).name) &&
    isNonEmptyString((value as Category).slug)
  );
}
```

## Best Practices

1. **Always Use Type Annotations**: Explicitly annotate function parameters and return types
2. **Avoid Type Assertions**: Use type guards instead of type assertions (`as` keyword)
3. **Nullable Types**: Always handle null and undefined values explicitly
4. **Consistent Imports**: Import types from appropriate shared locations
5. **Interface vs Type**: Use `type` for types that don't need to be extended/implemented and `interface` for those that do
6. **Validate API Responses**: Use Zod schemas to validate API responses match expected types
7. **Document Type Constraints**: Add JSDoc comments to explain type constraints and usage patterns

## Common Pitfalls

1. **Missing Null Checks**: Forgetting to check if a value can be null/undefined
2. **Type Widening**: Allowing types to be broader than necessary
3. **Any Type**: Using `any` type instead of proper type definitions
4. **Property Access**: Accessing properties that might not exist
5. **Array Access**: Not checking array bounds before access
6. **Function Parameter Types**: Not constraining function parameter types properly
7. **Generic Type Parameters**: Not constraining generic type parameters

## Examples

### Example 1: Type-Safe API Request

```typescript
// Define the request type
type CreateProductRequest = {
  name: string;
  description?: string;
  categoryId: number;
  catalogId: number;
  price: number;
  costPrice: number;
};

// Define the API function with type safety
async function createProduct(data: CreateProductRequest): Promise<Product> {
  const response = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  return response.json();
}
```

### Example 2: Component with Props Types

```typescript
// Define props type
type ProductCardProps = {
  product: Product;
  showPrice: boolean;
  onAddToCart: (productId: number, quantity: number) => void;
};

// Use props type in component
function ProductCard({ product, showPrice, onAddToCart }: ProductCardProps) {
  // Implementation
}
```

### Example 3: Type Guards for Safety

```typescript
function displayProductDetails(data: unknown) {
  // Use type guard to ensure data is a product
  if (isProduct(data)) {
    // Now TypeScript knows data is a Product
    console.log(data.name);
    console.log(data.price);
  } else {
    console.error('Invalid product data');
  }
}
```