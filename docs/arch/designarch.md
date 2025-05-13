
# TeeMeYou Design Architecture

## 1. Introduction

This document outlines the core design architecture for the TeeMeYou e-commerce platform. It serves as a reference for all development activities to ensure consistency, reliability, and maintainability across the application. Any new features, components, or modifications should adhere to the principles and patterns defined in this document.

## 2. Core Architecture Principles

### 2.1 Consistency First
- Apply consistent patterns, naming conventions, and interfaces across all code (client and server)
- Follow established component structures and API patterns
- Maintain uniform error handling and response formats

### 2.2 Code Deduplication
- Create reusable components and utilities instead of duplicating functionality
- Implement shared type definitions and validation schemas
- Use centralized services for common operations

### 2.3 Server-Side Persistence
- All persistent data must reside on the server
- Client-side should only temporarily cache data needed for current session interactions
- Follow the single source of truth principle for all data

### 2.4 Type Safety
- Implement comprehensive TypeScript types shared between client and server
- Use strict type checking throughout the application
- Create proper interface definitions for all data structures

### 2.5 Error Handling
- Implement consistent error handling throughout the full stack
- Provide user-friendly error messages
- Log detailed error information on the server

### 2.6 Object Storage Integration
- Use Replit Object Store consistently for all file storage needs
- Follow established file organization patterns
- Implement proper error handling for file operations

### 2.7 Clean-Break Implementation
- Implement system-wide changes consistently
- Verify all changes work together before considering implementation complete
- Ensure comprehensive type checking and validation

## 3. Central Systems

### 3.1 TypeScript Type System
- Location: `shared/schema.ts` and related files
- Purpose: Provides consistent type definitions across the application
- Requirements:
  - All types should be defined in shared location
  - Follow consistent naming patterns
  - Implement strict type guards for null/undefined handling

### 3.2 API Response System
- Location: `server/api-response.ts`
- Purpose: Standardizes API responses across all endpoints
- Structure: 
  ```typescript
  {
    success: boolean;
    data: T | null;
    error?: {
      message: string;
      code?: string;
      details?: any;
    };
    meta?: {
      total?: number;
      page?: number;
      limit?: number;
    }
  }
  ```
- Requirements:
  - All API endpoints must use this standard response format
  - Proper HTTP status codes must be used
  - Consistent error handling with clear messages

### 3.3 Authentication System
- Location: `server/auth.ts` and `client/src/hooks/use-auth.tsx`
- Purpose: Manages user authentication and session handling
- Features:
  - Session-based authentication with PostgreSQL session store
  - Proper session timeout handling (30 min idle, 24h max)
  - Role-based access control

### 3.4 File Handling System
- Location: `server/object-store-updated.ts` and `client/src/utils/file-manager.ts`
- Purpose: Provides consistent handling of file uploads, storage, and retrieval
- Structure:
  - Client-side utilities for managing file uploads and URL handling
  - Server-side services for processing, storing, and retrieving files
  - API routes for handling file operations
- Storage Organization:
  ```
  - public/
    - products/
      - {productId}/
    - categories/
    - suppliers/
    - catalogs/
    - temp/
      - pending/
  - private/
  ```

### 3.5 Database Schema System
- Location: `server/db.ts` and related schema files
- Purpose: Defines database structure and relationships
- Technologies: Drizzle ORM with PostgreSQL
- Requirements:
  - Consistent relationship definitions
  - Standardized column naming conventions
  - Proper timezone handling (SAST/UTC+2)

### 3.6 React Query Integration
- Location: `client/src/lib/queryClient.ts` and custom hooks
- Purpose: Primary mechanism for data fetching and state management
- Requirements:
  - Follow consistent React Query patterns
  - Implement proper loading and error states
  - Use types from shared schema

### 3.7 UI Component System
- Location: `client/src/components/ui` and `client/src/components/ui/standardized`
- Purpose: Provides reusable, consistent UI components
- Requirements:
  - Follow consistent component structure
  - Implement proper accessibility features
  - Support responsive design
  - Use consistent prop naming

## 4. Client Architecture

### 4.1 Component Structure
- Folder organization:
  - `client/src/components`: UI components organized by feature
  - `client/src/hooks`: Custom React hooks
  - `client/src/pages`: Page components
  - `client/src/utils`: Utility functions
  - `client/src/lib`: Core functionality and configurations
  - `client/src/styles`: Theme and styling
- Component guidelines:
  - Use functional components with hooks
  - Follow consistent naming (PascalCase for components)
  - Implement proper prop typing
  - Use React Query for data fetching

### 4.2 State Management
- Primary approach: React Query for server state
- Local state: React's useState and useReducer
- Guidelines:
  - No local persistence for long-term state
  - Use React Query for all API data
  - Implement consistent loading and error states
  - Follow established caching patterns

### 4.3 Routing
- System: Wouter for client-side routing
- Structure:
  - Protected routes for authenticated areas
  - Admin-protected routes for admin-only sections
  - Consistent route definition pattern

### 4.4 Form Handling
- Approach: Consistent form implementation patterns
- Requirements:
  - Implement reusable form hooks
  - Apply consistent validation
  - Standardize error message display
  - Follow established submission patterns

## 5. Server Architecture

### 5.1 API Structure
- Approach: RESTful API with standardized responses
- Requirements:
  - Group routes by feature
  - Implement proper middleware for validation
  - Follow consistent route naming patterns
  - Use standard HTTP methods (GET, POST, PUT, DELETE)

### 5.2 Middleware
- Authentication: `server/auth-middleware.ts`
- Validation: `server/middlewares/validation-middleware.ts`
- Error handling: `server/error-handler.ts`
- Guidelines:
  - Apply consistent middleware usage
  - Implement proper error handling
  - Follow established authentication checks

### 5.3 Database Access
- ORM: Drizzle with PostgreSQL
- Structure:
  - Use consistent query patterns
  - Implement proper transaction handling
  - Follow established error handling
  - Ensure proper timezone configuration (SAST)

### 5.4 Logging
- System: Structured logging with `server/logger.ts`
- Requirements:
  - Log appropriate information at each level
  - Include context with log entries
  - Follow consistent logging patterns

## 6. File Upload and Management

### 6.1 Client-Side File Handling
- Primary hook: `useFileUpload` from `client/src/hooks/use-file-upload.ts`
- Features:
  - File validation (size, type)
  - Multiple file handling
  - Image preview generation
  - Upload progress tracking
  - Error handling

### 6.2 URL Handling
- Utility: `ensureValidImageUrl` from `client/src/utils/file-manager.ts`
- Purpose: Consistent image URL formatting and display
- Requirements:
  - Handle different URL formats
  - Provide fallback for missing images
  - Handle temporary file URLs

### 6.3 Object Store Integration
- Service: `ObjectStoreService` in `server/object-store-updated.ts`
- Features:
  - File upload with metadata
  - Image processing and optimization
  - File retrieval and deletion
  - Existence checking
  - Error handling

### 6.4 Temporary File Workflow
1. Upload files to temporary storage
2. Display and manage files client-side
3. Move files to permanent storage when saving 
4. Clean up unused temporary files

## 7. Implementation Guidelines

### 7.1 Component Development
- Create components that adhere to the established patterns
- Implement proper loading and error states
- Follow accessibility guidelines (WCAG 2.1 AA)
- Use existing UI component library when possible
- Create comprehensive PropTypes/TypeScript interfaces

### 7.2 API Development
- Follow the standard API response format
- Implement proper validation with Zod schemas
- Use consistent error handling
- Document endpoints with clear descriptions
- Follow established naming conventions

### 7.3 File Handling
- Use the centralized file handling utilities
- Follow the established file organization structure
- Implement proper error handling for file operations
- Clean up temporary files when appropriate
- Use consistent URL handling

### 7.4 State Management
- Use React Query for server state
- Implement consistent loading and error states
- Follow established caching patterns
- Avoid storing sensitive data client-side
- Ensure proper type safety

### 7.5 Error Handling
- Provide user-friendly error messages
- Log detailed error information on the server
- Implement proper error recovery options
- Follow established error visualization patterns
- Use consistent error response format

## 8. Testing Strategy

### 8.1 API Testing
- Verify endpoints return standardized responses
- Test error handling with invalid inputs
- Ensure proper authentication checks
- Validate pagination and filtering
- Check performance for large data sets

### 8.2 Component Testing
- Verify visual consistency across themes and browsers
- Test responsive behavior on all screen sizes
- Ensure accessibility features function correctly
- Validate proper prop handling
- Test performance and optimizations

### 8.3 File Operation Testing
- Verify uploads with various file types and sizes
- Test image optimization and processing
- Validate URL handling for different scenarios
- Check error handling for file operations
- Test cleanup of temporary files

## 9. Version Control Guidelines

### 9.1 Commit Message Format
- Feature: Add new functionality
- Fix: Fix a bug or issue
- Refactor: Code changes that don't change functionality
- Docs: Documentation changes
- Style: Formatting, missing semicolons, etc.
- Test: Adding or modifying tests

### 9.2 Branch Strategy
- main: Production-ready code
- develop: Integration branch for features
- feature/[name]: New features
- fix/[name]: Bug fixes
- refactor/[name]: Code refactoring

## 10. Technology Stack

### 10.1 Frontend
- React with TypeScript
- Tailwind CSS for styling
- React Query for data fetching
- Wouter for routing
- Zod for schema validation

### 10.2 Backend
- Node.js with TypeScript
- Express for API
- Drizzle ORM with PostgreSQL
- Sharp for image processing
- Replit Object Store for file storage

## 11. Conclusion

This architecture document serves as the definitive reference for all development activities in the TeeMeYou e-commerce platform. All new features, components, and modifications should adhere to the principles and patterns defined in this document to ensure a consistent, maintainable, and reliable application.

When making changes to the codebase, developers should:

1. Review this document to understand the architectural approach
2. Follow the established patterns and guidelines
3. Ensure changes align with the core architecture principles
4. Implement comprehensive testing for new features
5. Update documentation as needed

Adherence to these guidelines will help maintain code quality, consistency, and developer productivity throughout the project lifecycle.
