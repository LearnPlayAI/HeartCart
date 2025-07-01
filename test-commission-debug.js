// Test commission calculation with detailed debugging
import { storage } from './server/storage.ts';

async function debugCommissionCalculation() {
  console.log('🔍 Debugging Commission Calculation System...\n');
  
  try {
    const orderId = 39;
    const orderNumber = 'TMY-39-20250701';
    
    console.log(`📋 Testing Order ID: ${orderId} (${orderNumber})`);
    
    // Step 1: Get order details
    console.log('\n1️⃣ Getting order details...');
    const order = await storage.getOrderById(orderId);
    if (!order) {
      console.log('❌ Order not found');
      return;
    }
    console.log(`✅ Order found: Status=${order.status}, UserId=${order.userId}, Total=${order.totalAmount}`);
    
    // Step 2: Get user details
    console.log('\n2️⃣ Getting user details...');
    const user = await storage.getUserById(order.userId);
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    console.log(`✅ User found: ID=${user.id}, Email=${user.email}, RepCode=${user.repCode}`);
    
    if (!user.repCode) {
      console.log('❌ User has no rep code - commission not applicable');
      return;
    }
    
    // Step 3: Get sales rep details
    console.log('\n3️⃣ Getting sales rep details...');
    const rep = await storage.getSalesRepByCode(user.repCode);
    if (!rep) {
      console.log('❌ Sales rep not found');
      return;
    }
    console.log(`✅ Sales rep found: ID=${rep.id}, Name=${rep.firstName} ${rep.lastName}, Rate=${rep.commissionRate}`);
    
    // Step 4: Get order items
    console.log('\n4️⃣ Getting order items...');
    const orderItems = await storage.getOrderItems(orderId);
    console.log(`✅ Found ${orderItems.length} order items`);
    
    let totalCommission = 0;
    let totalProfitAmount = 0;
    let totalCustomerPaidAmount = 0;
    let totalCostAmount = 0;
    
    // Step 5: Calculate commission for each item
    console.log('\n5️⃣ Calculating commission for each item...');
    for (const item of orderItems) {
      console.log(`\n📦 Item ${item.id}: ProductID=${item.productId}, Quantity=${item.quantity}, UnitPrice=${item.unitPrice}`);
      
      const product = await storage.getProductById(item.productId);
      if (!product) {
        console.log(`❌ Product ${item.productId} not found`);
        continue;
      }
      
      if (!product.costPrice) {
        console.log(`❌ Product ${item.productId} has no cost price`);
        continue;
      }
      
      const customerPaidPrice = item.unitPrice;
      const costPrice = parseFloat(product.costPrice.toString());
      const itemTotalCustomerPaid = customerPaidPrice * item.quantity;
      const itemTotalCost = costPrice * item.quantity;
      
      totalCustomerPaidAmount += itemTotalCustomerPaid;
      totalCostAmount += itemTotalCost;
      
      console.log(`   💰 Customer paid: R${customerPaidPrice} x ${item.quantity} = R${itemTotalCustomerPaid}`);
      console.log(`   💸 Cost price: R${costPrice} x ${item.quantity} = R${itemTotalCost}`);
      
      if (customerPaidPrice > costPrice) {
        const profitMargin = (customerPaidPrice - costPrice) * item.quantity;
        const itemCommission = profitMargin * 0.03; // 3% commission
        totalCommission += itemCommission;
        totalProfitAmount += profitMargin;
        
        console.log(`   📈 Profit margin: R${profitMargin.toFixed(2)}`);
        console.log(`   💎 Item commission (3%): R${itemCommission.toFixed(3)}`);
      } else {
        console.log(`   ⚠️ No profit - customer paid less than or equal to cost`);
      }
    }
    
    console.log('\n6️⃣ Commission calculation summary:');
    console.log(`   💰 Total customer paid: R${totalCustomerPaidAmount.toFixed(2)}`);
    console.log(`   💸 Total cost: R${totalCostAmount.toFixed(2)}`);
    console.log(`   📈 Total profit: R${totalProfitAmount.toFixed(2)}`);
    console.log(`   💎 Total commission (3%): R${totalCommission.toFixed(3)}`);
    
    if (totalCommission > 0) {
      console.log('\n7️⃣ Creating commission record...');
      
      const commissionData = {
        repId: rep.id,
        orderId: orderId,
        userId: order.userId,
        commissionAmount: totalCommission.toString(),
        orderAmount: order.totalAmount.toString(),
        commissionRate: "0.03",
        totalProfitAmount: totalProfitAmount.toString(),
        totalCustomerPaidAmount: totalCustomerPaidAmount.toString(),
        totalCostAmount: totalCostAmount.toString(),
        status: 'earned',
        notes: `Debug test commission for delivered order ${order.orderNumber}`
      };
      
      console.log('   📝 Commission data to insert:', JSON.stringify(commissionData, null, 2));
      
      try {
        const newCommission = await storage.createRepCommission(commissionData);
        console.log('   ✅ Commission created successfully!');
        console.log(`   🆔 New commission ID: ${newCommission.id}`);
        
        // Verify it was saved
        const allCommissions = await storage.getRepCommissions(rep.id);
        console.log(`   ✅ Rep now has ${allCommissions.length} total commissions`);
        
      } catch (error) {
        console.log('   ❌ Failed to create commission:', error.message);
        console.log('   🔍 Full error:', error);
      }
    } else {
      console.log('\n❌ No commission to create - total commission is 0');
    }
    
    console.log('\n🎯 Commission debugging complete!');
    
  } catch (error) {
    console.error('❌ Error during commission debugging:', error);
  }
  
  process.exit(0);
}

debugCommissionCalculation();