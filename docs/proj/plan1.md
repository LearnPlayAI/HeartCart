# TEE ME YOU Admin Dashboard Implementation Plan

## Project Overview

This document outlines the implementation approach for the TEE ME YOU e-commerce platform admin dashboard, focusing on product management, financial tracking, shipping integration, and role-based access.

## Development Principles

### Guiding Principles
- **Open Source First**: Prefer open source solutions over proprietary technologies
- **Minimize Custom Code**: Leverage existing libraries and frameworks wherever possible
- **Single Source of Truth**: Follow best practices for state management and data flow
- **Code Reusability**: Design components and services for maximum reuse
- **API Standardization**: Create standardized interfaces for external services

### Technical Approach
- Create reusable service layers for Replit Object Store and Google Gemini API
- Abstract third-party dependencies behind interfaces for easier maintenance
- Implement shared utilities for common operations
- Document code thoroughly to facilitate maintenance

## Core Features & Implementation Approach

### 1. Admin Dashboard - Product Catalog Management

#### Image Management System
- **Storage Location**: All product images will be stored in the Replit Object Store
- **Path Structure**: `public-assets/{category}/{ProductID}/image1` through `image5`
- **Access Control**: All product images will be publicly accessible without authentication
- **Image Processing Features**:
  - Image resizing functionality with multiple preset options
  - Interactive crop functionality with pan and zoom capabilities
  - Background removal using Google Gemini API 1.5 flash (requires API key)
- **Implementation Details**:
  - Maximum 5 images per product enforced in both UI and backend
  - Integration with Replit Object Store using `@replit/object-storage` package
  - Reusable Object Store service module that abstracts all storage operations
  - Open source solution [react-image-crop](https://github.com/DominicTobias/react-image-crop) for image editing
  - Reusable Google Gemini API service for background removal and other AI features
- **Replit Object Store Usage**:
  - Upload images using `client.uploadFromBytes` for in-memory processing
  - Download images using `client.downloadAsBytes` for editing operations
  - List objects using `client.list()` for product image management
  - Delete images using `client.delete()` for product image removal
  - Handle error responses from all Object Store operations

#### Category & Tag Management
- **Admin Controls**:
  - Create, edit, delete, and reorder categories
  - Create, modify, and delete tags
  - Associate tags with multiple products in batch operations
- **Implementation Details**:
  - Categories stored in dedicated database table with hierarchy support
  - Tags implemented with many-to-many relationship to products
  - Card-based UI for managing categories and tags
  - Use open source [shadcn/ui tags input](https://ui.shadcn.com/docs/components/tags-input) component
  - Reuse category/tag components across admin and user interfaces

#### Product Promotions & Specials
- **Features**:
  - Time-limited promotions with automatic start/end
  - Discount percentage or fixed amount options
  - Featured product placement
  - Flash deals for rapid sales
- **Implementation Details**:
  - Promotion start/end timestamps in product database
  - Use open source [date-fns](https://date-fns.org/) for date manipulation
  - Scheduled tasks to activate/deactivate promotions using existing libraries
  - Visual indicators for products on promotion with reusable badge components

### 2. Financial Tracking

#### PayFast Integration
- **Approach**:
  - Implement dummy payment flow mirroring PayFast's structure
  - Design modular payment processor that can be easily switched to real PayFast
  - Store transaction references compatible with PayFast's system
- **Implementation Details**:
  - Use [PayJS](https://github.com/paypal/payjs) open source library as a base for payment UI
  - Mock PayFast payment screens and callbacks
  - Configuration file for payment settings to simplify real integration
  - Separate payment service layer with adapter pattern for easy switching

#### Revenue & Financial Reporting
- **Features**:
  - Revenue summaries (daily, weekly, monthly)
  - Profit calculation based on product cost vs. selling price
  - Transaction history with advanced filtering
  - Sales performance by category and product
- **Implementation Details**:
  - Aggregated financial data stored in reporting tables
  - Card-based visualization using [Recharts](https://recharts.org/en-US/) (open source React charting library)
  - Use [react-csv](https://github.com/react-csv/react-csv) for CSV exports
  - [jspdf](https://github.com/parallax/jsPDF) for PDF generation
  - Reusable report components for consistent UI across different reports

### 3. Shipping Management

#### South African Courier Integration
- **Partners**:
  - The Courier Guy (https://thecourierguy.co.za/)
  - PUDO (https://pudo.co.za/)
- **Implementation Approach**:
  - Create dummy shipping service modules that mimic real API structure
  - Design modular shipping provider system with adapter pattern for future real APIs
  - Simulate shipping rates, tracking, and delivery status
- **Features**:
  - Shipping rate calculator
  - Tracking number generation and management
  - Delivery status updates
  - Printable shipping labels
- **Implementation Details**:
  - Use [axios](https://github.com/axios/axios) for API communication
  - [React PDF](https://react-pdf.org/) for shipping label generation
  - Common interface for multiple shipping providers to maintain code reusability
  - Configuration-driven shipping provider selection

### 4. Role-Based Access

#### Role System
- **Roles**:
  - Normal User: Customer access only
  - Admin: Full site administration capabilities
- **Implementation Approach**:
  - Role information stored in user profile
  - UI rendering conditional on user role
  - Admin endpoints secured to require admin role
- **Implementation Details**:
  - Use existing authentication system with role-based extensions
  - Implement [express-jwt](https://github.com/auth0/express-jwt) or similar for role verification
  - Create reusable React hooks for role-based UI rendering

#### Access Control Architecture
- **Frontend**:
  - Admin navigation items and pages only visible to admin users
  - Admin components conditionally rendered based on role
- **Backend**:
  - Admin API endpoints validate user role before processing
  - Security middleware to check role for all admin routes
- **Implementation Details**:
  - Create `useIsAdmin` custom hook based on existing `useAuth`
  - Implement API middleware for admin route protection
  - Use route prefixing (`/api/admin/*`) for admin-specific endpoints

> **Important Note**: As specified, roles will primarily control visibility of content rather than being deeply integrated into application logic. However, all admin endpoints must still validate that the user has the admin role before allowing access.

### 5. UI/UX Design

#### Design Principles
- **Mobile-First Approach**:
  - Design for smallest screens first, then enhance for larger screens
  - Touch-friendly controls with appropriate sizing
- **Responsive Design**:
  - Fluid layouts that adapt to screen size
  - Responsive images and card layouts
  - Appropriate typography scaling
- **Implementation Details**:
  - Use existing [Tailwind CSS](https://tailwindcss.com/) configuration
  - Utilize [shadcn/ui](https://ui.shadcn.com/) components for consistency
  - Implement responsive grid with [CSS Grid Layout](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout)
  - Mobile-first media queries

#### Interface Components
- **Card-Based Layouts**:
  - Replace traditional data tables with card-based views
  - Interactive cards with quick actions
  - Grid layouts for products and orders
- **Sorting & Filtering**:
  - Advanced filter controls for all listings
  - Multiple sort options (date, price, popularity)
  - Saved filter preferences
- **Implementation Details**:
  - Use [SWR](https://swr.vercel.app/) or existing React Query for data fetching with filtering
  - Implement [sonner](https://github.com/emilkowalski/sonner) for toast notifications
  - Use [cmdk](https://github.com/pacocoursey/cmdk) for command palette filtering

#### Visual Style
- **Design Inspiration**: Temu.com UI/UX patterns
- **Key Elements**:
  - Bold color scheme featuring #FF69B4 (Hot Pink)
  - Clean, high-contrast interfaces
  - Intuitive iconography
  - Visual hierarchy emphasizing primary actions
- **Implementation Details**:
  - Use [Lucide React](https://lucide.dev/guide/packages/lucide-react) for consistent iconography
  - Ensure color contrast meets WCAG accessibility guidelines
  - Implement [Framer Motion](https://www.framer.com/motion/) for subtle animations

#### Admin Actions
- **Batch Operations**:
  - Multi-select functionality for products, orders
  - Bulk actions: update status, apply tags, delete
  - Progress indicators for batch processes
- **Implementation Details**:
  - Use [React Context API](https://react.dev/reference/react/createContext) for selection state
  - Implement [react-hot-toast](https://react-hot-toast.com/) for progress notifications
  - Create reusable batch action components

## Implementation Plan with Task Status

### Phase 1: Foundation & Admin Authentication
1. **Create Admin Dashboard Layout** - ![Status](https://img.shields.io/badge/Not%20Started-red)
   - Set up responsive admin layout structure
   - Implement admin navigation with role-based visibility
   - Create admin homepage with summary widgets

2. **Role-Based Authentication** - ![Status](https://img.shields.io/badge/Not%20Started-red)
   - Extend existing authentication system to support admin role
   - Create middleware for admin API route protection
   - Implement role-based UI rendering

3. **Reusable Service Libraries** - ![Status](https://img.shields.io/badge/Not%20Started-red)
   - Create Replit Object Store service for image storage
     ```javascript
     // Example service implementation
     class ObjectStoreService {
       constructor() {
         const { Client } = require('@replit/object-storage');
         this.client = new Client();
       }
       
       async uploadImage(categorySlug, productId, imageNumber, imageBuffer) {
         const path = `public-assets/${categorySlug}/${productId}/image${imageNumber}.jpg`;
         const { ok, error } = await this.client.uploadFromBytes(path, imageBuffer);
         if (!ok) throw new Error(`Failed to upload image: ${error}`);
         return path;
       }
       
       // Additional methods for download, list, delete operations
     }
     ```
   - Set up service structure for Google Gemini API
   - Implement shared utilities for common operations

### Phase 2: Product Catalog Management
4. **Product CRUD Operations** - ![Status](https://img.shields.io/badge/Not%20Started-red)
   - Implement product listing with card-based UI
   - Create product editor with validation
   - Build batch operations for products

5. **Category & Tag Management** - ![Status](https://img.shields.io/badge/Not%20Started-red)
   - Create category editor interface
   - Implement tag management system
   - Build relationship management between products and categories/tags

6. **Basic Image Management** - ![Status](https://img.shields.io/badge/Not%20Started-red)
   - Set up image upload with Replit Object Store using `@replit/object-storage`
   - Implement client-side image resize and crop functionality
   - Create image preview and management interface
   - Implement service layer for Object Store operations

### Phase 3: Advanced Product Features
7. **Advanced Image Processing** - ![Status](https://img.shields.io/badge/Not%20Started-red)
   - Integrate Google Gemini API for background removal
   - Implement image enhancement options
   - Create batch image processing capabilities

8. **Product Promotions System** - ![Status](https://img.shields.io/badge/Not%20Started-red)
   - Build time-limited promotions functionality
   - Implement discount calculation system
   - Create promotion management interface

### Phase 4: Order & Shipping Management
9. **Order Management System** - ![Status](https://img.shields.io/badge/Not%20Started-red)
   - Implement order listing and details views
   - Create order status update functionality
   - Build order filtering and search capabilities

10. **Shipping Integration Framework** - ![Status](https://img.shields.io/badge/Not%20Started-red)
    - Design shipping provider adapter system
    - Implement dummy integration for The Courier Guy
    - Create PUDO integration module
    - Build shipping label generation

### Phase 5: Financial Tools
11. **Payment Integration** - ![Status](https://img.shields.io/badge/Not%20Started-red)
    - Implement dummy PayFast integration
    - Create payment module with adapter pattern
    - Build payment status tracking

12. **Financial Reporting** - ![Status](https://img.shields.io/badge/Not%20Started-red)
    - Create revenue dashboard with charts
    - Implement sales analytics
    - Build exportable financial reports

## Technical Specifications

### Integration Points

#### Replit Object Store Integration
- **Package**: `@replit/object-storage`
- **Client Initialization**: 
  ```javascript
  const { Client } = require('@replit/object-storage');
  const client = new Client();
  ```
- **Key Operations**:
  - **Upload Product Images**: 
    ```javascript
    const { ok, error } = await client.uploadFromBytes(
      `public-assets/${categorySlug}/${productId}/image1.jpg`, 
      imageBuffer
    );
    if (!ok) handleError(error);
    ```
  - **Retrieve Product Images**: 
    ```javascript
    const { ok, value, error } = await client.downloadAsBytes(
      `public-assets/${categorySlug}/${productId}/image1.jpg`
    );
    if (!ok) handleError(error);
    // Use 'value' as the image buffer
    ```
  - **List Product Images**: 
    ```javascript
    const { ok, value, error } = await client.list();
    if (!ok) handleError(error);
    // Filter 'value' to find product images with pattern matching
    const productImages = value.filter(item => 
      item.startsWith(`public-assets/${categorySlug}/${productId}/`)
    );
    ```
  - **Delete Product Images**: 
    ```javascript
    const { ok, error } = await client.delete(
      `public-assets/${categorySlug}/${productId}/image1.jpg`
    );
    if (!ok) handleError(error);
    ```
  - **Error Handling**: Consistent error handling for all operations with detailed logging

#### Google Gemini API 1.5 Flash
- Integration for image background removal

#### PayFast
- Modular design for future integration

#### Shipping Services
- Modular design for future integration

### Data Model Extensions
- New tables for categories, tags, promotions
- Extended product schema for additional attributes
- Order status tracking enhancements
- Financial reporting tables

### Security Considerations
- Role validation for all admin endpoints
- Secure handling of payment information
- Data validation for all user inputs

## Next Steps & Implementation Prioritization

### Immediate First Steps (Week 1)
1. Extend user schema to support admin role
2. Create admin dashboard shell layout
3. Implement basic role-based authorization middleware

### Short-Term Goals (Weeks 2-3)
1. Complete product management CRUD operations
2. Implement basic category and tag functionality
3. Set up initial image upload capabilities

### Medium-Term Goals (Weeks 4-6)
1. Create shipping integration framework
2. Implement order management interface
3. Set up promotion management system

### Long-Term Goals (Weeks 7-8)
1. Implement financial reporting
2. Create advanced image processing with Gemini API
3. Complete batch operations for inventory management

### Success Metrics
- Admin can fully manage product catalog without developer involvement
- Order processing time reduced by at least 50%
- Shipping integration provides accurate shipping estimates
- Financial reporting provides actionable business insights

This phased approach allows for incremental delivery of value while maintaining a cohesive user experience. Each phase builds upon the previous one, with continuous testing and refinement throughout the development process.