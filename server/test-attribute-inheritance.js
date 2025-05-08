/**
 * Test script for attribute inheritance between different levels
 * Run this manually to test the implementation of attribute inheritance
 * 
 * Usage: node server/test-attribute-inheritance.js
 */

const fetch = require('node-fetch');

// Base URL for API requests
const BASE_URL = 'http://localhost:5000';

// Helper function to make API requests
async function makeRequest(url, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
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

/**
 * Test the attribute inheritance functionality
 * This test creates global, catalog, category, and product level attributes
 * and tests the inheritance relationship between them
 */
async function testAttributeInheritance() {
  console.log('\n========== TESTING ATTRIBUTE INHERITANCE ==========\n');
  
  try {
    // Step 1: Create a global attribute
    console.log('Step 1: Creating a global attribute (Size)');
    const globalAttribute = {
      name: 'test_size',
      displayName: 'Size',
      description: 'Product size attribute',
      attributeType: 'select',
      isFilterable: true,
      isRequired: true
    };
    
    const createGlobalResponse = await makeRequest('/api/attributes', 'POST', globalAttribute);
    
    if (!createGlobalResponse.success) {
      console.error('Failed to create global attribute:', createGlobalResponse.data);
      return;
    }
    
    const globalAttributeId = createGlobalResponse.data.id;
    console.log(`Created global attribute with ID: ${globalAttributeId}`);
    
    // Step 2: Add options to the global attribute
    console.log('\nStep 2: Adding options to the global attribute');
    const sizeOptions = [
      { value: 'small', displayValue: 'Small', attributeId: globalAttributeId },
      { value: 'medium', displayValue: 'Medium', attributeId: globalAttributeId },
      { value: 'large', displayValue: 'Large', attributeId: globalAttributeId },
    ];
    
    const createdOptions = [];
    for (const option of sizeOptions) {
      const createOptionResponse = await makeRequest(`/api/attributes/${globalAttributeId}/options`, 'POST', option);
      
      if (createOptionResponse.success) {
        createdOptions.push(createOptionResponse.data);
        console.log(`Created option: ${option.displayValue} with ID: ${createOptionResponse.data.id}`);
      } else {
        console.error(`Failed to create option ${option.displayValue}:`, createOptionResponse.data);
      }
    }
    
    // Step 3: For demonstration, associate with a catalog
    // In a real test, you would need to use a valid catalog ID
    const catalogId = 1; // Replace with a real catalog ID
    console.log(`\nStep 3: Creating catalog attribute for catalog ${catalogId}`);
    
    const catalogAttribute = {
      catalogId,
      attributeId: globalAttributeId,
      overrideDisplayName: 'Clothing Size',
      sortOrder: 0,
      isRequired: true
    };
    
    const createCatalogAttrResponse = await makeRequest(`/api/catalogs/${catalogId}/attributes`, 'POST', catalogAttribute);
    
    if (createCatalogAttrResponse.success) {
      const catalogAttributeId = createCatalogAttrResponse.data.id;
      console.log(`Created catalog attribute with ID: ${catalogAttributeId}`);
      
      // Step 4: Override some options at the catalog level
      console.log('\nStep 4: Creating catalog-specific options');
      
      const catalogOption = {
        catalogAttributeId,
        value: 'extra-large',
        displayValue: 'Extra Large',
        baseOptionId: null, // Not based on a global option
        sortOrder: 3
      };
      
      const createCatalogOptionResponse = await makeRequest(
        `/api/catalogs/${catalogId}/attributes/${catalogAttributeId}/options`,
        'POST',
        catalogOption
      );
      
      if (createCatalogOptionResponse.success) {
        console.log(`Created catalog-specific option: ${catalogOption.displayValue} with ID: ${createCatalogOptionResponse.data.id}`);
      } else {
        console.error('Failed to create catalog option:', createCatalogOptionResponse.data);
      }
      
      // Step 5: For demonstration, associate with a category
      const categoryId = 3; // Replace with a real category ID
      console.log(`\nStep 5: Creating category attribute for category ${categoryId}`);
      
      const categoryAttribute = {
        categoryId,
        attributeId: globalAttributeId,
        catalogAttributeId, // Link to the catalog attribute
        overrideDisplayName: 'T-Shirt Size',
        sortOrder: 0,
        isRequired: true
      };
      
      const createCategoryAttrResponse = await makeRequest(`/api/categories/${categoryId}/attributes`, 'POST', categoryAttribute);
      
      if (createCategoryAttrResponse.success) {
        const categoryAttributeId = createCategoryAttrResponse.data.id;
        console.log(`Created category attribute with ID: ${categoryAttributeId}`);
        
        // Step 6: Override some options at the category level
        console.log('\nStep 6: Creating category-specific options');
        
        // Option based on a global option
        const categoryOption1 = {
          categoryAttributeId,
          value: 'small',
          displayValue: 'Small (S)',
          baseOptionId: createdOptions[0].id, // Based on the "Small" global option
          sortOrder: 0
        };
        
        // Brand new option
        const categoryOption2 = {
          categoryAttributeId,
          value: 'xxl',
          displayValue: 'Double XL',
          baseOptionId: null,
          sortOrder: 4
        };
        
        const createCategoryOption1Response = await makeRequest(
          `/api/categories/${categoryId}/attributes/${categoryAttributeId}/options`,
          'POST',
          categoryOption1
        );
        
        if (createCategoryOption1Response.success) {
          console.log(`Created category-specific option: ${categoryOption1.displayValue} with ID: ${createCategoryOption1Response.data.id}`);
        } else {
          console.error('Failed to create category option 1:', createCategoryOption1Response.data);
        }
        
        const createCategoryOption2Response = await makeRequest(
          `/api/categories/${categoryId}/attributes/${categoryAttributeId}/options`,
          'POST',
          categoryOption2
        );
        
        if (createCategoryOption2Response.success) {
          console.log(`Created category-specific option: ${categoryOption2.displayValue} with ID: ${createCategoryOption2Response.data.id}`);
        } else {
          console.error('Failed to create category option 2:', createCategoryOption2Response.data);
        }
        
        // Step 7: For demonstration, associate with a product
        const productId = 16; // Replace with a real product ID
        console.log(`\nStep 7: Creating product attribute for product ${productId}`);
        
        const productAttribute = {
          productId,
          attributeId: globalAttributeId,
          categoryAttributeId, // Link to the category attribute
          overrideDisplayName: 'Select Size',
          sortOrder: 0,
          isRequired: true
        };
        
        const createProductAttrResponse = await makeRequest(`/api/products/${productId}/attributes`, 'POST', productAttribute);
        
        if (createProductAttrResponse.success) {
          const productAttributeId = createProductAttrResponse.data.id;
          console.log(`Created product attribute with ID: ${productAttributeId}`);
          
          // Step 8: Add product-specific options or inherit from category
          console.log('\nStep 8: Creating product-specific options');
          
          // Create a product-specific option
          const productOption = {
            productAttributeId,
            value: 'custom',
            displayValue: 'Custom Size',
            priceAdjustment: '5.00', // $5 extra for custom size
            sortOrder: 5
          };
          
          const createProductOptionResponse = await makeRequest(
            `/api/products/${productId}/attributes/${productAttributeId}/options`,
            'POST',
            productOption
          );
          
          if (createProductOptionResponse.success) {
            console.log(`Created product-specific option: ${productOption.displayValue} with ID: ${createProductOptionResponse.data.id}`);
          } else {
            console.error('Failed to create product option:', createProductOptionResponse.data);
          }
          
          // Step 9: Add product attribute values (customer selections)
          console.log('\nStep 9: Creating product attribute values');
          
          const attributeValue = {
            productId,
            attributeId: globalAttributeId,
            optionId: createProductOptionResponse.data.id, // Use the product-specific option
            sortOrder: 0
          };
          
          const createValueResponse = await makeRequest(
            `/api/products/${productId}/attribute-values`,
            'POST',
            attributeValue
          );
          
          if (createValueResponse.success) {
            console.log(`Created attribute value with ID: ${createValueResponse.data.id}`);
          } else {
            console.error('Failed to create attribute value:', createValueResponse.data);
          }
          
          // Step 10: Retrieve and verify attribute inheritance
          console.log('\nStep 10: Verifying attribute inheritance');
          
          // Get product attributes - should include links to category and global attributes
          console.log('\nGetting product attributes:');
          const getProductAttrsResponse = await makeRequest(`/api/products/${productId}/attributes`);
          
          if (getProductAttrsResponse.success) {
            console.log(`Found ${getProductAttrsResponse.data.length} product attributes`);
            console.log('Product attribute data:', JSON.stringify(getProductAttrsResponse.data, null, 2));
          } else {
            console.error('Failed to get product attributes:', getProductAttrsResponse.data);
          }
          
          // Get product attribute options - should include links to category and global options
          console.log('\nGetting product attribute options:');
          const getProductOptionsResponse = await makeRequest(`/api/products/${productId}/attributes/${productAttributeId}/options`);
          
          if (getProductOptionsResponse.success) {
            console.log(`Found ${getProductOptionsResponse.data.length} product attribute options`);
            console.log('Product option data:', JSON.stringify(getProductOptionsResponse.data, null, 2));
          } else {
            console.error('Failed to get product options:', getProductOptionsResponse.data);
          }
        } else {
          console.error('Failed to create product attribute:', createProductAttrResponse.data);
        }
      } else {
        console.error('Failed to create category attribute:', createCategoryAttrResponse.data);
      }
    } else {
      console.error('Failed to create catalog attribute:', createCatalogAttrResponse.data);
    }
    
    console.log('\n========== ATTRIBUTE INHERITANCE TEST COMPLETE ==========\n');
  } catch (error) {
    console.error('Error testing attribute inheritance:', error);
  }
}

// Run the test
testAttributeInheritance().catch(console.error);