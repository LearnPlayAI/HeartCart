/**
 * AI Utilities
 * 
 * This file contains utility functions for AI-assisted product content.
 */

/**
 * Generate product description suggestions using AI
 * @param productName Product name
 * @param category Product category
 * @param attributes Product attributes (optional)
 * @returns Promise with generated description suggestions
 */
export async function generateProductDescription(
  productName: string,
  category?: string,
  attributes?: any[]
): Promise<string[]> {
  try {
    const response = await fetch('/api/ai/suggest-description', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productName,
        category,
        attributes
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate product description');
    }

    const data = await response.json();
    return data.success ? data.data.suggestions : [];
  } catch (error) {
    console.error('Error generating product description:', error);
    return [];
  }
}

/**
 * Generate SEO optimization suggestions using AI
 * @param productName Product name
 * @param description Product description
 * @param category Product category (optional)
 * @returns Promise with SEO suggestions
 */
export async function generateSeoSuggestions(
  productName: string,
  description: string,
  category?: string
): Promise<{
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
}> {
  try {
    const response = await fetch('/api/ai/optimize-seo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productName,
        description,
        category
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate SEO suggestions');
    }

    const data = await response.json();
    return data.success ? data.data : {
      metaTitle: '',
      metaDescription: '',
      metaKeywords: ''
    };
  } catch (error) {
    console.error('Error generating SEO suggestions:', error);
    return {
      metaTitle: '',
      metaDescription: '',
      metaKeywords: ''
    };
  }
}

/**
 * Check if AI services are available
 * @returns Promise with availability status
 */
export async function checkAiServicesAvailability(): Promise<boolean> {
  try {
    const response = await fetch('/api/ai/status');
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    return data.success && data.data.available;
  } catch (error) {
    console.error('Error checking AI services:', error);
    return false;
  }
}