# Multi-Supplier Shipping System - End-to-End Testing Guide

## Test Environment Setup

### Database Configuration (Already Completed ✅)
- **Logistics Companies**: PUDO, Courier Guy
- **Shipping Methods**:
  - Locker to Locker (PUDO) - R85 base
  - Locker to Door (PUDO) - R119 base
  - Door to Door (Courier Guy) - R150 base

### Supplier Shipping Configuration (Already Completed ✅)
| Supplier | Shipping Method | Customer Price | Default |
|----------|----------------|----------------|---------|
| blhomeware (ID: 1) | Door to Door | R140 | ✓ |
| DMC Wholesale (ID: 2) | Locker to Locker | R85 | ✓ |
| DMC Wholesale (ID: 2) | Locker to Door | R119 | |
| Fulvic Health (ID: 7) | Door to Door | R150 | ✓ |

---

## Test Scenarios

### 📋 Test 1: Admin Shipping Configuration Access
**Objective**: Verify admin can access and view shipping configuration

**Steps**:
1. Login as admin using ADMIN_LOGIN_USER and ADMIN_LOGIN_PASS
2. Navigate to `/admin/logistics-companies`
3. Navigate to `/admin/shipping-methods`
4. Navigate to `/admin/supplier-shipping`

**Expected Results**:
- ✅ All pages load without errors
- ✅ Logistics companies list shows PUDO and Courier Guy
- ✅ Shipping methods list shows 3 methods with correct pricing
- ✅ Supplier shipping page shows configured suppliers with their methods

---

### 📋 Test 2: Multi-Supplier Cart Analysis
**Objective**: Verify system correctly analyzes multi-supplier orders

**Steps**:
1. Logout (if logged in as admin)
2. Browse products and add items from **different suppliers** to cart:
   - At least 1 product from DMC Wholesale
   - At least 1 product from Fulvic Health OR blhomeware
3. Navigate to checkout page

**Expected Results**:
- ✅ Checkout page displays "Multi-Supplier Shipping" section
- ✅ Each supplier shows as a separate card/section
- ✅ Each supplier shows their configured shipping methods
- ✅ Default shipping method is pre-selected for each supplier
- ✅ Shipping costs display correctly for each supplier

---

### 📋 Test 3: Shipping Method Selection
**Objective**: Verify customers can select different shipping methods per supplier

**Steps**:
1. On checkout page with multi-supplier cart
2. For DMC Wholesale:
   - Verify "Locker to Locker" is selected by default (R85)
   - Change to "Locker to Door" (R119)
   - Verify price updates in supplier card and total
3. For Fulvic Health/blhomeware:
   - Verify "Door to Door" is selected (R140 or R150)

**Expected Results**:
- ✅ Method selection changes are reflected immediately
- ✅ Supplier shipping cost updates correctly
- ✅ Total shipping cost at bottom reflects sum of all suppliers
- ✅ Grand total updates correctly

---

### 📋 Test 4: Shipping Cost Calculation with VAT
**Objective**: Verify shipping costs integrate correctly with VAT calculation

**Steps**:
1. On checkout page with shipping methods selected
2. Review order summary breakdown:
   - Subtotal (products only)
   - Shipping (sum of all supplier shipping costs)
   - VAT (15% of subtotal + shipping)
   - Grand Total

**Expected Results**:
- ✅ Shipping costs are included in VAT calculation base
- ✅ VAT = (Subtotal + Shipping) × 0.15
- ✅ Grand Total = Subtotal + Shipping + VAT
- ✅ All amounts match expected calculations

**Example Calculation**:
```
Products: R1,000
Shipping Supplier 1: R85
Shipping Supplier 2: R150
Subtotal: R1,000
Total Shipping: R235
VAT Base: R1,235
VAT (15%): R185.25
Grand Total: R1,420.25
```

---

### 📋 Test 5: Order Submission Validation
**Objective**: Verify order cannot be submitted without complete shipping selections

**Steps**:
1. On checkout page with multi-supplier cart
2. Try to proceed to payment without selecting a shipping method for one supplier
3. Fill in shipping address
4. Select shipping methods for all suppliers
5. Proceed to payment

**Expected Results**:
- ✅ Cannot proceed if any supplier has no shipping method selected
- ✅ Error message displayed if shipping incomplete
- ✅ Can proceed once all suppliers have methods selected
- ✅ Payment page loads (Note: actual payment only works in production)

---

### 📋 Test 6: Order Confirmation - Multi-Shipment Display
**Objective**: Verify order confirmation shows all shipments

**Steps**:
1. After placing order (or view existing multi-supplier order)
2. View order confirmation page

**Expected Results**:
- ✅ Page shows "Multiple Shipments" heading or indicator
- ✅ Each shipment displays:
  - Supplier name
  - Shipping method name
  - Shipping cost
  - Products included in that shipment
- ✅ Total shipping cost shown
- ✅ Grand total matches checkout amount

---

### 📋 Test 7: Order Detail - Shipment Tracking
**Objective**: Verify order detail page shows shipment information per supplier

**Steps**:
1. Navigate to order history/my orders
2. Click on a multi-supplier order
3. View order detail page

**Expected Results**:
- ✅ Order detail shows "Shipments" section
- ✅ Each shipment card displays:
  - Supplier name
  - Shipping method
  - Delivery status (e.g., "Pending", "Shipped", "Delivered")
  - Tracking number (if available)
  - Shipping cost
  - Products in shipment
- ✅ Can expand/collapse shipment details
- ✅ Overall order status reflects all shipments

---

### 📋 Test 8: Backward Compatibility - Single Supplier Order
**Objective**: Verify legacy single-supplier orders still display correctly

**Steps**:
1. Create a new cart with products from **only one supplier**
2. Proceed to checkout
3. Complete order
4. View order confirmation and order detail

**Expected Results**:
- ✅ Checkout shows standard shipping selection (not multi-supplier UI)
- ✅ Order confirmation shows shipping method and cost
- ✅ Order detail shows standard layout
- ✅ No errors or broken displays
- ✅ System gracefully handles both new and legacy formats

---

### 📋 Test 9: Admin Order Management
**Objective**: Verify admin can view and manage shipments

**Steps**:
1. Login as admin
2. Navigate to Orders page
3. View a multi-supplier order
4. Check if admin can:
   - See all shipments
   - Update shipment status
   - Add tracking numbers
   - View supplier information

**Expected Results**:
- ✅ Admin sees complete shipment breakdown
- ✅ Can manage each shipment independently
- ✅ Changes reflect in customer view

---

## Test Data Summary

### Products Available for Testing
- **DMC Wholesale**: Pet products, garden tools, camping gear (many products available)
- **Fulvic Health**: Health products (check product catalog)
- **blhomeware**: Kitchen/homeware (check product catalog)

### Admin Credentials
- Username: `ADMIN_LOGIN_USER` (from Replit secrets)
- Password: `ADMIN_LOGIN_PASS` (from Replit secrets)

### Known Limitations
⚠️ **Payment Gateway**: Only works in production (heartcart.shop), not in development
- In development, you can test up to the payment page
- Actual payment processing must be tested in production

---

## Critical Verification Points

### ✅ Multi-Supplier Flow Must Work
1. Cart analysis correctly identifies multiple suppliers
2. Each supplier shows their configured methods
3. Customer can select different methods per supplier
4. Costs calculate correctly and sum properly
5. Order submission creates multiple shipments
6. Confirmation/detail pages display all shipments

### ✅ Backward Compatibility Must Work
1. Single-supplier orders use standard flow
2. Legacy order data displays correctly
3. No breaking changes to existing functionality

### ✅ Data Consistency
1. Supplier costs hidden from customers
2. Customer sees consistent pricing
3. VAT calculation includes shipping
4. All totals match across checkout → confirmation → detail

---

## Bug Reporting Template

If you encounter issues, document:
```
**Issue**: [Brief description]
**Test**: [Which test scenario]
**Steps**: [Exact steps to reproduce]
**Expected**: [What should happen]
**Actual**: [What actually happened]
**Screenshot**: [If applicable]
**Browser Console**: [Any errors]
**Network Tab**: [Failed API calls]
```

---

## Success Criteria

All tests must pass for the shipping system to be considered production-ready:
- [ ] Test 1: Admin configuration access ✅
- [ ] Test 2: Multi-supplier cart analysis
- [ ] Test 3: Shipping method selection
- [ ] Test 4: VAT calculation
- [ ] Test 5: Order submission validation
- [ ] Test 6: Order confirmation display
- [ ] Test 7: Order detail tracking
- [ ] Test 8: Backward compatibility
- [ ] Test 9: Admin order management
