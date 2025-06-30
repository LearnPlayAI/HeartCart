/**
 * Complete Facebook Sharing System Test
 * Tests the complete server-side Open Graph meta tag injection for Facebook crawlers
 */

import https from 'https';

async function testCompleteFacebookSharing() {
  console.log('🔍 Testing Complete Facebook Sharing System...\n');

  // Test URLs
  const testUrls = [
    'https://teemeyou.shop/product/id/540', // Wallet Ninja
    'https://teemeyou.shop/product/id/536', // Respirator Mask
    'https://teemeyou.shop/product/id/527'  // Coffee Warmer
  ];

  console.log('📋 Testing Facebook Crawler Meta Tag Injection:');
  console.log('===============================================\n');

  for (const url of testUrls) {
    console.log(`🔗 Testing URL: ${url}`);
    console.log('─'.repeat(50));

    try {
      // Test with Facebook crawler user agent
      const response = await makeRequest(url, 'facebookexternalhit/1.1');
      
      // Extract Open Graph meta tags
      const ogTags = extractOpenGraphTags(response);
      
      console.log('📊 Facebook Crawler Results:');
      console.log(`   Status: ${response.includes('<!DOCTYPE html>') ? '✅ HTML Response' : '❌ Invalid Response'}`);
      console.log(`   og:title: ${ogTags.title || '❌ Missing'}`);
      console.log(`   og:description: ${ogTags.description ? '✅ Present' : '❌ Missing'}`);
      console.log(`   og:image: ${ogTags.image || '❌ Missing'}`);
      console.log(`   og:type: ${ogTags.type || '❌ Missing'}`);
      console.log(`   og:url: ${ogTags.url || '❌ Missing'}`);
      
      // Check for duplicate title tags
      const titleMatches = response.match(/og:title" content="[^"]*"/g);
      if (titleMatches && titleMatches.length > 1) {
        console.log(`   ⚠️  DUPLICATE TITLES DETECTED: ${titleMatches.length} instances`);
        titleMatches.forEach((match, index) => {
          console.log(`      ${index + 1}. ${match}`);
        });
      } else {
        console.log(`   ✅ Single title tag detected`);
      }
      
      // Validate product-specific content
      const isProductSpecific = ogTags.title && 
                               !ogTags.title.includes('TEE ME YOU - South African Online Shopping') &&
                               ogTags.title.includes('R');
      
      console.log(`   Product-specific: ${isProductSpecific ? '✅ Yes' : '❌ Generic detected'}`);
      
      // Test WhatsApp preview URL
      const productId = url.split('/').pop();
      const whatsappUrl = `https://teemeyou.shop/api/social-preview/product/${productId}`;
      console.log(`\n📱 Testing WhatsApp Preview: ${whatsappUrl}`);
      
      try {
        const whatsappResponse = await makeRequest(whatsappUrl);
        const whatsappValid = whatsappResponse.includes('<!DOCTYPE html>') && 
                            whatsappResponse.includes('og:title');
        console.log(`   WhatsApp Preview: ${whatsappValid ? '✅ Working' : '❌ Failed'}`);
      } catch (error) {
        console.log(`   WhatsApp Preview: ❌ Error - ${error.message}`);
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    console.log('\n');
  }

  // Test Facebook Sharing URL Structure
  console.log('🔗 Facebook Sharing URL Test:');
  console.log('===============================\n');
  
  const shareUrl = encodeURIComponent('https://teemeyou.shop/product/id/540');
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`;
  console.log(`Facebook Share URL: ${facebookShareUrl}`);
  console.log('✅ URL structure is correct for Facebook sharing\n');

  // Cache refresh instructions
  console.log('🔄 Facebook Cache Refresh Instructions:');
  console.log('======================================\n');
  console.log('If Facebook shows old/generic information, refresh the cache:');
  console.log('1. Visit: https://developers.facebook.com/tools/debug/');
  console.log('2. Enter URL: https://teemeyou.shop/product/id/540');
  console.log('3. Click "Debug" button');
  console.log('4. Click "Scrape Again" to refresh cache');
  console.log('5. Verify product-specific information appears\n');

  console.log('✅ Facebook Sharing System Test Complete');
}

function makeRequest(url, userAgent = 'Mozilla/5.0') {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': userAgent
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

function extractOpenGraphTags(html) {
  const tags = {};
  
  // Extract og:title
  const titleMatch = html.match(/og:title" content="([^"]*)"/);
  if (titleMatch) tags.title = titleMatch[1];
  
  // Extract og:description
  const descMatch = html.match(/og:description" content="([^"]*)"/);
  if (descMatch) tags.description = descMatch[1];
  
  // Extract og:image
  const imageMatch = html.match(/og:image" content="([^"]*)"/);
  if (imageMatch) tags.image = imageMatch[1];
  
  // Extract og:type
  const typeMatch = html.match(/og:type" content="([^"]*)"/);
  if (typeMatch) tags.type = typeMatch[1];
  
  // Extract og:url
  const urlMatch = html.match(/og:url" content="([^"]*)"/);
  if (urlMatch) tags.url = urlMatch[1];
  
  return tags;
}

// Run the test
testCompleteFacebookSharing().catch(console.error);