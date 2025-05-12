# Add Product Implementation Roadmap

This document outlines the complete implementation plan for a clean-break redesign of the product addition process from the `/admin/catalogs` page. The goal is to create a brand new wizard interface for adding products in the context of a specific catalog, with no reliance on existing product form components.

## Overview

The current product creation process needs to be completely rebuilt to:
1. Allow users to add products directly from a catalog context
2. Guide users through a 4-step wizard for adding all required product information
3. Simplify the product creation process with context-aware defaults
4. Support advanced attribute management and AI-powered features

## Implementation Tasks

### 1. Project Setup & Planning

#### 1.1 Component Architecture Planning
- [x] Define new component structure and naming conventions
- [x] Create component directory structure for the new wizard
- [x] Define interfaces and types for the new wizard components
- [x] Document architecture decisions and component relationships

#### 1.2 New Code Structure Setup
- [x] Create a new directory structure for the wizard (`client/src/components/admin/product-wizard/`)
- [x] Set up shared types and interfaces (`client/src/components/admin/product-wizard/types.ts`)
- [x] Create a state management structure (`client/src/components/admin/product-wizard/context.tsx`)
- [x] Define component boundaries with clear responsibilities

### 2. Data Model & Schema Updates

#### 2.1 Database Schema Expansion
- [x] Add new fields to product schema in `shared/schema.ts`:
  - [x] minimumPrice field (for setting price floors)
  - [x] minimumOrder field (for supplier requirements)
  - [x] discountLabel field (for displaying discount type/occasion)
  - [x] specialSaleText field (for custom sale messaging)
  - [x] specialSaleStart and specialSaleEnd fields (separate from flash sale dates)
  - [x] requiredAttributeIds array field (to track mandatory attributes)

#### 2.2 New Validation Schema Creation
- [x] Create new product wizard validation schemas in `shared/validation-schemas.ts`
- [x] Create step-specific validation schemas for each wizard step
- [x] Create attribute requirement validation schema

#### 2.3 Database Migration Implementation
- [x] Create database migration script for the new fields
- [x] Implement safe conversion of existing product data
- [x] Add indexes for new searchable fields

### 3. Backend API Development

#### 3.1 New Storage Service Methods
- [ ] Create new methods in `server/storage.ts` with clear suffixes (e.g., `createProductWithWizard`)
- [ ] Implement methods for handling product attributes as required/optional
- [ ] Create special sale configuration storage methods
- [ ] Implement catalog-context product retrieval methods

#### 3.2 New API Routes Creation
- [ ] Create new product wizard API routes (with `/wizard` URL segment)
- [ ] Implement catalog context retrieval endpoints
- [ ] Create wizard draft saving and retrieval endpoints
- [ ] Implement attribute requirement management endpoints
- [ ] Add special sale configuration endpoints

#### 3.3 API Security & Validation
- [ ] Implement middleware for wizard-specific operations
- [ ] Create validators for all new API endpoints
- [ ] Ensure proper error handling for the wizard process
- [ ] Add permission checks for catalog-based operations

### 4. New Wizard Context & Navigation Framework

#### 4.1 Wizard State Management
- [x] Create `ProductWizardProvider` context component
- [x] Implement wizard state reducer
- [ ] Add persistence layer for wizard drafts
- [x] Create navigation guards for validation

#### 4.2 Wizard Navigation Component
- [x] Create `WizardNavigation` component
- [x] Implement step progress visualization
- [x] Add step validation indicators
- [x] Create wizard header with contextual information

#### 4.3 Wizard Container & Layout
- [x] Create `WizardContainer` component with consistent layout
- [x] Implement responsive design for all viewports
- [ ] Add transition animations between steps
- [x] Create consistent action button patterns

### 5. New Step Components Implementation

#### 5.1 Step 1: Basic Product Info Component
- [x] Create `BasicInfoStep.tsx` component
- [x] Implement the following fields:
  - [x] Title field with validation
  - [x] Description field with rich text editor
  - [x] Category selector with catalog context
  - [x] Pricing fields (Cost Price, Regular Price, Sale Price)
  - [ ] Discount percentage and Discount Label fields
  - [ ] Minimum Price field with validation
- [x] Add step-specific validation logic
- [ ] Implement auto-save functionality

#### 5.2 Step 2: Product Images Component
- [x] Create `ProductImagesStep.tsx` component
- [x] Implement the following features:
  - [x] Image upload with drag-and-drop support
  - [x] Main image selection controls
  - [ ] Image reordering with drag-and-drop
  - [x] Image deletion functionality
  - [ ] Image metadata editing
- [ ] Add image processing features
- [ ] Implement AI background removal integration
- [x] Create image preview functionality

#### 5.3 Step 3: Additional Product Info Component
- [x] Create `AdditionalInfoStep.tsx` component
- [x] Implement the following sections:
  - [x] Product details section (SKU, Brand, Minimum Order)
  - [x] Tags management with AI suggestions
  - [x] Short description field
  - [x] Product attributes management:
    - [x] Global attribute selector component
    - [ ] Attribute values/options assignment
    - [ ] Required attribute flagging interface
  - [x] Sales information section:
    - [x] Flash sale date/time picker
    - [x] Free Delivery toggle (conditional on price)
    - [x] Featured Product toggle
    - [x] Special Sale configuration panel
  - [x] Product status selector (draft/inactive/active)
- [x] Implement complex validation logic
- [x] Create AI integration for tag suggestions

#### 5.4 Step 4: Review & Save Component
- [x] Create `ReviewSaveStep.tsx` component
- [x] Implement the following features:
  - [x] Product card preview (exactly as it will appear)
  - [x] Product detail preview (tabs, sections, etc.)
  - [x] Complete validation summary
  - [x] Action buttons (Save, Back, Cancel)
- [x] Add final validation checks
- [x] Implement submission handling with loading states

### 6. Route & Navigation Integration

#### 6.1 New Route Creation
- [x] Create a new product wizard route in `client/src/App.tsx`
- [x] Implement route parameters for catalog context
- [ ] Add navigation interceptors for unsaved changes
- [x] Create route-based wizard state initialization

#### 6.2 Catalog Integration Points
- [ ] Update the "Add Product" button in catalog products list
- [ ] Remove old component references
- [ ] Implement navigation with proper context passing
- [ ] Add success redirect handling

#### 6.3 Admin Navigation Updates
- [ ] Update admin navigation to include new wizard
- [ ] Add breadcrumb support for wizard routes
- [ ] Implement proper return navigation after completion
- [ ] Add wizard entry points from multiple locations

### 7. Context-Aware Features Implementation

#### 7.1 Catalog Context Features
- [ ] Implement auto-filling from catalog data
- [ ] Create default value provider based on catalog settings
- [ ] Add catalog-specific validation rules
- [ ] Implement supplier information integration

#### 7.2 AI Feature Integration
- [ ] Create AI image analysis integration
- [ ] Implement AI-powered pricing suggestions
- [ ] Add tag generation from product information
- [ ] Create attribute suggestion features

#### 7.3 Attribute Management Features
- [ ] Create required attribute selection interface
- [ ] Implement attribute preview components
- [ ] Add attribute filtering mechanisms
- [ ] Create attribute-specific validation

### 8. Testing & Quality Assurance

#### 8.1 Component Testing
- [ ] Create test suite for wizard components
- [ ] Implement unit tests for state management
- [ ] Add integration tests for step transitions
- [ ] Test form validation thoroughly

#### 8.2 End-to-End Testing
- [ ] Create E2E tests for the complete wizard flow
- [ ] Test with various product types and configurations
- [ ] Validate attribute management edge cases
- [ ] Verify proper error handling in all scenarios

#### 8.3 Performance & Accessibility Verification
- [ ] Test with large datasets
- [ ] Measure and optimize component render performance
- [ ] Conduct accessibility audit
- [ ] Test keyboard navigation and screen reader compatibility

### 9. Documentation & Training

#### 9.1 User Documentation
- [ ] Create step-by-step guide for the new wizard
- [ ] Add tooltips and contextual help throughout interface
- [ ] Document all new fields and features
- [ ] Create video demonstration of the complete flow

#### 9.2 Code Documentation
- [ ] Add comprehensive JSDoc comments to all components
- [ ] Create architecture diagram for the wizard
- [ ] Document state management patterns
- [ ] Add README file for the wizard component structure

### 10. Clean-Up & Deployment Planning

#### 10.1 Legacy Code Handling
- [ ] Mark old components as deprecated
- [ ] Add redirects from old routes to new wizard
- [ ] Create plan for eventual removal of old components
- [ ] Document transition plan for existing users

#### 10.2 Deployment Strategy
- [ ] Create a phased deployment plan
- [ ] Implement feature flags for gradual rollout
- [ ] Prepare database migration scripts
- [ ] Create rollback procedures

## Missing Fields Identification

Based on the requirements and current implementation, the following fields must be added to the product schema:

1. **Minimum Price** - Required for setting price floors on products
2. **Discount Label** - For displaying discount type/occasion
3. **Minimum Order** - For supplier requirements
4. **Special Sale Text** - Custom text for special sales
5. **Special Sale Date Range** - Separate from flash sale dates (start and end times)
6. **Mandatory Attribute Flags** - To mark certain attributes as required for cart addition

## Implementation Recommendations

### Clean-Break Architecture Approach
1. **Complete Separation from Legacy Code**:
   - Create entirely new component hierarchy with no dependencies on existing components
   - Use new file naming conventions to clearly distinguish wizard components
   - Create separate context provider to avoid state pollution
   - Implement dedicated API endpoints for the wizard flow

2. **State Management Approach**:
   - Use React Context API with useReducer for complex state
   - Create a persistence layer that saves draft state to server
   - Implement clear action creators for state modifications
   - Add robust error handling at each state transition

3. **Component Isolation Strategy**:
   - Each step should be a standalone component with minimal dependencies
   - Create shared UI components specific to the wizard
   - Use composition over inheritance for component reuse
   - Implement clear boundaries between presentation and logic

4. **Parallel Implementation Strategy**:
   - Build new system alongside existing one
   - Add feature flags to control visibility
   - Once new system is complete, redirect from old routes
   - Eventually remove old components after transition period

### UI/UX Design Principles
1. **Guided Experience Design**:
   - Create clear step indicators showing progress
   - Add contextual help that explains process at each step
   - Implement "smart defaults" based on catalog context
   - Provide clear error recovery paths

2. **Mobile-First Approach**:
   - Design for mobile screens first, then enhance for larger displays
   - Use responsive layouts that adapt to screen size
   - Create touch-friendly interaction patterns
   - Test thoroughly on multiple device sizes

3. **Visual Feedback System**:
   - Show real-time validation feedback
   - Provide clear success/error states
   - Implement thoughtful loading indicators
   - Add micro-interactions for important actions

4. **Accessibility as Core Requirement**:
   - Ensure screen reader compatibility throughout
   - Implement proper focus management between steps
   - Use appropriate ARIA attributes for complex components
   - Maintain sufficient color contrast

### Technical Implementation Guidelines
1. **Database Considerations**:
   - Add new fields with NULL defaults for backward compatibility
   - Create migration scripts that preserve existing data
   - Add appropriate indexes for performance
   - Document schema changes thoroughly

2. **API Design Principles**:
   - Create RESTful endpoints for each wizard operation
   - Implement consistent error response format
   - Add comprehensive validation for all inputs
   - Document API with examples for each endpoint

3. **Testing Strategy**:
   - Write tests for each component in isolation
   - Create integration tests for wizard as a whole
   - Test edge cases thoroughly (large catalogs, many attributes)
   - Implement E2E tests for critical flows

4. **Code Quality Standards**:
   - Follow consistent naming conventions
   - Add comprehensive comments and documentation
   - Implement strict TypeScript type checking
   - Use linting and code formatting consistently

## Conclusion

This implementation roadmap provides a comprehensive plan for creating a brand new product addition wizard with no dependencies on existing components. By taking this clean-break approach, we can implement all requirements without being constrained by the current implementation. This will result in a more maintainable, feature-rich, and user-friendly product creation experience that fully satisfies the business requirements while providing a solid foundation for future enhancements.