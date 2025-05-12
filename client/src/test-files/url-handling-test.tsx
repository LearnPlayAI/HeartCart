/**
 * URL Handling Test Component
 * 
 * This component is used to test the improved file handling and URL encoding
 * functionality by displaying uploaded images in various formats to ensure
 * consistency across the application.
 */

import React, { useState, useEffect } from 'react';
import { 
  ensureValidImageUrl,
  formatUrlPath,
  formatObjectKeyPath,
  sanitizeFilename,
  STORAGE_FOLDERS
} from '../utils/file-manager';
import { UploadedImage } from '../components/admin/product-wizard/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

// Test cases for URL handling
const TEST_CASES = [
  // Test strings (direct URL paths)
  '/api/files/temp/pending/image with spaces.jpg',
  '/api/files/temp/pending/1747061479501_9f9rn812x7g_HEART-FLEECE-COMFORTER-SET5.jpg',
  '/api/files/products/123/product-image-special_chars!@#$.png',
  
  // Test objects (product images)
  {
    url: '/api/files/temp/pending/test image.jpg',
    objectKey: 'temp/pending/test image.jpg',
    isMain: false,
    order: 0
  },
  {
    url: '/api/files/products/456/product image with spaces.jpg',
    objectKey: 'products/456/product image with spaces.jpg',
    isMain: true,
    order: 1
  },
  {
    url: '/api/files/temp/pending/1747061479501_tr0tab70soa_HEART-FLEECE-COMFORTER-SET3.jpg',
    objectKey: 'temp/pending/1747061479501_tr0tab70soa_HEART-FLEECE-COMFORTER-SET3.jpg',
    isMain: false,
    order: 2
  }
];

// Create an object URL for testing
const createMockObjectURL = () => {
  // Create a small canvas and convert to blob URL as a mock image
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'lightblue';
    ctx.fillRect(0, 0, 100, 100);
    ctx.fillStyle = 'black';
    ctx.font = '14px Arial';
    ctx.fillText('Test Image', 10, 50);
  }
  
  return new Promise<string>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        resolve(url);
      } else {
        resolve('');
      }
    });
  });
};

export default function URLHandlingTest() {
  const [results, setResults] = useState<Array<{
    input: string;
    formattedUrl: string;
    rendersCorrectly: boolean;
  }>>([]);
  
  const [objectUrl, setObjectUrl] = useState<string>('');
  
  useEffect(() => {
    // Generate test results
    const runTests = async () => {
      const generatedObjectUrl = await createMockObjectURL();
      setObjectUrl(generatedObjectUrl);
      
      const testResults = TEST_CASES.map((testCase) => {
        const input = typeof testCase === 'string' ? testCase : JSON.stringify(testCase);
        
        // Ensure testCase is either a string or properly implements UploadedImage
        const formattedUrl = typeof testCase === 'string' 
          ? ensureValidImageUrl(testCase)
          : ensureValidImageUrl(testCase as UploadedImage);
        
        return {
          input,
          formattedUrl,
          rendersCorrectly: true // We'll update this after render
        };
      });
      
      // Add object URL test case
      if (generatedObjectUrl) {
        testResults.push({
          input: 'Blob URL',
          formattedUrl: generatedObjectUrl,
          rendersCorrectly: true
        });
      }
      
      setResults(testResults);
    };
    
    runTests();
    
    // Clean up object URL on unmount
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, []);
  
  // Update rendering status after images attempt to load
  const handleImageError = (index: number) => {
    setResults(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        rendersCorrectly: false
      };
      return updated;
    });
  };
  
  const handleImageLoad = (index: number) => {
    setResults(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        rendersCorrectly: true
      };
      return updated;
    });
  };
  
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>URL Handling Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            This component tests the file URL handling functions to ensure consistent behavior
            across different types of image paths and formats.
          </p>
          
          <h2 className="text-lg font-semibold my-4">Test Results</h2>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Input</TableHead>
                <TableHead>Formatted URL</TableHead>
                <TableHead>Renders</TableHead>
                <TableHead>Preview</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result, index) => (
                <TableRow key={index}>
                  <TableCell className="font-mono text-xs">
                    {result.input.length > 50 
                      ? `${result.input.substring(0, 50)}...` 
                      : result.input}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {result.formattedUrl.length > 50 
                      ? `${result.formattedUrl.substring(0, 50)}...` 
                      : result.formattedUrl}
                  </TableCell>
                  <TableCell>
                    <span 
                      className={`inline-block px-2 py-1 rounded text-xs ${
                        result.rendersCorrectly 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {result.rendersCorrectly ? 'Success' : 'Failed'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="h-16 w-16 relative bg-gray-100 rounded">
                      <img
                        src={result.formattedUrl}
                        alt={`Test image ${index}`}
                        className="h-full w-full object-contain"
                        onError={() => handleImageError(index)}
                        onLoad={() => handleImageLoad(index)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}