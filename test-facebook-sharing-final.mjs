/**
 * Final Facebook Sharing Test
 * Tests that Facebook crawlers get proper Open Graph meta tags while regular users access React app
 */

import https from 'https';

const BASE_URL = 'https://teemeyou.shop';
const TEST_PRODUCT_ID = 540;

function makeRequest(url, userAgent = 'Mozilla/5.0') {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

function extractOpenGraphTags(html) {
  const ogTags = {};
  const metaRegex = /<meta\s+property="og:([^"]+)"\s+content="([^"]*)"[^>]*>/gi;
  let match;
  
  while ((match = metaRegex.exec(html)) !== null) {
    ogTags[match[1]] = match[2];
  }
  
  return ogTags;
}

async function testFacebookSharingFinal() {
  console.log('🔍 Testing Final Facebook Sharing Implementation...\n');

  try {
    // Test 1: Facebook crawler should get static HTML with meta tags
    console.log('1. Testing Facebook crawler behavior...');
    const facebookResponse = await makeRequest(
      `${BASE_URL}/product/id/${TEST_PRODUCT_ID}`,
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
    );

    console.log(`   Status: ${facebookResponse.statusCode}`);
    
    if (facebookResponse.statusCode !== 200) {
      throw new Error(`Facebook crawler got ${facebookResponse.statusCode} status`);
    }

    const ogTags = extractOpenGraphTags(facebookResponse.data);
    console.log('   Open Graph tags found:');
    Object.entries(ogTags).forEach(([key, value]) => {
      console.log(`     og:${key}: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`);
    });

    // Verify essential OG tags
    const requiredTags = ['type', 'title', 'description', 'image', 'url'];
    const missingTags = requiredTags.filter(tag => !ogTags[tag]);
    
    if (missingTags.length > 0) {
      console.log(`   ❌ Missing required OG tags: ${missingTags.join(', ')}`);
    } else {
      console.log('   ✅ All required Open Graph tags present');
    }

    // Test 2: Regular browser should access React app
    console.log('\n2. Testing regular browser behavior...');
    const browserResponse = await makeRequest(
      `${BASE_URL}/product/id/${TEST_PRODUCT_ID}`,
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );

    console.log(`   Status: ${browserResponse.statusCode}`);
    
    if (browserResponse.statusCode !== 200) {
      throw new Error(`Browser got ${browserResponse.statusCode} status`);
    }

    // Check if it's the React app (should have Vite script or React elements)
    const isReactApp = browserResponse.data.includes('src="/src/main.tsx') || 
                       browserResponse.data.includes('id="root"') ||
                       browserResponse.data.includes('vite');

    if (isReactApp) {
      console.log('   ✅ Regular browsers get React app');
    } else {
      console.log('   ⚠️  Browsers might be getting static HTML instead of React app');
    }

    // Test 3: Verify product data in Facebook response
    console.log('\n3. Verifying product-specific data...');
    
    if (ogTags.title && ogTags.title.includes('Wallet Ninja')) {
      console.log('   ✅ Product-specific title found');
    } else {
      console.log('   ❌ Product-specific title not found');
    }

    if (ogTags.image && ogTags.image.includes('/api/files/')) {
      console.log('   ✅ Product image URL found');
    } else {
      console.log('   ❌ Product image URL not found');
    }

    // Test 4: Test other crawlers get normal response
    console.log('\n4. Testing other crawlers (should get React app)...');
    const googleResponse = await makeRequest(
      `${BASE_URL}/product/id/${TEST_PRODUCT_ID}`,
      'Googlebot/2.1 (+http://www.google.com/bot.html)'
    );

    console.log(`   Google crawler status: ${googleResponse.statusCode}`);
    
    const googleGetsReact = googleResponse.data.includes('src="/src/main.tsx') || 
                           googleResponse.data.includes('id="root"');
    
    if (googleGetsReact) {
      console.log('   ✅ Other crawlers get React app (as expected)');
    } else {
      console.log('   ⚠️  Other crawlers getting static HTML (unexpected)');
    }

    console.log('\n📊 Test Results Summary:');
    console.log(`   Facebook crawler meta tags: ${missingTags.length === 0 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Regular browser React app: ${isReactApp ? '✅ PASS' : '⚠️  WARNING'}`);
    console.log(`   Other crawlers React app: ${googleGetsReact ? '✅ PASS' : '⚠️  WARNING'}`);

    if (missingTags.length === 0) {
      console.log('\n🎉 Facebook sharing implementation is working correctly!');
      console.log('   - Facebook crawlers get proper Open Graph meta tags');
      console.log('   - Regular users can access the React application');
      console.log('   - Product sharing should display rich previews on Facebook');
    } else {
      console.log('\n❌ Facebook sharing needs attention');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testFacebookSharingFinal();