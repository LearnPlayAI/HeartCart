# Cart System Refinement Plan

This document outlines the tasks needed to address the mismatch between our client-side cart implementation and the database schema, particularly regarding the discount calculations and persistence.

## Overview

Currently, our system has a discrepancy between how cart items are represented in the client code versus how they're stored in the database:

- **Client-side**: Cart items include discount information, calculated prices, and other attributes not stored in the database
- **Database**: The `cart_items` table has a simpler schema without fields for discounts and calculated prices

This approach works but may lead to inconsistencies and makes the codebase harder to maintain. This plan outlines the steps to align the implementations and improve the system.

## Implementation Tasks

### Phase 1: Analysis and Planning

#### Task 1.1: Complete Database Schema Analysis [COMPLETED]
- [x] Identify all missing fields between client cart implementation and database schema
- [x] Document the current approach to discount calculations and price adjustments
- [x] Evaluate the pros and cons of the current implementation

#### Task 1.2: Define Strategy for Cart Persistence [NOT STARTED]
- [ ] Decide on persistence approach:
  - Option A: Expand database schema to store discount information
  - Option B: Keep calculations client-side but improve documentation and consistency
- [ ] Document the selected approach with justification

### Phase 2: Schema and Type Updates

#### Task 2.1: Update Database Schema (If Option A) [NOT STARTED]
- [ ] Create migration script to add discount-related fields to cart_items table
- [ ] Update shared/schema.ts to include new fields
- [ ] Test migration in development environment

#### Task 2.2: Standardize Type Definitions [NOT STARTED]
- [ ] Update CartItem type in client code to match implementation strategy
- [ ] Ensure consistent type usage across all components
- [ ] Add documentation to type definitions explaining calculation approach

### Phase 3: Backend Implementation

#### Task 3.1: Update Storage Interface [NOT STARTED]
- [ ] Modify IStorage interface to accommodate chosen persistence strategy
- [ ] Update storage implementation methods for cart operations
- [ ] Add validation to ensure data consistency

#### Task 3.2: Enhance API Routes [NOT STARTED]
- [ ] Update cart API endpoints to handle discount information according to chosen strategy
- [ ] Add endpoint documentation explaining the data flow
- [ ] Implement consistent error handling for discount-related operations

### Phase 4: Frontend Adjustments

#### Task 4.1: Refactor Cart Hook [NOT STARTED]
- [ ] Update useCart hook to align with chosen persistence strategy
- [ ] Centralize discount calculation logic to prevent duplication
- [ ] Add proper type safety throughout the implementation

#### Task 4.2: Update Cart UI Components [NOT STARTED]
- [ ] Enhance cart-drawer.tsx to handle discount display consistently
- [ ] Update checkout.tsx to ensure proper discount handling
- [ ] Improve price display components to clearly show original price, discounts, and final price

### Phase 5: Testing and Validation

#### Task 5.1: Create Test Cases [NOT STARTED]
- [ ] Develop test scenarios for different attribute combinations and discount rules
- [ ] Create test data covering edge cases in the discount system
- [ ] Document expected behavior for each test case

#### Task 5.2: System Integration Testing [NOT STARTED]
- [ ] Test full cart flow from product selection to checkout
- [ ] Verify discount persistence behavior matches documentation
- [ ] Test cart synchronization between sessions
- [ ] Validate behavior when discount rules change while items are in cart

### Phase 6: Documentation and Cleanup

#### Task 6.1: Code Documentation [NOT STARTED]
- [ ] Add comprehensive comments explaining the cart discount calculation flow
- [ ] Document the persistence strategy in relevant files
- [ ] Update API documentation to reflect the implementation

#### Task 6.2: Final Review and Cleanup [NOT STARTED]
- [ ] Remove any debug code or temporary workarounds
- [ ] Ensure consistent naming conventions across the codebase
- [ ] Verify all edge cases are properly handled

## Decision Points

### Persistence Strategy Options

**Option A: Full Database Persistence**
- Pros: Consistent pricing, historical accuracy, simpler data flow
- Cons: Database schema changes required, potential for stale prices

**Option B: On-Demand Calculation**
- Pros: Always current pricing, smaller database footprint, no migration needed
- Cons: Calculation logic duplication, potential inconsistencies between views

### Implementation Considerations

1. **Price Lock Timeout**: Should we implement a "price lock" that guarantees a price for a certain time after adding to cart?

2. **Discount Rule Versioning**: Should we version discount rules to maintain consistency for items already in cart?

3. **Performance Impact**: How will the chosen approach affect performance, especially with many items or complex rules?

This plan will be refined based on decisions made during implementation, with regular updates to track progress.