# Add Product Implementation Roadmap

This document outlines the complete implementation plan for redesigning the product addition process from the `/admin/catalogs` page. The goal is to create a clean, intuitive wizard interface for adding products in the context of a specific catalog.

## Overview

The current product creation process needs to be redesigned to:
1. Allow users to add a product directly from a catalog context
2. Guide users through a 4-step wizard for adding all required product information
3. Simplify the product creation process with context-aware defaults
4. Support attribute management and AI-powered features

## Implementation Tasks

### 1. Frontend Updates

#### 1.1 Admin Catalog Products Page
- [ ] Update the "Add Product" button flow in `/admin/catalogs/[id]/products` to pass catalog context
- [ ] Ensure proper navigation to new product wizard with catalog ID pre-selected

#### 1.2 Product Form Wizard Component
- [ ] Refactor the current `ProductFormWizard` to support the new 4-step process
- [ ] Redesign wizard navigation with clearer progress indicators
- [ ] Implement autofill for contextual fields (catalog, supplier)
- [ ] Add validation for each step before proceeding

#### 1.3 Wizard Step Components
- [ ] Create Step 1: Basic Product Info
  - [ ] Title field
  - [ ] Description field
  - [ ] Category selector
  - [ ] Pricing information (Cost Price, Regular Price, Sale Price)
  - [ ] Discount percentage and Discount Label fields
  - [ ] Minimum Price field
- [ ] Create Step 2: Product Images
  - [ ] Image upload component with drag-and-drop support
  - [ ] Main image selection functionality
  - [ ] Image reordering capability
  - [ ] Image deletion functionality
- [ ] Create Step 3: Additional Product Information
  - [ ] SKU, Brand, Minimum Order fields
  - [ ] Tags management with AI suggestion option
  - [ ] Short description field
  - [ ] Product Attributes management section
    - [ ] Global attribute selection
    - [ ] Attribute values/options assignment
    - [ ] Required attribute flagging
  - [ ] Sales Information section
    - [ ] Flash sale date/time range picker
    - [ ] Free Delivery toggle (for products over R1000)
    - [ ] Featured Product toggle
    - [ ] Special Sale configuration (label, date range, custom text)
  - [ ] Product status selector (draft/inactive/active)
- [ ] Create Step 4: Review & Save
  - [ ] Product card preview component
  - [ ] Product detail preview component
  - [ ] Action buttons (Save, Cancel, Go Back)

### 2. Backend API Enhancements

#### 2.1 API Routes
- [ ] Update product creation endpoint to support context-based creation
- [ ] Add endpoint for retrieving catalog's default values
- [ ] Add wizard state persistence endpoints (save draft/progress)
- [ ] Enhance existing attribute management endpoints for the wizard

#### 2.2 Data Model Updates
- [ ] Add new fields to product schema if needed:
  - [ ] minimumPrice field
  - [ ] minimumOrder field
  - [ ] discountLabel field
  - [ ] specialSale related fields (text, date range)
  - [ ] mandatory attribute flags for product attributes

#### 2.3 Storage & Service Layer
- [ ] Update storage methods for product creation with catalog context
- [ ] Add methods for setting attribute requirements
- [ ] Implement special sale configuration storage

### 3. Testing & Validation

- [ ] Create test cases for the new product addition flow
- [ ] Validate the wizard with different product types and configurations
- [ ] Test edge cases for attribute management
- [ ] Ensure proper error handling throughout the wizard

## Missing Fields Identification

Based on the requirements and current implementation, the following fields appear to be missing:

1. **Minimum Price** - Required for setting price floors on products
2. **Discount Label** - For displaying discount type/occasion
3. **Minimum Order** - For supplier requirements
4. **Special Sale Text** - Custom text for special sales
5. **Special Sale Date Range** - Separate from flash sale dates
6. **Mandatory Attribute Flags** - To mark certain attributes as required for cart addition

## Implementation Recommendations

### Architecture Recommendations
1. **Wizard State Management**: 
   - Use React context to manage wizard state across steps
   - Implement auto-save functionality to prevent data loss

2. **Enhanced Preview Capabilities**:
   - Create a live preview component that updates as the product is configured
   - Show exactly how the product will appear in both listing and detail views

3. **Progressive Form Validation**:
   - Validate each field as it's completed
   - Apply step-level validation before allowing progression
   - Show clear error messages tied to specific fields

4. **API Optimization**:
   - Use batch requests where possible to reduce API calls
   - Implement optimistic UI updates for better user experience

### UI/UX Recommendations
1. **Contextual Help**:
   - Add tooltips for complex fields
   - Provide inline guidance for each step

2. **Mobile Responsiveness**:
   - Ensure the wizard works well on smaller screens
   - Simplify the UI for mobile users without losing functionality

3. **Accessibility**:
   - Ensure proper keyboard navigation
   - Add ARIA attributes for screen readers
   - Test with accessibility tools

4. **Error Recovery**:
   - Provide clear paths to recover from validation errors
   - Allow users to save drafts and resume later

### Technical Debt Considerations
1. **Refactor Existing Code**:
   - The current product form wizard combines steps that should be separate
   - Existing attribute management needs enhancement for the required flag

2. **Schema Updates**:
   - Some required fields are missing from the current schema
   - Add these carefully to avoid breaking existing functionality

## Conclusion

This implementation roadmap provides a comprehensive plan to redesign the product addition process with a focus on usability, efficiency, and contextual awareness. The changes will significantly improve the admin user experience while maintaining compatibility with the existing system.