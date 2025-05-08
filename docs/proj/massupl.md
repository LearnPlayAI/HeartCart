# Mass Product Upload System - Implementation Roadmap

## Introduction

This document outlines the implementation strategy for the TeeMeYou mass product upload feature, designed to streamline the process of adding multiple products, catalogs, and their associated assets simultaneously.

The mass upload system addresses a critical business need for TeeMeYou: enabling administrators to efficiently add large numbers of products to the platform. This capability is essential for scaling the marketplace, onboarding new suppliers, and keeping product catalogs up-to-date with minimal manual effort.

### Business Context

In the South African e-commerce landscape, suppliers often manage hundreds or thousands of products across multiple categories. The manual entry of these products would be prohibitively time-consuming and error-prone. The mass upload system bridges this gap by providing:

1. **Scalability** - Support for adding 100+ products in a single operation
2. **Standardization** - Consistent product data structure through templates
3. **Efficiency** - Reduced time and effort compared to manual entry
4. **Error Reduction** - Validation to ensure data quality and completeness
5. **Category Adaptability** - Support for different attribute sets based on product categories

### Key Stakeholders

- **Administrators** - Require full control over product data and catalogs
- **Technical Team** - Responsible for implementation and maintenance
- **End Users** - Benefit from comprehensive and accurate product information

## System Overview

The mass product upload system will allow administrators to:
1. Upload a CSV file with product data (NO images)
2. Automatically create catalogs and products with their attributes
3. Map dynamic attributes based on category requirements
4. Validate and process data with clear error reporting using standardized API responses
5. Associate products with their correct suppliers and catalogs

Note: Image handling is deliberately separated from the mass upload process. After products are created, administrators will use a dedicated image management interface to upload product images through the "Upload Images" button in the catalog products list.

### Standard API Approach

All API endpoints for the mass upload system will follow TeeMeYou's standardized API response structure:

```typescript
{
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}
```

This ensures consistent error handling, pagination support, and predictable response formats throughout the mass upload process.

## Implementation Phases

### Phase 1: Database and Data Model Setup
- [x] Create the database storage functions for multi-value attributes
  - [x] Design schema for products with multiple attribute values
  - [x] Create attribute value tables with foreign key relationships
  - [x] Implement transaction management for batch operations
  - [x] Design batch job tracking table for monitoring uploads
  - [x] Add catalog creation/update functions with attribute mapping

- [x] Set up validation schema for multi-attribute CSV data
  - [x] Define required field validations
  - [x] Create data type validators for comma-separated values
  - [x] Set up reference validations (category IDs, etc.)
  - [x] Create validation rules for attribute value lists
  - [x] Implement custom validators for special fields
  - [x] Create validation result formatting

### Phase 2: CSV Template and Processing
- [x] Define the catalog-centric CSV template structure
  - [x] Create unified template with core product fields for all product types
  - [x] Design dynamic attribute handling for multiple values per attribute
  - [x] Document field requirements and validations at catalog level
  - [x] Create sample CSV files demonstrating multiple attribute values
  - [x] Implement product category field to differentiate products

- [x] Implement CSV parsing functionality for multi-value attributes
  - [x] Create CSV stream processor for large files
  - [x] Implement header validation and mapping
  - [x] Build row data extraction with support for comma-separated attribute values
  - [x] Add support for various CSV formats and encodings
  - [x] Create parse error detection and recovery

- [x] Create validation rules for multi-value attribute fields
  - [x] Implement field presence validators
  - [x] Create data type and format validators for comma-separated lists
  - [x] Build reference validation for foreign keys
  - [x] Implement business rule validations for attribute combinations
  - [x] Add conditional validation rules based on product category

### Phase 3: Multi-Value Attribute Handling
- [x] Implement multi-value attribute parsing
  - [x] Create parser for comma-separated attribute value lists
  - [x] Build validation for multi-value attribute combinations
  - [x] Add support for empty attribute values where applicable
  - [x] Implement error handling for malformed value lists
  - [x] Create formatter for displaying multi-value attributes

- [x] Create dynamic attribute mapping from CSV columns
  - [x] Develop prefix-based attribute field detection
  - [x] Create parser for comma-separated attribute values
  - [x] Build mapping between CSV headers and attribute system
  - [x] Implement value transformation for different attribute types
  - [x] Add support for custom attribute naming

- [x] Implement multi-category attribute handling
  - [x] Create flexible attribute template system spanning all categories in a catalog
  - [x] Build validation rules that adapt based on product category
  - [x] Implement conditional attribute enforcement by product type
  - [x] Support cross-category attribute value lists
  - [x] Develop intelligent attribute detection based on catalog context

- [x] Create automatic attribute creation for new values
  - [x] Implement automatic attribute option creation from comma-separated lists
  - [x] Design intelligent attribute detection system
  - [x] Build attribute cleanup and normalization for value lists
  - [x] Add suggestion system for similar attributes
  - [x] Create attribute value standardization for consistent formatting

- [x] Develop validation rules for attribute constraints
  - [x] Implement data type validation for different attributes
  - [x] Create value range validations where applicable
  - [x] Build dropdown value validation for select attributes
  - [x] Implement interdependent attribute validation
  - [x] Add custom validation rule support

### Phase 4: UI Components for Upload and Preview
- [x] Design the upload interface UI components
  - [x] Create uploader component for CSV files
  - [x] Build real-time progress indicator components
  - [x] Design preview grid for validation results with multi-value attributes
  - [x] Create attribute value preview components for comma-separated lists
  - [x] Build supplier/catalog selector and creator

- [x] Implement the basic file upload infrastructure
  - [x] Set up temporary storage for uploaded files
  - [x] Create file processing service with multi-value attribute support
  - [x] Implement secure file handling
  - [x] Add file type validation
  - [x] Create cleanup mechanisms for temp files
  
- [x] Implement preview generation with multi-value attributes
  - [x] Create data preview transformer for attribute value lists
  - [x] Build preview grid component showing multiple attribute values
  - [x] Add field highlighting for validation issues in comma-separated lists
  - [x] Implement pagination for large datasets
  - [x] Create summary statistics for preview including attribute combinations

- [ ] Develop error handling and reporting system
  - [ ] Create structured error collection system for multi-value attributes
  - [ ] Implement error categorization (critical vs. warning)
  - [ ] Build row-level error tracking with attribute-specific messages
  - [ ] Design user-friendly error messages for attribute value problems
  - [ ] Add suggestions for error resolution

### Phase 5: Separated Image Management System
- [x] Design the product image upload interface 
  - [x] Create dedicated "Upload Images" button column in product list
  - [x] Build product-specific image management page
  - [x] Implement drag-and-drop upload interface
  - [x] Create image preview components
  - [x] Add image reordering and deletion functionality

- [ ] Implement direct Object Store upload system
  - [ ] Create secure API endpoints for image uploads
  - [ ] Implement standardized API responses for all operations
  - [ ] Handle batch uploads with progress tracking
  - [ ] Design efficient folder structure within Object Store 
  - [ ] Create comprehensive error handling and reporting

- [ ] Add image validation (format, size, dimensions)
  - [ ] Implement format validation for Object Store uploads (JPG, PNG, WebP)
  - [ ] Create file size validation and limits
  - [ ] Add dimension checking and recommendations
  - [ ] Implement image quality assessment
  - [ ] Create detailed image validation before Object Store commitment

- [ ] Implement image optimization for Object Store
  - [ ] Create automatic image resizing service
  - [ ] Implement format conversion if needed
  - [ ] Add compression with quality preservation
  - [ ] Generate thumbnails and variants automatically
  - [ ] Implement efficient Object Store path generation by catalog and product

### Phase 6: Integration and Testing
- [ ] Integrate with existing product management systems
  - [ ] Connect with product CRUD operations for multi-value attributes
  - [ ] Integrate with existing attribute management
  - [ ] Add hooks into catalog management system
  - [ ] Implement consistent transaction handling
  - [ ] Create admin audit trail for mass operations

- [ ] Implement catalog creation/selection logic
  - [ ] Build catalog selection interface
  - [ ] Add new catalog creation during import
  - [ ] Implement catalog assignment validation
  - [ ] Create catalog capacity checks
  - [ ] Add catalog permission validation

- [ ] Add bulk processing with progress tracking
  - [ ] Implement background job processing for multi-value attribute parsing
  - [ ] Create real-time progress tracking
  - [ ] Build cancellation capability for long processes
  - [ ] Add resumable processing for large batches
  - [ ] Develop detailed process logging

- [ ] Create comprehensive test suite with multi-category sample data
  - [ ] Build automated validation tests for comma-separated attribute values
  - [ ] Create sample datasets with mixed product types and multiple attribute values
  - [ ] Implement integration tests across category boundaries
  - [ ] Add stress tests for large multi-category datasets
  - [ ] Create edge case test scenarios for attribute combinations

- [ ] Add support for duplicate detection
  - [ ] Implement SKU uniqueness validation
  - [ ] Create duplicate detection across fields and attribute combinations
  - [ ] Add conflict resolution options
  - [ ] Build update mode for existing products
  - [ ] Design merge strategies for duplicates

### Phase 7: UI/UX Refinement
- [ ] Create step-by-step wizard interface
  - [ ] Design multi-step upload workflow
  - [ ] Implement intuitive navigation between steps
  - [ ] Add contextual help at each step
  - [ ] Create responsive design for all device sizes
  - [ ] Implement accessibility features

- [ ] Implement detailed error reporting and guidance
  - [ ] Create user-friendly error messages for attribute value formats
  - [ ] Design visual error indicators in the interface
  - [ ] Add context-specific help for common errors with multi-value attributes
  - [ ] Implement inline correction suggestions
  - [ ] Create exportable error reports

- [ ] Add downloadable template generation
  - [ ] Build dynamic template generator by catalog
  - [ ] Create universal templates supporting multiple product categories
  - [ ] Add sample data options demonstrating multi-value attributes
  - [ ] Implement template versioning system
  - [ ] Create comprehensive tutorial resources for catalog-centric uploads

- [ ] Develop success/failure summaries with actions
  - [ ] Design clear success/failure indicators
  - [ ] Create detailed result summaries highlighting attribute value issues
  - [ ] Implement actionable error resolution options
  - [ ] Add notification system for completed processes
  - [ ] Create exportable result reports

- [ ] Add batch history and management features
  - [ ] Create batch history dashboard
  - [ ] Implement batch status tracking
  - [ ] Add batch retry functionality
  - [ ] Design batch export/import capabilities
  - [ ] Create batch duplication and editing features

## CSV Template Structure

The CSV template will include the following fields:

### Supplier and Catalog Fields (Required):
- `supplier_id` OR `supplier_name` - Existing supplier ID or name
- `catalog_id` OR `catalog_name` - Existing catalog ID or name for new catalog
- Both supplier and catalog must exist or be created before product upload

### Category Fields (Auto-created if needed):
- `category_id` OR `category_name` - ID of existing category or name for new category
- `category_parent_id` OR `category_parent_name` - Optional parent category reference
- Categories will be automatically created if they don't exist

### Required Core Fields:
- `product_name` - Product display name
- `product_description` - Full product description
- `product_sku` - Unique product identifier

### Required Pricing and Discount Fields:
- `cost_price` - Supplier cost price (what we pay to supplier)
- `regular_price` - Regular retail price before any discounts
- `sale_price` - Actual selling price
- `discount_percentage` - Customer-facing discount percentage (displayed to customer)
- `discount_label` - Label to display for the discount (e.g., "Limited Offer", "Flash Sale")
- `minimum_price` - Minimum allowable price for the product
- `wholesale_minimum_qty` - Minimum quantity for wholesale pricing
- `wholesale_discount_percentage` - Additional discount for wholesale orders

### Optional Core Fields:
- `short_description` - Brief product description
- `tags` - Comma-separated product tags
- `status` - Product status (active/draft/etc.)
- `featured` - Whether product should be featured (true/false)
- `weight` - Product weight
- `dimensions` - Product dimensions (format: LxWxH)

### Dynamic Attribute Fields:
The system will support dynamic attributes with a special prefix and multiple values (comma-separated):
- `attr_color` - Multiple values for color attribute (e.g., "Blue,Red,Green,Purple")
- `attr_size` - Multiple values for size attribute (e.g., "Small,Medium,Large,XL")
- `attr_material` - Multiple values for material attribute (e.g., "Cotton,Polyester,Wool")
- `attr_bed_size` - Multiple values for bed size attribute (e.g., "Single,Double,Queen,King")
- etc.

Each product can have multiple attributes, and each attribute can have multiple values. This allows for products that come in various combinations (e.g., a bed blanket that's available in multiple colors and bed sizes).

## Post-Upload Image Management Requirements

Image management is completely separate from the mass upload process and will be handled through a dedicated interface:
- After products are created via CSV upload, administrators manage images through the "Upload Images" button
- All image uploads will use the Replit Object Store exclusively 
- Each product can have multiple images associated with it
- Image paths will follow a structured convention: `/products/{catalog_id}/{product_sku}/{image_name}`
- Supported formats: JPG, PNG, WebP
- Maximum image size: 5MB per image
- Recommended dimensions: 1200x1200px or larger
- Naming convention: should match the product_sku or follow a consistent pattern
- Image uploads will be processed through the dedicated "Upload Images" interface
- All image operations will use standardized API responses
- NO image references or paths are included in the CSV upload

## Implementation Details

### Backend Components:
1. **CSV Parser Service**: Handles parsing and validating CSV data
2. **Object Store Image Service**: Handles secure image uploads to Replit Object Store
3. **Product Batch Creator**: Creates products from validated data
4. **Attribute Mapper**: Maps CSV fields to product attributes
5. **Validation Service**: Validates all data before processing
6. **Error Reporter**: Collects and formats validation errors
7. **Supplier/Catalog Validator**: Ensures suppliers exist and creates catalogs if needed
8. **Category Creator**: Automatically generates category hierarchy from CSV data
9. **Pricing Engine**: Validates and applies all pricing rules and discounts
10. **Standardized API Layer**: Ensures all operations follow the standard API response format

### Admin Frontend Components:
1. **Admin Upload Wizard**: Step-by-step interface for the catalog-centric upload process (admin-only)
2. **Catalog Template Generator**: Creates downloadable CSV templates based on selected catalog
3. **Multi-Category Preview Grid**: Shows preview of products to be created across categories
4. **Pricing Preview Display**: Shows how pricing and discounts will appear on the site
5. **Category Creation Preview**: Visualizes new category hierarchies before creation
6. **Validation Display**: Shows validation errors with guidance 
7. **Progress Tracker**: Shows upload and processing progress in real-time
8. **Batch History**: Displays history of previous batch uploads by catalog
9. **Admin Supplier Manager**: Interface for managing suppliers (admin-only, catalogs auto-created as needed)
10. **Access Control Module**: Ensures only administrators can access upload functionality
11. **Product Image Manager**: Dedicated interface for adding/removing images for each product after creation
12. **Upload Images Button**: Button in dedicated column for each product in the catalog products list

### End-User Frontend Components:
1. **Product Display Cards**: Shows products without any supplier information
2. **Category Navigation**: Allows browsing the auto-created category hierarchies
3. **Price Display Component**: Shows properly formatted pricing with discounts
4. **Product Detail Pages**: Complete product information without supplier references

## Error Handling Strategy

The system will implement a comprehensive error handling approach:
1. **Validation Errors**: Before processing, report all validation issues
2. **Row-Level Errors**: Track errors by CSV row number
3. **Critical Errors**: Block processing if critical errors are found
4. **Warning-Level Issues**: Allow processing with warnings
5. **Recovery Options**: Suggestions for fixing common errors

## Technical Considerations

1. **Performance Optimization**:
   - Process large files in chunks
   - Use background workers for image processing
   - Implement caching for category and attribute lookups

2. **Database Efficiency**:
   - Use batch processing for database operations
   - Implement transaction management for rollbacks
   - Optimize queries for attribute lookups

3. **Storage Considerations**:
   - Implement temporary storage for processing
   - Clean up unused files after processing
   - Optimize image storage with proper formats

## CSV Example

```csv
supplier_id,catalog_id,category_name,category_parent_name,product_name,product_description,product_sku,cost_price,regular_price,sale_price,discount_percentage,discount_label,minimum_price,wholesale_minimum_qty,wholesale_discount_percentage,short_description,tags,status,featured,weight,dimensions,attr_color,attr_size,attr_material,attr_bed_size
2,5,"Home Decor","Home","Ceramic Flower Pot","Beautiful handcrafted ceramic flower pot perfect for indoor plants.","FP-1001",120.50,299.99,249.99,17,"Limited Offer",199.99,5,10,"Handcrafted ceramic pot","home,decor,ceramic","active",true,0.5,"10x10x15","Blue,Red,Green,White","Small,Medium,Large","Ceramic",""
2,8,"Living Room Furniture","Furniture","Wooden Coffee Table","Sturdy wooden coffee table with modern design.","CT-2002",890.00,1999.99,1499.99,25,"Flash Sale",1399.99,2,15,"Modern wooden table","furniture,living room","active",false,12,"120x60x45","Natural,Cherry,Walnut","Standard,Large","Oak,Pine,Maple",""
,"HomeStyle","Bedding","Bedroom","Premium Bed Blanket","Luxurious bed blanket made from high-quality materials for supreme comfort","BB-3003",350.00,899.99,699.99,22,"Weekend Special",599.99,3,12,"Premium comfort blanket","bedding,blanket,luxury","active",true,2,"200x180x2","Blue,Red,Green,Purple,Beige,Black","","Cotton,Wool,Microfiber","Single,Double,Queen,King"
,"HomeStyle","Accent Tables","Living Room","Marble Side Table","Elegant marble side table with metal legs","ST-4004",550.00,1199.99,899.99,25,"Flash Sale",799.99,3,12,"Luxury marble side table","furniture,luxury,marble","draft",true,8,"45x45x55","White,Black,Grey","Small,Medium,Large","Marble,Granite",""
```

In this example:
- First row: Ceramic Flower Pot available in 4 colors (Blue, Red, Green, White) and 3 sizes (Small, Medium, Large)
- Second row: Wooden Coffee Table available in 3 wood finishes (Natural, Cherry, Walnut), 2 sizes, and 3 material options
- Third row: Bed Blanket with 6 color options, 3 material choices, and 4 bed sizes (Single, Double, Queen, King)
- Fourth row: Marble Side Table with multiple color, size and material options
- Each product has multiple attributes, and each attribute can have multiple values
- All products include comprehensive pricing and catalog information
- Some attributes may be left empty if not applicable (empty string)

## Administrator Experience Flow

### 1. Prerequisite Verification
   - System checks if administrator has necessary admin role permissions
   - If needed, administrator must first create required suppliers and catalogs
   - Only users with admin role can access the mass upload system
   - Catalogs and categories can be auto-created during the upload process
   - Note: Suppliers never interact with the application directly

### 2. Template Selection
   - Administrator selects catalog for upload (catalog-centric approach)
   - System generates a universal template supporting all product types within that catalog
   - Template includes internal supplier information (never shown to end users)
   - Template can support single product or hundreds of products in one upload
   - Administrator downloads the generated CSV template

### 3. Data Preparation
   - Administrator populates CSV with product data, including all supplier/catalog information
   - All supplier information is properly tracked internally but never displayed to customers
   - No image uploads happen during the mass product upload process
   - CSV contains all product details except images

### 4. CSV Upload and Validation
   - Administrator uploads the populated CSV file (single product or bulk upload)
   - System performs initial validation checks:
     - Verifies all required fields exist, including all pricing fields
     - Validates data formats and values, including comma-separated attribute value lists
     - Confirms supplier/catalog relationships (internal tracking only)
     - Ensures supplier information is properly structured but will remain hidden from customers
     - Verifies pricing consistency (e.g., sale_price <= regular_price, sale_price >= minimum_price)
     - Validates discount calculations match the discount_percentage values
     - Validates category hierarchy if specified
     - Parses and validates all comma-separated attribute value lists
     - Identifies any malformed attribute value combinations
   - System displays validation results with detailed error messages
   - Note: No image validation is performed as images are managed separately

### 5. Product Preview
   - Administrator reviews a preview of products to be created
   - Preview shows how multiple attribute values will be mapped for each product
   - Preview displays a sample product with each attribute value combination
   - Preview displays products exactly as they will appear on the site including:
     - Complete pricing display with strikethrough original prices
     - Discount percentages and labels shown as they will appear to customers
     - Wholesale pricing thresholds and discounts
     - All available attribute value combinations (e.g., all colors, sizes, materials, etc.)
     - Automatically generated category placements
     - Confirmation that supplier information is properly tracked but hidden from end users
   - System highlights any potential issues or warnings with multi-value attributes
   - Administrator can make corrections or proceed with upload

### 6. Processing
   - System processes the upload in background with progress tracking
   - Creation follows internal hierarchy: supplier → catalog → product
   - Supplier information is properly tracked but never exposed to end users
   - System applies attribute mappings and sets up relationships
   - Real-time status updates show completed and pending items
   - System handles both single product uploads and large batch uploads efficiently
   - No images are uploaded during this process

### 7. Results Review
   - Administrator views comprehensive summary of created products
   - System highlights any issues encountered during processing
   - Detailed logs are available for troubleshooting (accessible only to administrators)
   - Administrator can take corrective actions for any failed items
   - All supplier references in logs are kept internal and not exposed to end users

### 8. Product Image Management
   - After products are created, administrators can access the catalog products page
   - When an admin clicks the "Manage" button for a catalog, they see the catalog products list
   - Each product in the list has an "Upload Images" button in a dedicated column
   - Clicking the "Upload Images" button opens an image upload interface for that specific product
   - Administrators can upload one or more images directly to Replit Object Store
   - Interface allows for adding, removing, and reordering product images
   - System supports drag-and-drop uploading for multiple images
   - Image management is handled independently from the mass upload process
   - Interface shows a preview of how images will appear on the product detail page

### 9. Post-Processing
   - Administrator can perform bulk actions on created products
   - System offers options to publish, categorize, or further edit
   - Mass update options for common fields or attributes
   - Export options for created product data (with supplier information only visible to administrators)
   - Final storefront view ensures all supplier information is hidden from end users
   - Images can be managed at any time after product creation

## Success Criteria

The mass upload system will be considered successful when:
1. Administrators can upload both single products and 100+ products in a single batch
2. All product attributes are correctly mapped
3. Separate image management interface allows administrators to upload, remove, and reorder images for each product
4. All pricing and discount information is correctly applied without manual intervention
5. Products display with complete Temu-like presentation including:
   - Strikethrough original prices
   - Prominently displayed discount percentages
   - Visible discount labels (e.g., "Flash Sale", "Limited Time")
   - Clear wholesale pricing thresholds
6. All supplier information is properly tracked internally but never visible to end users
7. Automatically created categories function correctly in the navigation hierarchy
8. Error reporting is clear and actionable for administrators
9. Processing time is reasonable (under 5 minutes for 100 products, near-instant for single products)
10. The system maintains proper access control, allowing only users with admin role to perform uploads
11. Product list in catalog admin page includes an "Upload Images" button for each product in a dedicated column

## Maintenance Considerations

1. **Template Updates**:
   - Process for administrators to update templates when new attributes are added
   - Version tracking for template changes
   - Documentation for administrators on handling supplier-specific templates

2. **Error Pattern Analysis**:
   - Tracking common errors to improve system
   - Regular updates to validation rules 
   - Administrator training on resolving common upload issues

3. **Performance Monitoring**:
   - Tracking processing times for both single product and batch uploads
   - Optimizing based on real-world usage patterns
   - Ensuring supplier information remains properly encapsulated throughout system updates

4. **Access Control Maintenance**:
   - Periodic review of administrator permissions
   - Maintaining clear separation between end-user views and administrative functions
   - Ensuring supplier data remains invisible to end users throughout system updates