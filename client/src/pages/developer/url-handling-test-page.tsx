/**
 * URL Handling Test Page
 * 
 * This page tests the improved file handling and URL encoding functionality
 * by displaying uploaded images in various formats to ensure consistency
 * across the application.
 */

import React from 'react';
import URLHandlingTest from '../../test-files/url-handling-test';

export default function URLHandlingTestPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">URL Handling Test</h1>
      <p className="text-gray-600 mb-6">
        This page tests the file URL handling functionality to ensure consistent
        behavior across different types of image paths and formats after removing
        retry logic and improving URL encoding.
      </p>
      
      <URLHandlingTest />
    </div>
  );
}