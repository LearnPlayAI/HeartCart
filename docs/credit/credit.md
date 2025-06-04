# Customer Credit System Implementation Guide

## Overview
Implementation of a comprehensive customer credit system for TeeMeYou e-commerce platform, including supplier order management and automatic credit issuance for unavailable products.

## Implementation Progress Tracker

### Phase 1: Database Schema Setup
- [ ] 1.1 Create customerCredits table
- [ ] 1.2 Create creditTransactions table  
- [ ] 1.3 Create orderItemSupplierStatus table
- [ ] 1.4 Update products table (add costPrice, supplierAvailable)
- [ ] 1.5 Update orders table (add creditUsed, remainingBalance)
- [ ] 1.6 Update orderItems table if needed
- [ ] 1.7 Run database migrations

### Phase 2: Backend API Development
- [ ] 2.1 Create credit management service
- [ ] 2.2 Implement supplier URL validation service
- [ ] 2.3 Create credit transaction handlers
- [ ] 2.4 Add credit routes to server
- [ ] 2.5 Update order processing logic
- [ ] 2.6 Add supplier status management APIs
- [ ] 2.7 Update checkout process for credit usage

### Phase 3: Admin Interface Enhancements
- [ ] 3.1 Update admin order detail page (/admin/orders/:id)
- [ ] 3.2 Add cost price display to order items
- [ ] 3.3 Add supplier order checkboxes
- [ ] 3.4 Add admin notes functionality
- [ ] 3.5 Add bulk actions for unavailable items
- [ ] 3.6 Add customer credit management interface

### Phase 4: Customer Interface Updates
- [ ] 4.1 Add credit display to top navigation bar
- [ ] 4.2 Create customer credit history page
- [ ] 4.3 Update checkout process for credit application
- [ ] 4.4 Add order cancellation for unpaid orders
- [ ] 4.5 Add supplier URL validation on add-to-cart

### Phase 5: Notification & Communication
- [ ] 5.1 Implement credit notification system
- [ ] 5.2 Add email templates for credit notifications
- [ ] 5.3 Add toast notifications for supplier URL failures
- [ ] 5.4 Update order status communications

### Phase 6: Testing & Validation
- [ ] 6.1 Test credit earning workflows
- [ ] 6.2 Test credit usage during checkout
- [ ] 6.3 Test supplier URL validation
- [ ] 6.4 Test admin supplier order management
- [ ] 6.5 Test order cancellation rules

## Technical Requirements

### Database Schema

#### New Tables

**customerCredits**
```sql
CREATE TABLE "customerCredits" (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL REFERENCES users(id),
    "totalCreditAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "availableCreditAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL
);
```

**creditTransactions**
```sql
CREATE TABLE "creditTransactions" (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL REFERENCES users(id),
    "orderId" INTEGER REFERENCES orders(id),
    "transactionType" TEXT NOT NULL CHECK ("transactionType" IN ('earned', 'used', 'refund')),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    "createdAt" TEXT NOT NULL
);
```

**orderItemSupplierStatus**
```sql
CREATE TABLE "orderItemSupplierStatus" (
    id SERIAL PRIMARY KEY,
    "orderItemId" INTEGER NOT NULL REFERENCES "orderItems"(id),
    "orderId" INTEGER NOT NULL REFERENCES orders(id),
    "productId" INTEGER NOT NULL REFERENCES products(id),
    "supplierOrderPlaced" BOOLEAN NOT NULL DEFAULT false,
    "supplierOrderDate" TEXT,
    "supplierStatus" TEXT NOT NULL DEFAULT 'pending' CHECK ("supplierStatus" IN ('pending', 'ordered', 'backordered', 'unavailable', 'received')),
    "adminNotes" TEXT,
    "customerNotified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL
);
```

#### Table Updates

**products table additions**
```sql
ALTER TABLE products ADD COLUMN "costPrice" DECIMAL(10,2);
ALTER TABLE products ADD COLUMN "supplierAvailable" BOOLEAN NOT NULL DEFAULT true;
```

**orders table additions**
```sql
ALTER TABLE orders ADD COLUMN "creditUsed" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN "remainingBalance" DECIMAL(10,2);
```

### API Endpoints

#### Credit Management
- `GET /api/credits` - Get customer credit balance and transactions
- `POST /api/admin/credits/:userId/adjust` - Admin credit adjustment
- `POST /api/checkout/apply-credit` - Apply credit during checkout

#### Supplier Management
- `POST /api/admin/orders/:id/supplier-status` - Update supplier order status
- `POST /api/products/check-supplier-url` - Validate supplier URL
- `GET /api/admin/supplier-orders` - Admin supplier order overview

#### Order Management
- `POST /api/orders/:id/cancel` - Cancel unpaid order
- `GET /api/orders/:id/cancellable` - Check if order can be cancelled

### Business Logic Rules

#### Credit Earning
1. Unavailable items from paid orders automatically create credits
2. Returned items create credits (future feature)
3. Credits equal the amount paid for unavailable/returned items

#### Credit Usage
1. Credits applied during checkout reduce order total
2. If credit covers full amount, order marked as paid automatically
3. Partial credit usage requires payment for remaining balance
4. No limits on credit usage amount

#### Order Cancellation
1. Only unpaid orders can be cancelled
2. Paid orders cannot be cancelled under any circumstances
3. Cancelled orders restore inventory and remove cart items

#### Supplier URL Validation
1. Check product_drafts.supplierUrl when adding to cart
2. 404 response marks product as inactive
3. Show red toast error to customer
4. Admin notified of inactive products

## Implementation Order

### Logical Implementation Sequence

1. **Database Foundation** - Create all tables and migrations first
2. **Core Services** - Build credit management and supplier validation services
3. **API Layer** - Implement all required endpoints
4. **Admin Interface** - Build supplier order management UI
5. **Customer Interface** - Add credit display and usage features
6. **Integration** - Connect all systems (checkout, notifications, etc.)
7. **Validation** - Test all workflows end-to-end

## Key Components

### Credit Service
- Track customer credit balances
- Record all credit transactions
- Handle automatic credit creation
- Manage credit usage during checkout

### Supplier Status Service  
- Validate supplier URLs
- Manage product availability
- Track admin order actions
- Handle cross-order impacts

### Notification Service
- Email notifications for credits
- Toast notifications for errors
- Admin alerts for supplier issues
- Order status updates

### UI Components
- Credit balance display in header
- Credit transaction history page
- Admin supplier order management
- Enhanced checkout with credit options

## Success Criteria

- Customers can see and use credits seamlessly
- Admins can efficiently manage supplier orders
- Automatic credit creation for unavailable items
- Real-time supplier URL validation
- Proper order cancellation rules enforcement
- Clear audit trail for all credit transactions