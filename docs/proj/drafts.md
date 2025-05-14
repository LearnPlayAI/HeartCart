# Product Draft System Roadmap

## Overview

This document outlines the implementation strategy for redesigning the product creation and editing system, focusing on a database-first approach with a proper draft system. The goal is to eliminate React Context state management and ensure a single source of truth through direct database and Replit Object Store interactions.

## Core Principles

1. **No React Context**: Remove all context-based state management
2. **Single Source of Truth**: Database is the only source of data, with no duplicate state
3. **Draft System**: Implement proper drafting functionality using the product_drafts table
4. **Direct Database/Object Store Interaction**: Forms interact directly with the backend

## Technical Architecture

### Data Flow Model
```
User Action → API Request → Database/Object Store → API Response → UI Update
```

### Draft System
- **Creating new product**: Creates entry in `product_drafts` table with status "draft"
- **Editing existing product**: Creates temporary copy in `product_drafts` with reference to original
- **Save/Publish**: Validates and moves data from `product_drafts` to final tables
- **Cancel**: Deletes the draft record

## Implementation Phases

### Phase 1: Database Schema and API Endpoints (1-2 days)

- [x] Create `product_drafts` table with all necessary fields
- [x] Create API endpoints for draft management:
  - [x] `POST /api/product-drafts`: Create new draft (empty or from existing product)
  - [x] `GET /api/product-drafts/:id`: Get draft by ID
  - [x] `PATCH /api/product-drafts/:id`: Update draft fields
  - [x] `PATCH /api/product-drafts/:id/wizard-step`: Update specific step data
  - [x] `POST /api/product-drafts/:id/images`: Upload images and associate with draft
  - [x] `DELETE /api/product-drafts/:id/images/:imageId`: Remove image from draft
  - [x] `POST /api/product-drafts/:id/publish`: Validate and publish draft to final tables
  - [x] `DELETE /api/product-drafts/:id`: Discard draft

### Phase 2: Core Draft Management (2-3 days)

- [x] Implement server-side draft creation logic
- [x] Implement server-side draft update logic
- [x] Implement server-side draft validation
- [x] Implement server-side publishing logic
- [x] Implement image handling with Replit Object Store
- [x] Create utility functions for draft state transformations

### Phase 3: Frontend Implementation (3-4 days)

- [x] Create new ProductWizard component that uses draft API
- [x] Implement step components that load data directly from draft API:
  - [x] BasicInfoStep
  - [x] ProductImagesStep 
  - [x] AdditionalInfoStep
  - [x] ReviewAndSaveStep
- [x] Implement auto-save functionality with debounce
- [x] Create loading/saving indicators
- [x] Implement draft management UI (create, discard, publish)

### Phase 4: Testing and Refinement (1-2 days)

- [x] Test draft creation flow
- [x] Test draft editing flow
- [x] Test image upload and management
- [x] Test validation and error handling
- [x] Test publishing flow
- [x] Optimize performance
- [x] Add final polish and refinements

## Database Schema Updates

```sql
CREATE TABLE IF NOT EXISTS product_drafts (
  id SERIAL PRIMARY KEY,
  original_product_id INTEGER REFERENCES products(id),
  draft_status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'review', 'ready'
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Basic product information
  name TEXT,
  slug TEXT,
  sku TEXT,
  description TEXT,
  brand TEXT,
  category_id INTEGER REFERENCES categories(id),
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  
  -- Pricing information
  cost_price DECIMAL(10, 2),
  regular_price DECIMAL(10, 2),
  sale_price DECIMAL(10, 2),
  on_sale BOOLEAN DEFAULT FALSE,
  markup_percentage INTEGER,
  
  -- Images
  image_urls TEXT[],
  image_object_keys TEXT[],
  main_image_index INTEGER DEFAULT 0,
  
  -- Inventory
  stock_level INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  backorder_enabled BOOLEAN DEFAULT FALSE,
  
  -- Attributes (stored as JSON)
  attributes JSONB DEFAULT '[]',
  
  -- Supplier information
  supplier_id INTEGER REFERENCES suppliers(id),
  
  -- Physical properties
  weight TEXT,
  dimensions TEXT,
  
  -- Promotions
  discount_label TEXT,
  special_sale_text TEXT,
  special_sale_start TIMESTAMP WITH TIME ZONE,
  special_sale_end TIMESTAMP WITH TIME ZONE,
  is_flash_deal BOOLEAN DEFAULT FALSE,
  flash_deal_end TIMESTAMP WITH TIME ZONE,
  
  -- Tax information
  taxable BOOLEAN DEFAULT TRUE,
  tax_class TEXT DEFAULT 'standard',
  
  -- SEO metadata
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,
  
  -- Wizard progress tracking
  wizard_progress JSONB DEFAULT '{"basic-info": false, "images": false, "additional-info": false, "sales-promotions": false, "review": false}'
);

CREATE INDEX IF NOT EXISTS idx_product_drafts_original_product 
ON product_drafts(original_product_id);

CREATE INDEX IF NOT EXISTS idx_product_drafts_status 
ON product_drafts(draft_status);
```

## API Endpoint Details

### Create Draft
- **Endpoint**: `POST /api/product-drafts`
- **Payload**: 
  ```json
  {
    "originalProductId": 123 // Optional, for editing existing products
  }
  ```
- **Response**: Draft object with ID

### Get Draft
- **Endpoint**: `GET /api/product-drafts/:id`
- **Response**: Complete draft object

### Update Draft
- **Endpoint**: `PATCH /api/product-drafts/:id`
- **Payload**: Any draft fields to update
- **Response**: Updated draft object

### Update Wizard Step
- **Endpoint**: `PATCH /api/product-drafts/:id/wizard-step`
- **Payload**: 
  ```json
  {
    "step": "basic-info", // Step identifier
    "data": { /* Step-specific data */ }
  }
  ```
- **Response**: Updated draft object

### Upload Images
- **Endpoint**: `POST /api/product-drafts/:id/images`
- **Payload**: Form data with images
- **Response**: Updated image URLs and object keys

### Remove Image
- **Endpoint**: `DELETE /api/product-drafts/:id/images/:imageIndex`
- **Response**: Updated image arrays

### Publish Draft
- **Endpoint**: `POST /api/product-drafts/:id/publish`
- **Response**: Published product object

### Discard Draft
- **Endpoint**: `DELETE /api/product-drafts/:id`
- **Response**: Success message

## Frontend Implementation Details

### ProductWizard Component
- Manages draft creation/loading
- Handles navigation between steps
- Tracks overall completion status

### Step Components
Each step will:
- Load data directly from draft
- Use local React state for form editing
- Auto-save changes to draft API
- Show validation errors from API
- Track completion status

### Forms Implementation
- Use controlled components with React Hook Form
- Implement field-level validation
- Display server-side validation errors
- Show loading states during API calls

## Benefits of This Approach

1. **Data Integrity**: Single source of truth prevents desynchronization issues
2. **Better UX**: Clear draft workflow with explicit save/discard actions
3. **Simplified State Management**: No complex React Context providers
4. **Improved Reliability**: Server-side validation ensures consistent data
5. **Better Separation of Concerns**: UI components focus on presentation, API handles data logic

## Progress Tracking

We have completed all planned implementation phases:

- ✅ Phase 1: Database Schema and API Endpoints
- ✅ Phase 2: Core Draft Management
- ✅ Phase 3: Frontend Implementation
- ✅ Phase 4: Testing and Refinement

## Implementation Summary

The product draft system has been successfully implemented following all the core principles outlined. The implementation:

1. **Eliminated React Context**: All state is now managed through direct database interactions
2. **Established Single Source of Truth**: The database serves as the only persistent data store
3. **Implemented Draft System**: Products can be created and edited using the drafts table
4. **Direct Database/Object Store Interactions**: All forms connect directly to API endpoints

### Key Features Implemented

- Complete product draft management system with proper database schema
- Frontend wizard with step-by-step progression and validation
- Image upload and management with Replit Object Store integration
- Auto-save functionality with debounced API calls
- Database-backed draft state persistence across page refreshes
- Loading/saving indicators for better user experience
- Draft discard and publish functionality

### Benefits Achieved

1. **Improved Data Integrity**: All data is stored in a single location
2. **Better User Experience**: Changes persist across page refreshes and sessions
3. **Simplified Architecture**: Direct database interaction eliminates complex state management
4. **Improved Reliability**: Server-side validation ensures consistent data

This implementation successfully meets all the requirements for redesigning the product wizard with a database-first approach.