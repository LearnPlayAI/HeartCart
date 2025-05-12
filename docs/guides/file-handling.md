# File Handling Technical Guide

## Overview

This technical guide documents the file handling system for TeeMeYou's e-commerce platform. It provides a comprehensive overview of the architecture, implementation details, and best practices for working with files in the application.

## Architecture

The file handling system follows a layered architecture with clear separation of concerns:

### Client-Side Components

1. **file-manager.ts** - Core utility with helper functions for URL formatting, file validation, and upload preparation
2. **use-file-upload.ts** - React hook that provides a consistent interface for file uploads across the application

### Server-Side Components

1. **object-store-updated.ts** - Comprehensive service for managing files using Replit's ObjectStorage
2. **file-routes-updated.ts** - API routes for file operations (upload, serve, delete)

## Server-Side Implementation

### ObjectStore Service

The `ObjectStoreService` in `server/object-store-updated.ts` is a singleton service that handles all interactions with Replit's ObjectStorage. Key features include:

- Automatic initialization and connection verification
- Retry logic for reliable uploads and downloads
- Image processing and optimization with Sharp
- Proper error handling and logging
- Helper methods for common file operations

#### Key Methods

```typescript
// Upload a file buffer directly
uploadBuffer(buffer, filename, options)

// Upload to temporary storage
uploadTempFile(buffer, filename, identifier, options)

// Upload product-specific images
uploadProductImage(buffer, filename, productId, options)

// Process and optimize images
processImage(buffer, options)

// Combined processing and upload
uploadProcessedImage(buffer, filename, destination, imageOptions, fileOptions)

// Move files between locations
moveFile(sourceKey, destinationKey)
moveFromTemp(sourceKey, productId)

// Retrieve files
getFileAsBuffer(objectKey)

// File management
exists(objectKey)
deleteFile(objectKey)
deleteFiles(objectKeys)
listFiles(prefix, recursive)
```

### File Routes

API routes in `server/file-routes-updated.ts` provide RESTful endpoints for file operations:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/files/:path(*)` | GET | Serve files from ObjectStorage |
| `/api/files/temp/:identifier/:filename` | GET | Access temporary files |
| `/api/upload/products/images/temp` | POST | Upload product images to temporary storage |
| `/api/upload/products/:productId/images` | POST | Upload product images directly |
| `/api/move-temp-files/:productId` | POST | Move files from temporary to permanent storage |
| `/api/delete-files` | POST | Delete files from storage |
| `/api/cleanup-temp-files` | POST | Administrative cleanup of old temporary files |

## Client-Side Implementation

### File Manager Utility

The `file-manager.ts` utility provides:

- Consistent URL formatting for files
- Helper functions for upload preparation
- File validation and transformation
- Object URL management to prevent memory leaks

#### Key Functions

```typescript
// Format URLs properly
ensureValidImageUrl(image)
formatObjectKeyPath(objectKey)
formatUrlPath(url)

// File uploads
prepareFilesFormData(files, additionalData)
uploadFiles(files, endpoint, additionalData)

// Object URL management
createLocalImageUrl(file)
revokeLocalImageUrl(url)
cleanupLocalImageUrls(images)

// Utilities
validateFileSize(file, maxSizeMB)
getFileExtension(filename)
isImageFile(filename)
generateUniqueFilename(originalFilename)
```

### useFileUpload Hook

The `useFileUpload` hook provides a React-friendly interface for managing file uploads:

- Local preview generation
- Drag-and-drop reordering
- Main image selection
- Progress tracking
- Error handling
- Automatic cleanup of object URLs

#### Usage Example

```tsx
const {
  images,          // Array of UploadedImage objects
  previews,        // Array of URLs for display
  isUploading,     // Upload status
  errors,          // Error messages
  addFiles,        // Add new files
  removeFile,      // Remove a file
  setMainImage,    // Set main product image
  reorderImages,   // Reorder images
  uploadAllFiles   // Upload all pending files
} = useFileUpload({
  maxFiles: 5,               // Maximum allowed files
  maxSizeMB: 2,              // Maximum size per file
  endpoint: '/api/upload',   // Upload endpoint
  additionalData: { id: 1 }  // Additional form data
});
```

## File Flow During Product Creation

1. **Initial Upload:** Files are uploaded to temporary storage using `uploadTempFile`
2. **Front-end Management:** The user can reorder, delete, or set a main image
3. **Product Creation:** When the product is created:
   - For new products: Temporary files are moved to the product folder
   - For existing products: Files are directly uploaded to the product folder
4. **Final Processing:** Additional processing (thumbnails, optimization) may occur

## Storage Organization

Files are organized in a structured manner:

```
public/                     # Publicly accessible files
├── products/               # Product images
│   ├── 1/                  # Images for product ID 1
│   │   ├── image1.jpg
│   │   └── image2.jpg
│   └── 2/                  # Images for product ID 2
├── categories/             # Category images
├── suppliers/              # Supplier logos
├── catalogs/               # Catalog cover images
├── temp/                   # Temporary files
│   └── pending/            # Files pending assignment to a product
private/                    # Protected files requiring authentication
```

## Best Practices

1. **Always use the central utilities** rather than implementing custom file handling
2. **Handle cleanup properly** to prevent memory leaks from object URLs
3. **Use proper error handling** for file operations
4. **Process images server-side** with sharp for optimization
5. **Validate files client-side** before uploading to reduce server load
6. **Use proper URL encoding** for filenames with spaces or special characters
7. **Implement proper cache headers** for optimal performance
8. **Clean up temporary files** regularly

## Common Issues and Solutions

### URL Encoding Issues

**Problem:** File URLs with spaces or special characters may not load correctly.

**Solution:** Use the `ensureValidImageUrl` function which properly encodes URL parts:

```typescript
// Instead of this:
<img src={image.url} />

// Do this:
import { ensureValidImageUrl } from '../utils/file-manager';
<img src={ensureValidImageUrl(image)} />
```

### Object URL Memory Leaks

**Problem:** Creating object URLs without revoking them causes memory leaks.

**Solution:** Use cleanup functions when components unmount:

```typescript
useEffect(() => {
  return () => {
    cleanupLocalImageUrls(images);
  };
}, [images]);
```

### Inconsistent File Display

**Problem:** Images appear in some places but not others.

**Solution:** Ensure all components use the centralized utilities:

```typescript
// Replace custom implementations with:
import { ensureValidImageUrl } from '@/utils/file-manager';
```

## Security Considerations

1. **File type validation** should happen on both client and server
2. **Size limitations** prevent DoS attacks
3. **Unique filenames** prevent overwriting
4. **Proper access control** through authentication and authorization
5. **Content-Disposition headers** prevent XSS in certain file types

## Performance Optimization

1. **Image optimization** reduces file sizes significantly
2. **Proper caching** with appropriate headers
3. **Lazy loading** images that are not immediately visible
4. **Progressive loading** for large images
5. **Thumbnails** for gallery views

## Related Documentation

- [Replit ObjectStorage API](https://docs.replit.com/hosting/object-storage)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)
- [React Dropzone](https://react-dropzone.js.org/)