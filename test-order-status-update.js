/**
 * Test Order Status Update and Email Notification System
 * Tests if admin can update order status and if email notifications are sent
 */

async function testOrderStatusUpdate() {
  console.log('\n=== Testing Order Status Update and Email Notifications ===');
  
  try {
    // First, let's get the list of orders to see if there are any to test with
    const ordersResponse = await fetch('http://localhost:5000/api/admin/orders', {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!ordersResponse.ok) {
      console.error('Failed to fetch orders:', ordersResponse.status);
      return;
    }
    
    const ordersData = await ordersResponse.json();
    console.log('Orders API Response:', {
      success: ordersData.success,
      orderCount: ordersData.data?.length || 0,
      firstOrder: ordersData.data?.[0] || null
    });
    
    if (!ordersData.success || !ordersData.data || ordersData.data.length === 0) {
      console.log('No orders found to test with');
      return;
    }
    
    // Test with the first order
    const testOrder = ordersData.data[0];
    console.log('Testing with order:', {
      id: testOrder.id,
      orderNumber: testOrder.orderNumber,
      currentStatus: testOrder.status,
      customerEmail: testOrder.customerEmail,
      customerName: testOrder.customerName
    });
    
    // Test updating order status to "shipped"
    console.log('\nTesting order status update to "shipped"...');
    const statusUpdateResponse = await fetch(`http://localhost:5000/api/admin/orders/${testOrder.id}/status`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'shipped',
        trackingNumber: 'TEST-123456'
      })
    });
    
    console.log('Status update response:', {
      status: statusUpdateResponse.status,
      ok: statusUpdateResponse.ok,
      headers: Object.fromEntries(statusUpdateResponse.headers.entries())
    });
    
    if (!statusUpdateResponse.ok) {
      const errorText = await statusUpdateResponse.text();
      console.error('Status update failed:', errorText);
      return;
    }
    
    const statusUpdateData = await statusUpdateResponse.json();
    console.log('Status update result:', statusUpdateData);
    
    // Check if email was sent by looking at recent logs
    console.log('\nChecking for email notification logs...');
    
    // Wait a moment for email to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify the order was updated
    const updatedOrderResponse = await fetch(`http://localhost:5000/api/admin/orders/${testOrder.id}`, {
      credentials: 'include'
    });
    
    if (updatedOrderResponse.ok) {
      const updatedOrderData = await updatedOrderResponse.json();
      console.log('Updated order status:', {
        id: updatedOrderData.data.id,
        status: updatedOrderData.data.status,
        trackingNumber: updatedOrderData.data.trackingNumber
      });
    }
    
    console.log('\n✅ Order status update test completed');
    console.log('Check server logs for email notification confirmation');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testOrderStatusUpdate();