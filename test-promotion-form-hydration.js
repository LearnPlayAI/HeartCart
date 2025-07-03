/**
 * Test Promotion Form Hydration
 * Debug why form fields are not hydrating from database data
 */

import fs from 'fs';

async function testPromotionFormHydration() {
  try {
    console.log('Testing promotion form hydration...');
    
    // Test fetching promotion data (without auth for now)
    const response = await fetch('http://localhost:5000/api/promotions/6');
    
    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.data) {
      const promotionData = data.data;
      console.log('\n--- Promotion Data Analysis ---');
      console.log('Promotion Name:', promotionData.promotionName);
      console.log('Description:', promotionData.description);
      console.log('Start Date:', promotionData.startDate);
      console.log('End Date:', promotionData.endDate);
      console.log('Is Active:', promotionData.isActive);
      console.log('Promotion Type:', promotionData.promotionType);
      console.log('Discount Value:', promotionData.discountValue);
      console.log('Minimum Order Value:', promotionData.minimumOrderValue);
      console.log('Rules:', JSON.stringify(promotionData.rules, null, 2));
      
      // Test the helper function logic
      console.log('\n--- Helper Function Test ---');
      const getDisplayPromotionType = (promotion) => {
        // If promotion has rules with a type, prioritize that over basic promotionType
        if (promotion.rules?.type) {
          return promotion.rules.type;
        }
        // Otherwise use the basic promotionType
        return promotion.promotionType;
      };
      
      const displayType = getDisplayPromotionType(promotionData);
      console.log('Display Type Result:', displayType);
      
      // Test form data structure
      console.log('\n--- Form Data Structure ---');
      const formData = {
        promotionName: promotionData.promotionName || "",
        description: promotionData.description || "",
        startDate: promotionData.startDate ? promotionData.startDate.split('T')[0] : "",
        endDate: promotionData.endDate ? promotionData.endDate.split('T')[0] : "",
        isActive: promotionData.isActive || false,
        promotionType: displayType || "",
        discountValue: promotionData.discountValue ? promotionData.discountValue.toString() : "",
        minimumOrderValue: promotionData.minimumOrderValue ? promotionData.minimumOrderValue.toString() : "",
        rules: promotionData.rules || null,
      };
      
      console.log('Form Data for Reset:', JSON.stringify(formData, null, 2));
      
    } else {
      console.log('No promotion data found or API error');
    }
    
  } catch (error) {
    console.error('Error testing promotion form hydration:', error);
  }
}

testPromotionFormHydration();