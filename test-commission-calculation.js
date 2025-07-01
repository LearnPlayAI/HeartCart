// Test script to verify the corrected commission calculation
import { db } from './server/db.js';
import { orders, orderItems, repCommissions, users, salesReps, products } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function testCommissionCalculation() {
  try {
    console.log('Testing commission calculation for order 39...');
    
    // Get order details
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, 39));
    
    if (!order) {
      console.log('Order 39 not found');
      return;
    }
    
    console.log('Order found:', {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      userId: order.userId,
      totalAmount: order.totalAmount
    });
    
    // Get user with rep code
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, order.userId));
    
    console.log('User found:', {
      id: user.id,
      email: user.email,
      repCode: user.repCode
    });
    
    if (!user.repCode) {
      console.log('User has no rep code');
      return;
    }
    
    // Get sales rep
    const [rep] = await db
      .select()
      .from(salesReps)
      .where(eq(salesReps.repCode, user.repCode));
    
    console.log('Sales rep found:', {
      id: rep.id,
      firstName: rep.firstName,
      lastName: rep.lastName,
      repCode: rep.repCode,
      commissionRate: rep.commissionRate
    });
    
    // Get order items
    const orderItemsList = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    
    console.log('Order items found:', orderItemsList.length);
    
    // Calculate commission using corrected logic
    let totalCommission = 0;
    let totalProfitAmount = 0;
    let totalCustomerPaidAmount = 0;
    let totalCostAmount = 0;
    
    // Convert rep commission rate to decimal (1.0000 = 1%)
    const commissionRate = parseFloat(rep.commissionRate.toString()) / 100;
    console.log('Commission rate converted:', commissionRate, '(' + (commissionRate * 100) + '%)');

    for (const item of orderItemsList) {
      // Get product cost price
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, item.productId));
      
      if (product && product.costPrice) {
        const customerPaidPrice = item.unitPrice;
        const costPrice = parseFloat(product.costPrice.toString());
        const itemTotalCustomerPaid = customerPaidPrice * item.quantity;
        const itemTotalCost = costPrice * item.quantity;
        
        totalCustomerPaidAmount += itemTotalCustomerPaid;
        totalCostAmount += itemTotalCost;
        
        console.log(`Item ${item.productId}:`, {
          productName: product.name,
          customerPaidPrice,
          costPrice,
          quantity: item.quantity,
          itemTotalCustomerPaid,
          itemTotalCost
        });
        
        if (customerPaidPrice > costPrice) {
          const profitMargin = (customerPaidPrice - costPrice) * item.quantity;
          const itemCommission = profitMargin * commissionRate; // Use actual rep commission rate
          totalCommission += itemCommission;
          totalProfitAmount += profitMargin;
          
          console.log(`Commission calculation:`, {
            profitMargin,
            commissionRate,
            itemCommission
          });
        }
      }
    }
    
    console.log('\nFinal calculation results:');
    console.log('Total Customer Paid Amount:', totalCustomerPaidAmount);
    console.log('Total Cost Amount:', totalCostAmount);
    console.log('Total Profit Amount:', totalProfitAmount);
    console.log('Commission Rate:', commissionRate);
    console.log('Total Commission (CORRECTED):', totalCommission);
    console.log('Expected commission (R27.80 × 1%):', 27.80 * 0.01);
    
    // Manually create the commission record with correct calculation
    if (totalCommission > 0) {
      const commissionData = {
        repId: rep.id,
        orderId: order.id,
        userId: order.userId,
        commissionAmount: totalCommission.toString(),
        orderAmount: order.totalAmount.toString(),
        commissionRate: commissionRate.toString(),
        totalProfitAmount: totalProfitAmount.toString(),
        totalCustomerPaidAmount: totalCustomerPaidAmount.toString(),
        totalCostAmount: totalCostAmount.toString(),
        status: 'earned',
        notes: `Commission for delivered order ${order.orderNumber} (CORRECTED CALCULATION)`
      };
      
      console.log('\nCommission data to insert:', commissionData);
      
      const [newCommission] = await db
        .insert(repCommissions)
        .values(commissionData)
        .returning();
      
      console.log('New commission record created:', newCommission);
    }
    
  } catch (error) {
    console.error('Error in commission calculation test:', error);
  }
}

testCommissionCalculation();