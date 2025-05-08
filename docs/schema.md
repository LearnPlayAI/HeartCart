# TeeMeYou Database Schema Documentation

This document provides comprehensive documentation for the database schema used in the TeeMeYou e-commerce platform.

## Overview

The TeeMeYou database follows a hierarchical structure with the following main entities:

1. **Users and Authentication**: User accounts and authentication information
2. **Product Organization**: Suppliers, catalogs, categories
3. **Products**: Core product information
4. **Attribute System**: Hierarchical attribute system for products
5. **Cart and Orders**: Shopping cart and order processing
6. **Images and Files**: Product image management
7. **AI Features**: AI-powered recommendations and settings

## Tables and Relationships

### User Management

#### `users` Table

Stores user account information and authentication details.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique identifier |
| username | TEXT | NOT NULL, UNIQUE | User's login name |
| password | TEXT | NOT NULL | Hashed password |
| email | TEXT | NOT NULL, UNIQUE | User's email address |
| fullName | TEXT | | User's full name |
| profilePicture | TEXT | | URL to profile picture |
| phoneNumber | TEXT | | Contact phone number |
| address | TEXT | | Shipping address |
| city | TEXT | | City |
| postalCode | TEXT | | Postal code |
| country | TEXT | DEFAULT 'South Africa' | Country |
| isActive | BOOLEAN | NOT NULL, DEFAULT true | Whether account is active |
| role | TEXT | NOT NULL, DEFAULT 'user' | User role ('user', 'admin') |
| createdAt | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Account creation timestamp |
| updatedAt | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Last update timestamp |
| lastLogin | TIMESTAMP WITH TIME ZONE | | Last login timestamp |

### Product Organization

#### `suppliers` Table

Stores information about product suppliers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique identifier |
| name | VARCHAR(255) | NOT NULL | Supplier name |
| contactName | VARCHAR(255) | | Contact person name |
| email | VARCHAR(255) | | Contact email |
| phone | VARCHAR(50) | | Contact phone |
| address | TEXT | | Physical address |
| city | VARCHAR(100) | | City |
| country | VARCHAR(100) | DEFAULT 'South Africa' | Country |
| notes | TEXT | | Additional information |
| logo | TEXT | | Logo image URL |
| website | VARCHAR(255) | | Supplier website |
| isActive | BOOLEAN | NOT NULL, DEFAULT true | Whether supplier is active |
| createdAt | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updatedAt | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Last update timestamp |

#### `catalogs` Table

Organizes products into supplier-specific collections.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique identifier |
| name | VARCHAR(255) | NOT NULL | Catalog name |
| description | TEXT | | Catalog description |
| supplierId | INTEGER | REFERENCES suppliers(id) | Associated supplier |
| defaultMarkupPercentage | INTEGER | DEFAULT 50 | Default markup % for products |
| isActive | BOOLEAN | NOT NULL, DEFAULT true | Whether catalog is active |
| coverImage | TEXT | | Cover image URL |
| tags | TEXT[] | | Array of tags |
| startDate | TIMESTAMP WITH TIME ZONE | | Catalog start date |
| endDate | TIMESTAMP WITH TIME ZONE | | Catalog end date |
| createdAt | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updatedAt | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Last update timestamp |

#### `categories` Table

Organizes products into categories with hierarchical structure.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique identifier |
| name | TEXT | NOT NULL, UNIQUE | Category name |
| slug | TEXT | NOT NULL, UNIQUE | URL-friendly name |
| description | TEXT | | Category description |
| icon | TEXT | | Icon image URL |
| imageUrl | TEXT | | Category image URL |
| isActive | BOOLEAN | NOT NULL, DEFAULT true | Whether category is active |
| parentId | INTEGER | | Parent category ID (self-referential) |
| level | INTEGER | NOT NULL, DEFAULT 0 | Depth in category tree (0 for root) |
| displayOrder | INTEGER | NOT NULL, DEFAULT 0 | Order for display |

**Relationships:**
- Self-referential relationship via `parentId` to create a category hierarchy
- Parent categories (level 0) can have multiple child categories (level 1+)

### Products

#### `products` Table

Stores core product information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique identifier |
| name | TEXT | NOT NULL | Product name |
| slug | TEXT | NOT NULL, UNIQUE | URL-friendly name |
| description | TEXT | | Product description |
| categoryId | INTEGER | REFERENCES categories(id) | Associated category |
| catalogId | INTEGER | REFERENCES catalogs(id) | Associated catalog |
| price | DOUBLE PRECISION | NOT NULL | Selling price |
| costPrice | DOUBLE PRECISION | NOT NULL | Cost from supplier |
| salePrice | DOUBLE PRECISION | | Discounted price if on sale |
| discount | INTEGER | | Discount percentage |
| imageUrl | TEXT | | Main product image URL |
| additionalImages | TEXT[] | | Array of additional image URLs |
| rating | DOUBLE PRECISION | DEFAULT 0 | Average customer rating |
| reviewCount | INTEGER | DEFAULT 0 | Number of reviews |
| isActive | BOOLEAN | NOT NULL, DEFAULT true | Whether product is active |
| isFeatured | BOOLEAN | NOT NULL, DEFAULT false | Whether product is featured |
| isFlashDeal | BOOLEAN | NOT NULL, DEFAULT false | Whether product has a time-limited deal |
| flashDealEnd | TIMESTAMP WITH TIME ZONE | | When flash deal expires |
| soldCount | INTEGER | DEFAULT 0 | Number of units sold |
| supplier | TEXT | | Supplier information |
| freeShipping | BOOLEAN | DEFAULT false | Whether shipping is free |
| weight | DOUBLE PRECISION | | Product weight in kg |
| dimensions | TEXT | | Product dimensions (LxWxH in cm) |
| brand | TEXT | | Product brand name |
| tags | TEXT[] | | Array of product tags |
| displayOrder | INTEGER | DEFAULT 999 | Order for display |
| hasBackgroundRemoved | BOOLEAN | DEFAULT false | Whether image has removed background |
| originalImageObjectKey | TEXT | | Key for original image in object storage |
| createdAt | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Creation timestamp |

#### `productImages` Table

Stores detailed product image information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique identifier |
| productId | INTEGER | REFERENCES products(id) | Associated product |
| url | TEXT | NOT NULL | Image URL |
| objectKey | TEXT | | Key in object storage |
| isMain | BOOLEAN | DEFAULT false | Whether it's the main product image |
| hasBgRemoved | BOOLEAN | DEFAULT false | Whether background is removed |
| bgRemovedUrl | TEXT | | URL to version with removed background |
| bgRemovedObjectKey | TEXT | | Storage key for background-removed version |
| sortOrder | INTEGER | DEFAULT 0 | Order for display |
| createdAt | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Creation timestamp |

### Attribute System

The attribute system follows a hierarchical structure that allows inheritance across different levels:

1. **Base Attributes**: Core attribute definitions (`attributes` table)
2. **Catalog Level**: Attributes and options at the catalog level
3. **Category Level**: Attributes and options at the category level
4. **Product Level**: Attributes and options at the individual product level
5. **Product Attribute Values**: Actual values assigned to products

#### `attributes` Table (Base Attributes)

Core attribute definitions that can be used at any level.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique identifier |
| name | VARCHAR(100) | NOT NULL, UNIQUE | System name (code) |
| displayName | VARCHAR(100) | NOT NULL | User-friendly name |
| description | TEXT | | Attribute description |
| attributeType | VARCHAR(50) | NOT NULL | Type ('select', 'radio', 'color', 'text', etc.) |
| validationRules | JSONB | | JSON with validation settings |
| isRequired | BOOLEAN | DEFAULT false | Whether attribute is required |
| isFilterable | BOOLEAN | DEFAULT false | Whether attribute can be used for filtering |
| isComparable | BOOLEAN | DEFAULT false | Whether attribute can be used in comparisons |
| isSwatch | BOOLEAN | DEFAULT false | Whether displayed as a swatch (color/texture) |
| displayInProductSummary | BOOLEAN | DEFAULT false | Whether shown in product summaries |
| sortOrder | INTEGER | DEFAULT 0 | Order for display |
| createdAt | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updatedAt | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Last update timestamp |

#### `attributeOptions` Table (Base Options)

Predefined options for select/radio/color-type attributes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique identifier |
| attributeId | INTEGER | NOT NULL, REFERENCES attributes(id) | Associated attribute |
| value | VARCHAR(255) | NOT NULL | Option value (code) |
| displayValue | VARCHAR(255) | NOT NULL | User-friendly display value |
| metadata | JSONB | | Additional data (color hex, etc.) |
| sortOrder | INTEGER | DEFAULT 0 | Order for display |
| createdAt | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updatedAt | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Unique Constraint**: `attributeId + value` must be unique

#### Catalog, Category, and Product Level Attributes

The attribute system includes tables for each level in the hierarchy:

- `catalogAttributes`: Attributes at the catalog level
- `catalogAttributeOptions`: Options for catalog-level attributes
- `categoryAttributes`: Attributes at the category level
- `categoryAttributeOptions`: Options for category-level attributes
- `productAttributes`: Attributes at the product level
- `productAttributeOptions`: Options for product-level attributes

Each level can inherit from and override parent levels.

#### `productAttributeValues` Table

Actual attribute values assigned to specific products.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique identifier |
| productId | INTEGER | NOT NULL, REFERENCES products(id) | Associated product |
| attributeId | INTEGER | NOT NULL, REFERENCES attributes(id) | Associated attribute |
| optionId | INTEGER | REFERENCES attributeOptions(id) | Selected option (for select types) |
| textValue | TEXT | | Text value (for text/textarea types) |
| numericValue | DOUBLE PRECISION | | Numeric value (for number types) |
| dateValue | TIMESTAMP WITH TIME ZONE | | Date value (for date types) |
| isMultiValue | BOOLEAN | DEFAULT false | Whether multiple values are allowed |
| sortOrder | INTEGER | DEFAULT 0 | Order for display |
| priceAdjustment | TEXT | | Price adjustment for this attribute value |
| createdAt | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updatedAt | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Last update timestamp |

### Cart and Orders

#### `cartItems` Table

Stores items in user shopping carts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique identifier |
| userId | INTEGER | REFERENCES users(id) | Associated user |
| productId | INTEGER | REFERENCES products(id) | Associated product |
| quantity | INTEGER | NOT NULL, DEFAULT 1 | Item quantity |
| combinationHash | TEXT | | Hash of selected attribute combination |
| combinationId | INTEGER | | Reference to combination (legacy) |
| selectedAttributes | JSONB | DEFAULT {} | Selected product attribute values |
| priceAdjustment | DOUBLE PRECISION | DEFAULT 0 | Price adjustment based on attributes |
| discountData | JSONB | | Discount information |
| totalDiscount | DOUBLE PRECISION | DEFAULT 0 | Total discount amount |
| itemPrice | DOUBLE PRECISION | | Price per item |
| createdAt | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Creation timestamp |

#### `orders` Table

Stores customer orders.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique identifier |
| userId | INTEGER | REFERENCES users(id) | Associated user |
| status | TEXT | NOT NULL, DEFAULT 'pending' | Order status |
| totalAmount | DOUBLE PRECISION | NOT NULL | Total order amount |
| shippingAddress | TEXT | NOT NULL | Delivery address |
| shippingMethod | TEXT | | Shipping method |
| paymentMethod | TEXT | | Payment method |
| createdAt | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Creation timestamp |

#### `orderItems` Table

Stores individual items within orders.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique identifier |
| orderId | INTEGER | REFERENCES orders(id) | Associated order |
| productId | INTEGER | REFERENCES products(id) | Associated product |
| quantity | INTEGER | NOT NULL | Item quantity |
| price | DOUBLE PRECISION | NOT NULL | Price per item |
| combinationHash | TEXT | | Hash of selected attribute combination |
| combinationId | INTEGER | | Reference to combination (legacy) |
| selectedAttributes | JSONB | DEFAULT {} | Selected product attribute values |
| priceAdjustment | DOUBLE PRECISION | DEFAULT 0 | Price adjustment based on attributes |

### AI Features

#### `aiRecommendations` Table

Stores AI-generated product recommendations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique identifier |
| userId | INTEGER | REFERENCES users(id) | Associated user |
| productIds | INTEGER[] | | Array of recommended product IDs |
| reason | TEXT | | Explanation for recommendations |
| aiResponse | JSONB | | Full response from AI service |
| createdAt | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Creation timestamp |

#### `aiSettings` Table

Stores configuration settings for AI functionality.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique identifier |
| settingName | TEXT | NOT NULL, UNIQUE | Setting identifier |
| settingValue | TEXT | NOT NULL | Setting value |
| description | TEXT | | Setting description |
| createdAt | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updatedAt | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Last update timestamp |

#### `pricing` Table

Stores pricing settings for category-specific markup.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique identifier |
| categoryId | INTEGER | REFERENCES categories(id), UNIQUE | Associated category |
| markupPercentage | INTEGER | NOT NULL, DEFAULT 50 | Markup percentage |
| description | TEXT | | Description of pricing rule |
| createdAt | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updatedAt | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Last update timestamp |

### Other Tables

#### `attributeDiscountRules` Table

Defines discount rules based on attribute combinations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique identifier |
| name | VARCHAR(255) | NOT NULL | Rule name |
| description | TEXT | | Rule description |
| attributeRules | JSONB | NOT NULL | JSON defining the attribute conditions |
| discountType | VARCHAR(50) | NOT NULL | Type ('percentage', 'fixed') |
| discountValue | DOUBLE PRECISION | NOT NULL | Amount of discount |
| isActive | BOOLEAN | DEFAULT true | Whether rule is active |
| priority | INTEGER | DEFAULT 0 | Priority when multiple rules match |
| startDate | TIMESTAMP WITH TIME ZONE | | When rule becomes active |
| endDate | TIMESTAMP WITH TIME ZONE | | When rule expires |
| createdAt | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updatedAt | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Last update timestamp |

## Entity Relationships

### Product Organization Hierarchy

```
Suppliers (1) ──── (n) Catalogs (1) ──── (n) Products
                                │
Categories (1) ─────────────────┘
     │
     └── (n) Child Categories
```

### Attribute System Hierarchy

```
Base Attributes (1) ──── (n) Attribute Options
     │
     ├── (n) Catalog Attributes (1) ──── (n) Catalog Attribute Options
     │
     ├── (n) Category Attributes (1) ──── (n) Category Attribute Options
     │
     └── (n) Product Attributes (1) ──── (n) Product Attribute Options
                   │
                   └── (n) Product Attribute Values
```

### Shopping Flow

```
Products (1) ──── (n) Cart Items (n) ──── (1) Users
     │
     └── (n) Order Items (n) ──── (1) Orders (n) ──── (1) Users
```

## Timestamp Management

All timestamp columns in the database use PostgreSQL's `TIMESTAMP WITH TIME ZONE` type and store dates in the SAST (South African Standard Time, UTC+2) timezone.

## Best Practices

1. Always use the properly typed insert/update schemas from shared/schema.ts
2. Use the validation utilities in server/schema-validator.ts to validate data
3. Always handle partial updates with proper null/undefined checking
4. Use the type guards from shared/type-guards.ts for safe type narrowing