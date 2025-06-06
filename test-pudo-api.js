const https = require('https');

const PUDO_API_KEY = process.env.PUDO_API_KEY;

if (!PUDO_API_KEY) {
  console.error('PUDO_API_KEY not found in environment');
  process.exit(1);
}

console.log('Testing PUDO API endpoints...');

// Test different endpoints and auth methods
const endpoints = [
  'https://api-pudo.co.za/lockers-data',
  'https://api-pudo.co.za/lockers',
  'https://api-pudo.co.za/api/lockers',
  'https://api-pudo.co.za/v1/lockers'
];

const authMethods = [
  { name: 'Bearer Token', headers: { 'Authorization': `Bearer ${PUDO_API_KEY}` } },
  { name: 'API Key Header', headers: { 'X-API-Key': PUDO_API_KEY } },
  { name: 'API Key Header Alt', headers: { 'Api-Key': PUDO_API_KEY } }
];

async function testEndpoint(url, authMethod) {
  return new Promise((resolve) => {
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TeeMeYou-ECommerce/1.0',
        ...authMethod.headers
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`\n${url} with ${authMethod.name}:`);
        console.log(`Status: ${res.statusCode}`);
        console.log(`Headers:`, Object.fromEntries(Object.entries(res.headers).slice(0, 5)));
        if (res.statusCode < 400 && data.length > 0) {
          try {
            const parsed = JSON.parse(data);
            console.log(`Response: ${JSON.stringify(parsed).substring(0, 200)}...`);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log(`First item structure:`, Object.keys(parsed[0]));
            }
          } catch {
            console.log(`Response (text): ${data.substring(0, 200)}...`);
          }
        }
        resolve({ url, status: res.statusCode, data });
      });
    });

    req.on('error', (err) => {
      console.log(`\n${url} with ${authMethod.name}: ERROR - ${err.message}`);
      resolve({ url, status: 'error', error: err.message });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      console.log(`\n${url} with ${authMethod.name}: TIMEOUT`);
      resolve({ url, status: 'timeout' });
    });

    req.end();
  });
}

async function testAll() {
  for (const endpoint of endpoints) {
    for (const authMethod of authMethods) {
      await testEndpoint(endpoint, authMethod);
    }
  }
  
  // Also test with query parameter
  console.log('\nTesting with query parameter:');
  await testEndpoint(`https://api-pudo.co.za/lockers-data?api_key=${PUDO_API_KEY}`, { name: 'Query Param', headers: {} });
}

testAll().then(() => {
  console.log('\nAPI testing complete.');
}).catch(console.error);