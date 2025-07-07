/**
 * Test Order Items Debug Script
 * Tests the order creation flow to understand why order items aren't being inserted
 */

const { storage } = await import('./server/storage.js');

async function testOrderItemsDebug() {
  console.log('Starting order items debug test...');

  // Test order data structure matching YoCo webhook format
  const testOrder = {
    userId: 8, // User Jan Coetzee
    customerName: 'Jan Coetzee',
    customerEmail: 'jan@example.com', 
    customerPhone: '+27712063084',
    shippingAddress: '123 Test Street',
    shippingCity: 'Cape Town',
    shippingPostalCode: '8001',
    shippingMethod: 'pudo',
    paymentMethod: 'card',
    paymentStatus: 'payment_received',
    status: 'confirmed',
    subtotalAmount: 99.00,
    totalAmount: 99.00,
    vatAmount: 0.00,
    vatRate: 0.00,
    shippingCost: 0.00,
    customerNotes: 'Test order for debugging',
    yocoCheckoutId: 'test-checkout-123'
  };

  // Test order items data structure matching YoCo webhook format
  const testOrderItems = [
    {
      productId: 540, // Wallet Ninja product
      productName: 'Wallet Ninja: 18-in-1 Multi-Tool Card - Pocket-Sized Powerhouse',
      quantity: 1,
      unitPrice: 99.00,
      totalPrice: 99.00,
      selectedAttributes: {},
      productSku: 'DM7096',
      productImageUrl: null,
      attributeDisplayText: null
    }
  ];

  console.log('Test data prepared:', {
    orderFields: Object.keys(testOrder),
    orderItemsCount: testOrderItems.length,
    orderItemsData: testOrderItems
  });

  try {
    console.log('Calling storage.createOrder...');
    const newOrder = await storage.createOrder(testOrder, testOrderItems);
    
    console.log('Order created successfully:', {
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      status: newOrder.status
    });

    // Check if order items were actually created
    const createdOrderItems = await storage.getOrderItems(newOrder.id);
    console.log('Order items check:', {
      orderId: newOrder.id,
      expectedItems: testOrderItems.length,
      actualItems: createdOrderItems.length,
      itemsMatch: createdOrderItems.length === testOrderItems.length
    });

    if (createdOrderItems.length === 0) {
      console.error('CRITICAL ISSUE: Order created but no order items found in database!');
    } else {
      console.log('SUCCESS: Order items created correctly');
    }

    return {
      success: true,
      order: newOrder,
      itemsCreated: createdOrderItems.length
    };

  } catch (error) {
    console.error('Error creating test order:', {
      error: error,
      errorMessage: error.message,
      errorStack: error.stack
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testOrderItemsDebug()
  .then(result => {
    console.log('\n=== TEST RESULTS ===');
    console.log(result);
  })
  .catch(error => {
    console.error('\n=== TEST FAILED ===');
    console.error(error);
  });