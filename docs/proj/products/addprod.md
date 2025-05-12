# Add Product Implementation Roadmap

This document outlines the complete implementation plan for redesigning the product addition process from the `/admin/catalogs` page. The goal is to create a clean, intuitive wizard interface for adding products in the context of a specific catalog.

## Overview

The current product creation process needs to be redesigned to:
1. Allow users to add a product directly from a catalog context
2. Guide users through a 4-step wizard for adding all required product information
3. Simplify the product creation process with context-aware defaults
4. Support attribute management and AI-powered features

## Implementation Tasks

### 1. Data Model & Schema Updates

#### 1.1 Database Schema Enhancements
- [ ] Update the product schema in `shared/schema.ts` with new required fields:
  - [ ] minimumPrice field (for setting price floors)
  - [ ] minimumOrder field (for supplier requirements)
  - [ ] discountLabel field (for displaying discount type/occasion)
  - [ ] specialSaleText field (for custom sale messaging)
  - [ ] specialSaleStart and specialSaleEnd fields (separate from flash sale dates)
  - [ ] Add any additional field constraints (e.g., validation rules)

#### 1.2 Update Validation Schemas
- [ ] Update the product validation schemas in `shared/validation-schemas.ts`
- [ ] Create/update Zod schemas for the new form wizard steps
- [ ] Add validation for required attributes selection

#### 1.3 Update Database Migration Files
- [ ] Create a database migration script for the new fields
- [ ] Ensure safe migration path for existing products

### 2. Backend API Enhancements

#### 2.1 Storage Service Layer Updates
- [ ] Update `server/storage.ts` with methods for the new fields
- [ ] Add methods for setting attribute requirements
- [ ] Implement special sale configuration storage
- [ ] Add methods to retrieve products in the context of catalogs with additional fields

#### 2.2 API Route Updates
- [ ] Update product creation endpoint to support context-based creation
- [ ] Add endpoint for retrieving catalog's default values
- [ ] Add wizard state persistence endpoints (save draft/progress)
- [ ] Add endpoints for managing required product attributes
- [ ] Create API for special sale configuration

#### 2.3 Backend Middleware & Validation
- [ ] Implement middleware for catalog-context product operations
- [ ] Add validation for the new product fields
- [ ] Ensure proper error handling for the wizard process

### 3. Frontend Components Structure

#### 3.1 Wizard Framework 
- [ ] Create a new `ProductWizardProvider` context component for state management
- [ ] Implement wizard navigation logic and progression management
- [ ] Add draft saving functionality
- [ ] Create progress indicators and navigation UI

#### 3.2 Update Routes & Navigation
- [ ] Update the "Add Product" button flow in `/admin/catalogs/[id]/products`
- [ ] Implement proper navigation with context passing
- [ ] Create route handlers for the wizard with catalog context

### 4. Wizard Step Components

#### 4.1 Step 1: Basic Product Info
- [ ] Create/update component for basic product information:
  - [ ] Title field
  - [ ] Description field
  - [ ] Category selector with context awareness
  - [ ] Pricing information (Cost Price, Regular Price, Sale Price)
  - [ ] Discount percentage and Discount Label fields
  - [ ] Minimum Price field
- [ ] Implement validation for basic information step
- [ ] Add auto-saving for partially completed step

#### 4.2 Step 2: Product Images
- [ ] Create/update component for product images:
  - [ ] Image upload component with drag-and-drop support
  - [ ] Main image selection functionality
  - [ ] Image reordering capability
  - [ ] Image deletion functionality
- [ ] Implement image processing and optimization
- [ ] Add background removal option using AI
- [ ] Create image preview functionality

#### 4.3 Step 3: Additional Product Information
- [ ] Create/update component for additional information:
  - [ ] SKU, Brand, Minimum Order fields
  - [ ] Tags management with AI suggestion option
  - [ ] Short description field
  - [ ] Product Attributes management section:
    - [ ] Global attribute selection
    - [ ] Attribute values/options assignment
    - [ ] Required attribute flagging
  - [ ] Sales Information section:
    - [ ] Flash sale date/time range picker
    - [ ] Free Delivery toggle (for products over R1000)
    - [ ] Featured Product toggle
    - [ ] Special Sale configuration (label, date range, custom text)
  - [ ] Product status selector (draft/inactive/active)
- [ ] Implement validation for additional information step
- [ ] Create AI integration for tag suggestions

#### 4.4 Step 4: Review & Save
- [ ] Create component for review and saving:
  - [ ] Product card preview component
  - [ ] Product detail preview component
  - [ ] Validation summary for all steps
  - [ ] Action buttons (Save, Cancel, Go Back)
- [ ] Implement final validation before submission
- [ ] Create success/error handling for final save

### 5. Contextual Features & Functionality

#### 5.1 Catalog Context Integration
- [ ] Auto-fill supplier information from catalog
- [ ] Set default values based on catalog settings
- [ ] Implement catalog-specific validation rules

#### 5.2 AI Integration Features
- [ ] Enhance image analysis capabilities for product suggestions
- [ ] Implement pricing suggestions based on catalog context
- [ ] Add tag generation from product images and description

#### 5.3 Attribute Management Enhancements
- [ ] Implement UI for marking attributes as required for cart addition
- [ ] Create attribute preview in product card/detail views
- [ ] Add attribute filtering in product lists

### 6. Testing & Quality Assurance

#### 6.1 Unit & Integration Testing
- [ ] Create unit tests for new components and functions
- [ ] Implement integration tests for the wizard flow
- [ ] Test database migrations and schema updates

#### 6.2 User Acceptance Testing
- [ ] Create test cases for the product addition flow
- [ ] Validate the wizard with different product types
- [ ] Test edge cases for attribute management
- [ ] Verify proper error handling throughout the wizard

#### 6.3 Performance & Accessibility Testing
- [ ] Test wizard performance with large catalogs
- [ ] Ensure mobile responsiveness of all wizard steps
- [ ] Verify accessibility compliance

### 7. Documentation & Deployment

#### 7.1 Admin Documentation
- [ ] Create user documentation for the new wizard
- [ ] Add help text and tooltips within the interface
- [ ] Document attribute management process

#### 7.2 Deployment Strategy
- [ ] Plan phased rollout of the new feature
- [ ] Create migration path for existing products
- [ ] Prepare rollback procedures if needed

## Missing Fields Identification

Based on the requirements and current implementation, the following fields appear to be missing:

1. **Minimum Price** - Required for setting price floors on products
2. **Discount Label** - For displaying discount type/occasion
3. **Minimum Order** - For supplier requirements
4. **Special Sale Text** - Custom text for special sales
5. **Special Sale Date Range** - Separate from flash sale dates (start and end times)
6. **Mandatory Attribute Flags** - To mark certain attributes as required for cart addition

## Implementation Recommendations

### Architecture Recommendations
1. **State Management & Data Flow**:
   - Use React context for wizard state instead of passing props down the component tree
   - Implement auto-save functionality using local storage or server-side drafts
   - Use a reducer pattern for complex state transitions between steps

2. **Progressive Enhancement**:
   - Build the wizard to work without JavaScript as a fallback
   - Implement form validation both client and server-side
   - Create a simplified single-page fallback for older browsers

3. **Error Handling & Recovery**:
   - Implement robust error boundary components
   - Create persistent draft saving to prevent data loss
   - Add step-specific error handling and validation

4. **Performance Optimization**:
   - Lazy load wizard steps to improve initial load time
   - Optimize image uploads with client-side compression
   - Use debouncing for auto-save functionality

### UI/UX Recommendations
1. **Contextual Guidance**:
   - Add inline help text that explains each field's purpose
   - Provide example values for complex fields
   - Show validation in real-time with clear error messages

2. **Responsive Design Considerations**:
   - Create mobile-specific layouts for each wizard step
   - Simplify the UI on smaller screens without losing functionality
   - Ensure touch-friendly interactive elements

3. **Accessibility Enhancements**:
   - Add screen reader announcements for step transitions
   - Ensure keyboard navigation throughout the wizard
   - Maintain proper heading hierarchy and ARIA landmarks

4. **Visual Feedback**:
   - Show clear progress indicators between steps
   - Provide visual confirmation when steps are completed
   - Use animation sparingly to guide attention

### Technical Implementation Strategy
1. **Phased Development Approach**:
   - First implement the data model and API changes
   - Then build the wizard framework and navigation
   - Develop each step component independently
   - Finally integrate all components with state management

2. **Testing Strategy**:
   - Create test fixtures for different product types
   - Test wizard state transitions extensively
   - Verify data consistency across all steps

3. **Integration Points**:
   - Ensure seamless integration with existing catalog management
   - Verify compatibility with current product listing pages
   - Test integration with search and filtering components

## Conclusion

This implementation roadmap provides a comprehensive plan to redesign the product addition process with a focus on usability, efficiency, and contextual awareness. By following a logical implementation order starting with data models, then backend services, frontend framework, and finally individual components, we ensure a solid foundation for this feature. The changes will significantly improve the admin user experience while maintaining compatibility with the existing system.