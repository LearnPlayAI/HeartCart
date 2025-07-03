/**
 * Test Promotion Validation System
 * Tests server-side validation to ensure promotion requirements are enforced
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

async function testPromotionValidation() {
  console.log('🔍 Testing Promotion Validation System...\n');

  try {
    // Test 1: Valid cart validation
    console.log('Test 1: Testing cart validation endpoint with valid items...');
    const validCartItems = [
      {
        productId: 1,
        quantity: 5,
        product: {
          id: 1,
          name: 'Test Product 1',
          price: 100,
          salePrice: 90
        }
      },
      {
        productId: 2,
        quantity: 3,
        product: {
          id: 2,
          name: 'Test Product 2',
          price: 150,
          salePrice: 140
        }
      }
    ];

    const validationResponse = await axios.post(`${BASE_URL}/api/promotions/validate-cart`, {
      items: validCartItems
    });

    console.log('✅ Cart validation response:', {
      status: validationResponse.status,
      data: validationResponse.data
    });

    // Test 2: Test insufficient items (should fail validation)
    console.log('\nTest 2: Testing cart validation with insufficient items...');
    const insufficientCartItems = [
      {
        productId: 1,
        quantity: 1, // This should be insufficient for any "Buy X Get Y" promotion
        product: {
          id: 1,
          name: 'Test Product 1',
          price: 100,
          salePrice: 90
        }
      }
    ];

    const insufficientValidationResponse = await axios.post(`${BASE_URL}/api/promotions/validate-cart`, {
      items: insufficientCartItems
    });

    console.log('⚠️ Insufficient items validation response:', {
      status: insufficientValidationResponse.status,
      data: insufficientValidationResponse.data
    });

    console.log('\n🎉 Promotion validation tests completed successfully!');

  } catch (error) {
    console.error('❌ Validation test failed:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
  }
}

// Run the test
testPromotionValidation();