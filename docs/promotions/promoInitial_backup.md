# Promotions System Implementation Roadmap

## Project Overview
Transform the current individual flash deals system into a comprehensive promotion campaign management system for the South African e-commerce platform.

## Core Objectives
- Replace individual product flash deals with campaign-based promotions
- Enable bulk product management through existing drafts system
- Provide comprehensive analytics and performance tracking
- Maintain mobile-first responsive design
- Ensure zero breaking changes to existing functionality

---

## Phase 1: Foundation Infrastructure ⏳

### Database Schema
- [ ] Create `promotions` table with camelCase naming convention
  - [ ] promotionName (TEXT NOT NULL)
  - [ ] startDate (TEXT NOT NULL)
  - [ ] endDate (TEXT NOT NULL)
  - [ ] isActive (BOOLEAN DEFAULT true)
  - [ ] createdBy (INTEGER REFERENCES users.id)
  - [ ] createdAt (TEXT DEFAULT NOW())
  - [ ] updatedAt (TEXT DEFAULT NOW())
  - [ ] description (TEXT)
  - [ ] promotionType (TEXT DEFAULT 'percentage')
  - [ ] discountValue (DECIMAL)
  - [ ] minimumOrderValue (DECIMAL)

- [ ] Extend `product_drafts` table
  - [ ] Add promotionId column (camelCase naming convention)
  - [ ] Update schema.ts with new field

### API Endpoints - Core CRUD
- [ ] `GET /api/promotions` - List all promotions with pagination
- [ ] `POST /api/promotions` - Create new promotion
- [ ] `GET /api/promotions/:id` - Get specific promotion details
- [ ] `PATCH /api/promotions/:id` - Update promotion
- [ ] `DELETE /api/promotions/:id` - Delete promotion
- [ ] `POST /api/promotions/:id/activate` - Manual activation
- [ ] `POST /api/promotions/:id/deactivate` - Manual deactivation

### Admin Interface Foundation
- [ ] Add "Promotions" to admin sidebar navigation
- [ ] Create `/admin/promotions` main page with layout
- [ ] Implement card view for promotions list
- [ ] Implement table view for promotions list
- [ ] Create `/admin/promotions/create` page
- [ ] Create `/admin/promotions/[id]/edit` page
- [ ] Basic promotion form with validation

---

## Phase 2: Product Management Integration ⏳

### Product Selection System
- [ ] Integrate existing home page search component
- [ ] Create `/admin/promotions/[id]/products` page
- [ ] Individual product search and selection
- [ ] Product list view with checkbox selection for multiple products
- [ ] Selected products display and management
- [ ] Remove products from promotion functionality

### Multiple Product Selection Methods
- [ ] Search-based product selection (individual or multiple)
- [ ] List view with checkboxes for bulk selection
- [ ] "Add all products from category" functionality
- [ ] Category tree selection interface
- [ ] Bulk category assignment with preview
- [ ] Subcategory inclusion options
- [ ] Supplier-based bulk selection
- [ ] Catalog-based bulk selection

### Draft System Integration
- [ ] Extend existing drafts system for promotion assignments
- [ ] Create drafts for all products added to promotion
- [ ] Bulk draft publishing workflow
- [ ] Progress tracking for bulk operations
- [ ] Error handling for failed draft creations

---

## Phase 3: Automation & Scheduling ⏳

### Time Zone Awareness
- [ ] South African timezone configuration
- [ ] Proper date/time handling in UI
- [ ] Server-side timezone conversion
- [ ] Schedule display in local time

### Automatic Activation System
- [ ] Background job system for promotion activation
- [ ] Scheduled promotion start automation
- [ ] Scheduled promotion end automation
- [ ] Grace period handling for overlapping schedules

### Draft Scheduling
- [ ] Schedule when promotion drafts get published
- [ ] Pre-publication validation
- [ ] Automated publishing workflow
- [ ] Notification system for scheduled events

### Duplicate Protection
- [ ] Check for overlapping promotions on same products
- [ ] Warning system for potential conflicts
- [ ] Resolution workflow for conflicts
- [ ] Override options for admin users

---

## Phase 4: CSV Bulk Import Integration ⏳

### Mass Upload System Integration
- [ ] Extend existing mass upload for promotion products
- [ ] CSV template for promotion product import
- [ ] Validation rules for promotion CSV uploads
- [ ] Error handling and reporting
- [ ] Preview before import functionality

### Import Features
- [ ] SKU-based product matching for promotion assignment
- [ ] Category-based bulk import for promotion assignment
- [ ] Supplier-based bulk import for promotion assignment
- [ ] Catalog-based bulk import for promotion assignment
- [ ] Import with custom discount values per product
- [ ] Bulk promotion assignment via CSV using existing mass upload system
- [ ] Integration with existing supplier and catalog selection in mass upload

---

## Phase 5: Frontend Flash Deals Migration ⏳

### API Migration
- [ ] Update `/api/flash-deals` to use promotions system
- [ ] Replace individual flash deal logic with promotion-based queries
- [ ] Query active promotions for special deals
- [ ] Product filtering by active promotions

### Flash Deals Page Updates
- [ ] Add promotion filtering to `/flash-deals` page
- [ ] Promotion-based product grouping
- [ ] Filter by specific promotion campaigns
- [ ] Promotion name display on deals page

### Product Card Updates
- [ ] Add promotion badges to product cards
- [ ] Display promotion information
- [ ] Promotion-specific styling
- [ ] Mobile-optimized badge design

---

## Phase 6: Analytics & Performance Dashboard ⏳

### Core Analytics
- [ ] Promotion dashboard creation
- [ ] Sales performance metrics per promotion
- [ ] Revenue tracking and reporting
- [ ] Conversion rate analysis
- [ ] Product performance within promotions

### Customer Insights
- [ ] New vs returning customer tracking
- [ ] Customer acquisition through promotions
- [ ] Repeat purchase analysis
- [ ] Geographic performance data

### Reporting Features
- [ ] Exportable performance reports
- [ ] Date range filtering for analytics
- [ ] Comparison between promotions
- [ ] ROI calculation and display

---

## Phase 7: Advanced Management Features ⏳

### Promotion Templates
- [ ] Save successful promotion configurations
- [ ] Template library management
- [ ] Quick promotion creation from templates
- [ ] Template sharing between admin users

### Rollback System
- [ ] Promotion rollback functionality
- [ ] Restore previous product states
- [ ] Rollback history tracking
- [ ] Emergency rollback procedures

### Order Management Integration
- [ ] Flag orders from promotional campaigns
- [ ] Promotion tracking in order details
- [ ] Promotional discount application
- [ ] Order reporting by promotion

---

## Phase 8: SEO & Customer Experience ⏳

### SEO Integration
- [ ] Use existing canonical URL system from product drafts
- [ ] SEO-friendly promotion URLs
- [ ] Meta tags for promotion pages
- [ ] Schema markup for promotional content

### Mobile Optimization
- [ ] Touch-friendly promotion interfaces
- [ ] Mobile-first card designs
- [ ] Responsive promotion management
- [ ] Mobile-optimized product selection

### Customer-Facing Features
- [ ] Countdown timers for promotion end dates
- [ ] Stock urgency indicators
- [ ] Promotion landing pages
- [ ] Social sharing capabilities

---

## Technical Requirements

### Code Reuse Strategy
- [x] Existing home page search component
- [x] Current mass upload system
- [x] Existing draft publishing workflow
- [x] Product drafts SEO canonical URL system
- [x] Admin layout and navigation patterns
- [x] Mobile responsive design patterns

### Database Considerations
- [x] Use camelCase for new promotions table
- [x] Use camelCase for product_drafts extensions (promotionId)
- [x] Maintain existing flash deal columns during transition
- [x] Proper indexing for performance

### Performance Requirements
- [ ] Efficient bulk operations for large product sets
- [ ] Optimized queries for promotion filtering
- [ ] Caching strategy for active promotions
- [ ] Background processing for heavy operations

---

## Quality Assurance Checklist

### Testing Requirements
- [ ] Unit tests for promotion CRUD operations
- [ ] Integration tests for draft system integration
- [ ] End-to-end tests for promotion workflows
- [ ] Mobile responsiveness testing
- [ ] Performance testing with large product sets

### Security Considerations
- [ ] Role-based access control for promotion management
- [ ] Audit trails for promotion changes
- [ ] Input validation and sanitization
- [ ] Rate limiting for bulk operations

### Direct Migration Strategy
- [ ] Replace existing flash deal system with promotions
- [ ] Update all flash deal references to use promotions
- [ ] Remove individual product flash deal columns after migration
- [ ] Test all functionality with promotion-based system

---

## Success Metrics

### Functional Metrics
- [ ] Zero breaking changes to existing functionality
- [ ] All promotion types can be created and managed
- [ ] Bulk operations handle 1000+ products efficiently
- [ ] Mobile interface usability score > 90%

### Performance Metrics
- [ ] Promotion creation time < 30 seconds
- [ ] Bulk product assignment < 2 minutes for 500 products
- [ ] Dashboard load time < 3 seconds
- [ ] Mobile page load time < 2 seconds

### User Experience Metrics
- [ ] Admin can create promotion in < 5 minutes
- [ ] Product selection workflow is intuitive
- [ ] Analytics provide actionable insights
- [ ] Mobile interface matches desktop functionality

---

## Implementation Timeline

**Phase 1-2**: Foundation & Product Management (Week 1-2)
**Phase 3-4**: Automation & CSV Import (Week 3)
**Phase 5-6**: Frontend Migration & Analytics (Week 4)
**Phase 7-8**: Advanced Features & SEO (Week 5)

## Notes
- Maintain existing flash deal system during development
- Regular testing on mobile devices throughout development
- Continuous integration with existing admin patterns
- Documentation updates as features are implemented

---

**Status Legend:**
- ⏳ Not Started
- 🔄 In Progress  
- ✅ Completed
- ❌ Blocked
- 🔍 Testing