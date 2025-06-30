/**
 * Test Products Table Validation
 * Verifies that seoKeywords validation works correctly after migration
 */

import { insertProductSchema } from './shared/schema.js';

// Test valid product data with seoKeywords array
const validProductData = {
  name: "Test Product",
  slug: "test-product",
  description: "Test description",
  price: 99.99,
  stock: 10,
  seoKeywords: ["test keyword", "product keyword", "south africa"],
  metaTitle: "Test Product Title",
  metaDescription: "Test product description for SEO"
};

// Test invalid product data with wrong seoKeywords type
const invalidProductData = {
  name: "Test Product",
  slug: "test-product", 
  description: "Test description",
  price: 99.99,
  stock: 10,
  seoKeywords: "invalid string instead of array", // This should fail
  metaTitle: "Test Product Title",
  metaDescription: "Test product description for SEO"
};

console.log("Testing valid product data with seoKeywords array...");
try {
  const result = insertProductSchema.parse(validProductData);
  console.log("✅ Valid product data passed validation");
  console.log("seoKeywords:", result.seoKeywords);
} catch (error) {
  console.log("❌ Valid product data failed validation:", error.message);
}

console.log("\nTesting invalid product data with wrong seoKeywords type...");
try {
  const result = insertProductSchema.parse(invalidProductData);
  console.log("❌ Invalid product data incorrectly passed validation");
} catch (error) {
  console.log("✅ Invalid product data correctly failed validation:", error.message);
}

console.log("\nValidation test completed!");