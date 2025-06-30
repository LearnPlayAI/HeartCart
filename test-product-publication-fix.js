/**
 * Test Product Publication Fix
 * Verifies that the seoKeywords array migration doesn't break product publication
 */

import { db } from './server/db.js';
import { publishProductDraft } from './server/product-publication-atomic.js';

async function testProductPublicationFix() {
  try {
    console.log('🔧 Testing Product Publication Fix...');

    // 1. Find a product draft with seoKeywords
    const draftResult = await db.execute(`
      SELECT id, name, seo_keywords
      FROM product_drafts 
      WHERE seo_keywords IS NOT NULL
      AND seo_keywords != '[]'
      LIMIT 1
    `);

    if (!draftResult.rows[0]) {
      console.log('❌ No product drafts with seoKeywords found');
      return;
    }

    const draft = draftResult.rows[0];
    console.log('📋 Found test draft:', {
      id: draft.id,
      name: draft.name,
      seoKeywords: draft.seo_keywords
    });

    // 2. Check if seoKeywords is stored as array
    const seoKeywordsType = Array.isArray(draft.seo_keywords) ? 'array' : typeof draft.seo_keywords;
    console.log('🔍 seoKeywords type:', seoKeywordsType);
    
    if (seoKeywordsType === 'string') {
      console.log('⚠️  seoKeywords is still stored as string, this should be array');
    }

    // 3. Test publication process
    console.log('🚀 Testing product publication...');
    const result = await publishProductDraft(draft.id);

    if (result.success) {
      console.log('✅ Product publication successful!');
      console.log('📦 Published product ID:', result.productId);

      // 4. Verify the published product has correct seoKeywords format
      const productResult = await db.execute(`
        SELECT id, name, seo_keywords
        FROM products 
        WHERE id = ${result.productId}
      `);

      if (productResult.rows[0]) {
        const product = productResult.rows[0];
        console.log('🔍 Published product seoKeywords:', {
          type: Array.isArray(product.seo_keywords) ? 'array' : typeof product.seo_keywords,
          value: product.seo_keywords
        });

        if (Array.isArray(product.seo_keywords)) {
          console.log('✅ seoKeywords correctly stored as array in products table');
        } else {
          console.log('❌ seoKeywords not stored as array in products table');
        }
      }

    } else {
      console.log('❌ Product publication failed:', result.error);
      
      // Check if it's the specific seoKeywords error
      if (result.error && result.error.includes('map is not a function')) {
        console.log('🔍 This appears to be the seoKeywords array handling error');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Check for specific error patterns
    if (error.message.includes('map is not a function')) {
      console.log('🔍 Confirmed: This is the seoKeywords array handling error');
      console.log('📝 The issue is that seoKeywords is being treated as a string when it should be an array');
    }
  }
}

// Run the test
testProductPublicationFix().then(() => {
  console.log('🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});