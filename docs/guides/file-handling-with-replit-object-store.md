# File Handling with Replit Object Store

This guide documents the centralized file handling system for the TeeMeYou e-commerce platform. The system provides consistent, reliable handling of file uploads, storage, and retrieval throughout the application.

## Architecture Overview

The file handling system consists of:

1. **Client-side utilities** for managing file uploads and URL handling
2. **Server-side services** for processing, storing, and retrieving files
3. **API routes** for handling file operations

This architecture ensures consistent behavior, proper error handling, and reliable access to files across the application.

## Usage Guidelines

### Client-Side File Uploads

For consistent file uploads, use the `useFileUpload` hook provided in `client/src/hooks/use-file-upload.ts`:

```tsx
import { useFileUpload } from '@/hooks/use-file-upload';
import { UPLOAD_ENDPOINTS } from '@/utils/file-manager';

// In your component
const {
  images,
  previews,
  isUploading,
  errors,
  addFiles,
  removeFile,
  setMainImage,
  reorderImages,
  uploadAllFiles
} = useFileUpload({
  maxFiles: 5,
  maxSizeMB: 2,
  endpoint: UPLOAD_ENDPOINTS.PRODUCT_TEMP,
  additionalData: { productId: '123' } // Optional
});

// Add files (from file input or drop zone)
const handleFileSelect = (files: File[]) => {
  addFiles(files);
};

// Upload all pending files to the server
const handleSubmit = async () => {
  try {
    const uploadedImages = await uploadAllFiles();
    console.log('Upload successful:', uploadedImages);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};

// Render previews and upload UI
return (
  <div>
    {previews.map((previewUrl, index) => (
      <div key={index}>
        <img src={previewUrl} alt={`Preview ${index}`} />
        <button onClick={() => removeFile(index)}>Remove</button>
        <button onClick={() => setMainImage(index)}>Set as Main</button>
      </div>
    ))}
    <input type="file" multiple onChange={(e) => handleFileSelect(Array.from(e.target.files || []))} />
    <button onClick={handleSubmit} disabled={isUploading}>
      {isUploading ? 'Uploading...' : 'Upload Files'}
    </button>
    {Object.entries(errors).map(([key, error]) => (
      <p key={key} className="error">{error}</p>
    ))}
  </div>
);
```

### Image URL Handling

For consistent image URL formatting and display, use the `ensureValidImageUrl` function from `client/src/utils/file-manager.ts`:

```tsx
import { ensureValidImageUrl } from '@/utils/file-manager';

// In your component
const ProductImage = ({ image }) => {
  const imageUrl = ensureValidImageUrl(image);
  
  return (
    <div className="product-image">
      <img src={imageUrl} alt="Product" />
    </div>
  );
};
```

## File Storage Organization

Files are organized in the Object Store with the following structure:

- `public/` - Publicly accessible files
  - `products/` - Product images
    - `{productId}/` - Images for a specific product
  - `categories/` - Category images
  - `suppliers/` - Supplier logos
  - `catalogs/` - Catalog cover images
  - `temp/` - Temporary files
    - `pending/` - Files pending assignment to a product
- `private/` - Protected files requiring authentication

## Server-Side Implementation

### ObjectStore Service

The `ObjectStoreService` class in `server/object-store-updated.ts` provides a comprehensive API for file operations:

```typescript
// Example server-side usage
import { objectStore } from './object-store-updated';

// Upload a file
const uploadResult = await objectStore.uploadBuffer(
  buffer,
  filename,
  {
    contentType: 'image/jpeg',
    metadata: { owner: 'user123' }
  }
);

// Process and optimize an image
const processedBuffer = await objectStore.processImage(
  buffer,
  {
    width: 800,
    height: 600,
    quality: 85
  }
);

// Check if a file exists
const exists = await objectStore.exists(objectKey);

// Get file data
const { data, contentType } = await objectStore.getFileAsBuffer(objectKey);

// Delete a file
await objectStore.deleteFile(objectKey);
```

### API Routes

File-related API routes are defined in `server/file-routes-updated.ts` and provide endpoints for:

- Serving files: `GET /api/files/:path`
- Uploading temporary files: `POST /api/upload/products/images/temp`
- Uploading to a specific product: `POST /api/upload/products/:productId/images`
- Moving temporary files: `POST /api/move-temp-files/:productId`
- Deleting files: `POST /api/delete-files`

## Working with Temporary Files

The file system handles temporary files during product creation:

1. Upload files to temporary storage using `UPLOAD_ENDPOINTS.PRODUCT_TEMP`
2. Display and manage these files client-side using `ensureValidImageUrl`
3. When saving the product, either:
   - Include the temporary objectKeys in your product creation API call
   - Use the `/api/move-temp-files/:productId` endpoint to move files to permanent storage

## Troubleshooting

### Image Display Issues

If images aren't displaying properly:

1. Check browser console for any URL errors
2. Ensure proper URL encoding for filenames with spaces or special characters
3. Verify the objectKey path is correct (especially for temp files)
4. If using a custom domain, ensure CORS headers are properly configured

### Upload Failures

Common causes of upload failures:

1. File size exceeds the limit (default: 5MB)
2. Invalid file type
3. Server storage limitations
4. Network interruptions during upload

### Object Store Access Issues

If the Object Store service fails to initialize:

1. Verify Replit permissions are correctly set
2. Check ObjectStore instance is provisioned for your Repl
3. Restart the application to reinitialize the connection

## Best Practices

1. Always clean up local object URLs when components unmount
2. Use the centralized utilities rather than custom implementations
3. Include proper error handling for file operations
4. Set appropriate cache headers for different file types
5. Optimize images before storage to improve performance
6. Use consistent naming conventions for object keys
7. Perform regular cleanup of temporary files