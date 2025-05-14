/**
 * AI Utility Functions
 * 
 * These functions interact with the AI API endpoints to generate content
 * for product descriptions and SEO suggestions.
 */

import axios from 'axios';

// Interface for description generation input
interface DescriptionGenerationInput {
  productName: string;
  category: string;
  keywords: string[];
  tone: string;
  attributes: {
    name: string;
    value: string;
  }[];
}

// Interface for SEO optimization input
interface SeoOptimizationInput {
  productName: string;
  description: string;
  category: string;
  targetKeywords: string[];
}

// Interface for the SEO suggestion structure returned by the API
interface SeoSuggestion {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
}

/**
 * Check if AI services are available
 * @returns {Promise<boolean>} True if AI services are available
 */
export async function checkAiAvailability(): Promise<boolean> {
  try {
    const response = await axios.get('/api/ai/status');
    return response.data?.success && response.data?.data?.available;
  } catch (error) {
    console.error('Error checking AI availability:', error);
    return false;
  }
}

/**
 * Generate product descriptions using AI
 * @param {DescriptionGenerationInput} input - The input data for description generation
 * @returns {Promise<string[]>} Array of generated descriptions
 */
export async function generateDescriptions(input: DescriptionGenerationInput): Promise<string[]> {
  try {
    // Create a timeout promise to cancel the request if it takes too long
    const timeoutPromise = new Promise<string[]>((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out')), 30000); // 30 second timeout
    });
    
    // The actual API request
    const requestPromise = axios.post('/api/ai/descriptions', input)
      .then(response => {
        if (response.data?.success) {
          return response.data.descriptions || [];
        }
        throw new Error(response.data?.error || 'Failed to generate descriptions');
      });
      
    // Race between timeout and the actual request
    return Promise.race([requestPromise, timeoutPromise]);
  } catch (error) {
    console.error('Error generating descriptions:', error);
    throw error;
  }
}

/**
 * Optimize SEO content using AI
 * @param {SeoOptimizationInput} input - The input data for SEO optimization
 * @returns {Promise<SeoSuggestion[]>} Array of SEO suggestions
 */
export async function optimizeSeo(input: SeoOptimizationInput): Promise<SeoSuggestion[]> {
  try {
    // Create a timeout promise to cancel the request if it takes too long
    const timeoutPromise = new Promise<SeoSuggestion[]>((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out')), 30000); // 30 second timeout
    });
    
    // The actual API request
    const requestPromise = axios.post('/api/ai/seo', input)
      .then(response => {
        if (response.data?.success) {
          return response.data.suggestions || [];
        }
        throw new Error(response.data?.error || 'Failed to generate SEO suggestions');
      });
      
    // Race between timeout and the actual request
    return Promise.race([requestPromise, timeoutPromise]);
  } catch (error) {
    console.error('Error optimizing SEO:', error);
    throw error;
  }
}

/**
 * Generate product tags using AI
 * @param {string} productName - The name of the product
 * @param {string} description - The product description
 * @param {string} category - The product category
 * @returns {Promise<string[]>} Array of suggested tags
 */
export async function generateTags(
  productName: string,
  description: string = '',
  category: string = ''
): Promise<string[]> {
  try {
    // Create a timeout promise to cancel the request if it takes too long
    const timeoutPromise = new Promise<string[]>((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out')), 30000); // 30 second timeout
    });
    
    // The actual API request
    const requestPromise = axios.post('/api/ai/tags', {
      productName,
      description,
      category
    })
      .then(response => {
        if (response.data?.success) {
          return response.data.tags || [];
        }
        throw new Error(response.data?.error || 'Failed to generate tags');
      });
      
    // Race between timeout and the actual request
    return Promise.race([requestPromise, timeoutPromise]);
  } catch (error) {
    console.error('Error generating tags:', error);
    throw error;
  }
}