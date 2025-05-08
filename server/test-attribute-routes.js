/**
 * Test script for attribute API routes
 * Run this manually to test the implementation of attribute routes
 * 
 * Usage: node server/test-attribute-routes.js
 */

import fetch from 'node-fetch';

// Base URL for API requests
const BASE_URL = 'http://localhost:5000';

// Helper function to make API requests
async function makeRequest(url, method = 'GET', body = null, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const options = {
    method,
    headers,
  };
  
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${BASE_URL}${url}`, options);
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return {
        status: response.status,
        data,
        success: response.ok,
      };
    } else {
      const text = await response.text();
      return {
        status: response.status,
        data: text,
        success: response.ok,
      };
    }
  } catch (error) {
    console.error(`Error making request to ${url}:`, error);
    return {
      status: 500,
      data: error.message,
      success: false,
    };
  }
}

// Test all attribute endpoints
async function testAttributeRoutes() {
  console.log('\n========== TESTING ATTRIBUTE ROUTES ==========\n');
  
  try {
    // Test GET /api/attributes (should return all global attributes)
    console.log('Testing GET /api/attributes');
    const getAttributesResponse = await makeRequest('/api/attributes');
    console.log(`Status: ${getAttributesResponse.status}`);
    console.log('Attributes:', getAttributesResponse.data);
    
    // Create a new attribute
    console.log('\nTesting POST /api/attributes');
    const newAttribute = {
      name: 'test_color',
      displayName: 'Test Color',
      description: 'Test color attribute for testing API',
      attributeType: 'color',
      isFilterable: true,
      isSwatch: true
    };
    
    const createAttributeResponse = await makeRequest('/api/attributes', 'POST', newAttribute);
    console.log(`Status: ${createAttributeResponse.status}`);
    
    if (createAttributeResponse.success) {
      console.log('Created attribute:', createAttributeResponse.data);
      
      const attributeId = createAttributeResponse.data.id;
      
      // Get the created attribute
      console.log(`\nTesting GET /api/attributes/${attributeId}`);
      const getAttributeResponse = await makeRequest(`/api/attributes/${attributeId}`);
      console.log(`Status: ${getAttributeResponse.status}`);
      console.log('Retrieved attribute:', getAttributeResponse.data);
      
      // Update the attribute
      console.log(`\nTesting PUT /api/attributes/${attributeId}`);
      const updateData = {
        displayName: 'Updated Test Color',
        description: 'Updated description for testing'
      };
      
      const updateAttributeResponse = await makeRequest(`/api/attributes/${attributeId}`, 'PUT', updateData);
      console.log(`Status: ${updateAttributeResponse.status}`);
      console.log('Updated attribute:', updateAttributeResponse.data);
      
      // Create attribute options
      console.log(`\nTesting POST /api/attributes/${attributeId}/options`);
      const newOption = {
        value: 'red',
        displayValue: 'Red',
        metadata: { hexCode: '#FF0000' }
      };
      
      const createOptionResponse = await makeRequest(`/api/attributes/${attributeId}/options`, 'POST', newOption);
      console.log(`Status: ${createOptionResponse.status}`);
      
      if (createOptionResponse.success) {
        console.log('Created option:', createOptionResponse.data);
        
        const optionId = createOptionResponse.data.id;
        
        // Get the attribute options
        console.log(`\nTesting GET /api/attributes/${attributeId}/options`);
        const getOptionsResponse = await makeRequest(`/api/attributes/${attributeId}/options`);
        console.log(`Status: ${getOptionsResponse.status}`);
        console.log('Retrieved options:', getOptionsResponse.data);
        
        // Update the option
        console.log(`\nTesting PUT /api/attributes/${attributeId}/options/${optionId}`);
        const updateOptionData = {
          displayValue: 'Bright Red',
          metadata: { hexCode: '#FF0000', brightness: 'high' }
        };
        
        const updateOptionResponse = await makeRequest(`/api/attributes/${attributeId}/options/${optionId}`, 'PUT', updateOptionData);
        console.log(`Status: ${updateOptionResponse.status}`);
        console.log('Updated option:', updateOptionResponse.data);
        
        // Reorder options (would need more options to properly test)
        console.log(`\nTesting POST /api/attributes/${attributeId}/options/reorder`);
        const reorderData = {
          optionIds: [optionId]
        };
        
        const reorderResponse = await makeRequest(`/api/attributes/${attributeId}/options/reorder`, 'POST', reorderData);
        console.log(`Status: ${reorderResponse.status}`);
        console.log('Reorder result:', reorderResponse.data);
        
        // Test catalog attributes
        // First, we need a catalog ID - in a real test would get this from the database
        // For this test script, just show the structure
        const catalogId = 1; // Replace with a real catalog ID
        
        console.log(`\nTesting catalog attribute routes with catalogId=${catalogId}`)
        console.log('Route: GET /api/catalogs/:catalogId/attributes');
        console.log('Route: POST /api/catalogs/:catalogId/attributes');
        console.log('Route: PUT /api/catalogs/:catalogId/attributes/:id');
        console.log('Route: DELETE /api/catalogs/:catalogId/attributes/:id');
        console.log('Route: GET /api/catalogs/:catalogId/attributes/:attributeId/options');
        console.log('Route: POST /api/catalogs/:catalogId/attributes/:attributeId/options');
        
        // Test category attributes
        const categoryId = 1; // Replace with a real category ID
        
        console.log(`\nTesting category attribute routes with categoryId=${categoryId}`)
        console.log('Route: GET /api/categories/:categoryId/attributes');
        console.log('Route: POST /api/categories/:categoryId/attributes');
        console.log('Route: PUT /api/categories/:categoryId/attributes/:id');
        console.log('Route: DELETE /api/categories/:categoryId/attributes/:id');
        console.log('Route: GET /api/categories/:categoryId/attributes/:attributeId/options');
        console.log('Route: POST /api/categories/:categoryId/attributes/:attributeId/options');
        
        // Test product attributes
        const productId = 1; // Replace with a real product ID
        
        console.log(`\nTesting product attribute routes with productId=${productId}`)
        console.log('Route: GET /api/products/:productId/attributes');
        console.log('Route: POST /api/products/:productId/attributes');
        console.log('Route: PUT /api/products/:productId/attributes/:id');
        console.log('Route: DELETE /api/products/:productId/attributes/:id');
        console.log('Route: GET /api/products/:productId/attributes/:attributeId/options');
        console.log('Route: POST /api/products/:productId/attributes/:attributeId/options');
        console.log('Route: GET /api/products/:productId/attribute-values');
        console.log('Route: POST /api/products/:productId/attribute-values');
        
        // Clean up: Delete the option and attribute if this is not a real test environment
        // Uncomment these lines to clean up after testing
        /*
        console.log(`\nCleaning up: DELETE /api/attributes/${attributeId}/options/${optionId}`);
        const deleteOptionResponse = await makeRequest(`/api/attributes/${attributeId}/options/${optionId}`, 'DELETE');
        console.log(`Status: ${deleteOptionResponse.status}`);
        
        console.log(`\nCleaning up: DELETE /api/attributes/${attributeId}`);
        const deleteAttributeResponse = await makeRequest(`/api/attributes/${attributeId}`, 'DELETE');
        console.log(`Status: ${deleteAttributeResponse.status}`);
        */
      }
    }
    
    console.log('\n========== ATTRIBUTE ROUTES TEST COMPLETE ==========\n');
  } catch (error) {
    console.error('Error testing attribute routes:', error);
  }
}

// Run the tests
testAttributeRoutes().catch(console.error);

// Add type: module flag to run this script
// Or run with: node --experimental-modules server/test-attribute-routes.js