/**
 * File API Test Script
 * 
 * This script tests the file-browser API endpoints, particularly
 * the diagnostic endpoint for inspecting Client API methods.
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000'; 

async function testApiMethods() {
  console.log('Testing File Browser API Methods');
  
  try {
    // Create a session with admin credentials to authenticate
    await axios.post(`${BASE_URL}/api/login`, {
      email: 'admin@example.com',
      password: 'admin123'
    }, {
      withCredentials: true
    });
    
    console.log('Logged in as admin');
    
    // Now access the API methods endpoint
    const response = await axios.get(`${BASE_URL}/api/file-browser/api-methods`, {
      withCredentials: true
    });
    
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testApiMethods().catch(console.error);