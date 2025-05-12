# Product Wizard Deployment Plan

This document outlines the strategy for deploying the new product wizard and gradually phasing out the legacy product management interface.

## 1. Phased Deployment Strategy

### Phase 1: Parallel System (Current)
- Deploy the new wizard as an alternative path alongside the existing product management
- Make accessible via a new route `/admin/product-wizard-new`
- Update admin navigation to include both options
- Add a "Try New Experience" button on the existing product creation page

### Phase 2: Feature Parity (2 Weeks)
- Ensure all features from legacy system are implemented in the new wizard
- Complete any missing functionality identified during parallel usage
- Add tooltips and contextual help throughout the new interface
- Conduct user acceptance testing with merchant partners

### Phase 3: Default Experience (4 Weeks)
- Make the new wizard the default experience for product creation
- Add feature flags to control rollout percentage
- Implement an "opt-out" option to temporarily return to legacy interface
- Collect feedback and metrics on usage patterns

### Phase 4: Complete Migration (8 Weeks)
- Remove access to legacy product creation
- Maintain redirects from old routes to new wizard
- Complete documentation updates
- Archive legacy code (marked as deprecated)

## 2. Feature Flag Implementation

The deployment will use feature flags to control the rollout:

```typescript
// Feature flags definition
export const PRODUCT_WIZARD_FLAGS = {
  ENABLED: 'product_wizard_enabled', // Master flag to enable/disable the wizard
  DEFAULT_EXPERIENCE: 'product_wizard_default', // When true, makes wizard the default
  PERCENTAGE_ROLLOUT: 'product_wizard_rollout_percentage', // Controls gradual rollout (0-100)
};

// Feature flag check function
export function isFeatureEnabled(flag: string, userId?: number): boolean {
  // Implementation details for checking flags
}
```

## 3. Database Migration Plan

Database migrations have already been implemented through:

1. Addition of product_drafts table
2. New columns for attribute relationships in products table
3. Enhanced metadata storage for products

Future migrations will be applied through Drizzle ORM using the existing schema in `shared/schema.ts` and pushed using `npm run db:push`.

## 4. Legacy Code Handling

Legacy components will be handled as follows:

1. Mark files with deprecated JSDoc tags:
```typescript
/**
 * @deprecated Use ProductWizard component instead
 */
```

2. Add console warnings:
```typescript
console.warn('ProductCreate is deprecated, use ProductWizard instead');
```

3. Create redirects from legacy routes:
```typescript
// In routes.ts
app.get('/admin/products/create', (req, res) => {
  res.redirect('/admin/product-wizard-new');
});
```

## 5. Rollback Procedures

In case of critical issues, the following rollback procedures are established:

1. Disable the feature flag `product_wizard_enabled` to revert to legacy system
2. If database issues occur, run the rollback migration script
3. For major defects, deploy an emergency hotfix from the pre-deployment branch
4. Maintain a backup of the legacy code until complete migration is confirmed

## 6. Metrics and Monitoring

The following metrics will be tracked during deployment:

- Product creation success rate (new vs. legacy)
- Average time to complete product creation
- Form abandonment rate
- Error rates by wizard step
- User feedback and satisfaction scores

## 7. User Training and Documentation

- Create video walkthroughs of the new wizard
- Update help center documentation
- Provide tooltips and guided tours within the interface
- Host webinar sessions for merchant partners during transition