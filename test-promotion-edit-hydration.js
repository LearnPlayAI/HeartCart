/**
 * Test Promotion Edit Hydration
 * Check what data promotion 6 returns and how the form should handle it
 */

import { Pool } from 'postgres';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testPromotionEditHydration() {
  try {
    console.log('=== Testing Promotion Edit Data Hydration ===\n');

    // Get promotion 6 data
    const promotionQuery = `
      SELECT * FROM promotions WHERE id = 6
    `;
    const promotionResult = await pool.query(promotionQuery);
    
    if (promotionResult.rows.length === 0) {
      console.log('❌ Promotion 6 not found');
      return;
    }

    const promotion = promotionResult.rows[0];
    console.log('📊 Promotion 6 Raw Data:');
    console.log(JSON.stringify(promotion, null, 2));
    
    console.log('\n🔍 Key Fields Analysis:');
    console.log(`Promotion Name: ${promotion.promotionName}`);
    console.log(`Promotion Type: ${promotion.promotionType}`);
    console.log(`Discount Value: ${promotion.discountValue}`);
    console.log(`Rules (raw): ${promotion.rules}`);
    
    // Parse rules if they exist
    let parsedRules = null;
    if (promotion.rules) {
      try {
        parsedRules = JSON.parse(promotion.rules);
        console.log('Rules (parsed):');
        console.log(JSON.stringify(parsedRules, null, 2));
      } catch (e) {
        console.log(`❌ Failed to parse rules: ${e.message}`);
      }
    }

    console.log('\n🎯 Form Hydration Requirements:');
    console.log('The edit form should display:');
    console.log(`- Promotion Name: "${promotion.promotionName}"`);
    console.log(`- Start Date: ${promotion.startDate?.split('T')[0] || 'N/A'}`);
    console.log(`- End Date: ${promotion.endDate?.split('T')[0] || 'N/A'}`);
    console.log(`- Active Status: ${promotion.isActive}`);
    
    if (parsedRules && parsedRules.type) {
      console.log(`- Rule Type: "${parsedRules.type}" (from rules)`);
      console.log(`- Minimum Quantity: ${parsedRules.minimumQuantity || 'N/A'}`);
      if (parsedRules.specialPricing) {
        console.log(`- Special Pricing Type: ${parsedRules.specialPricing.type}`);
        console.log(`- Special Pricing Value: ${parsedRules.specialPricing.value}`);
      }
    } else {
      console.log(`- Promotion Type: "${promotion.promotionType}" (basic type)`);
      console.log(`- Discount Value: ${promotion.discountValue || 'N/A'}`);
    }

    console.log('\n✅ Form should populate all these fields when editing promotion 6');

  } catch (error) {
    console.error('❌ Error testing promotion edit hydration:', error);
  } finally {
    await pool.end();
  }
}

testPromotionEditHydration();