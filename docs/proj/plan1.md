# TEE ME YOU Admin Dashboard Implementation Plan

## Project Overview

This document outlines the implementation approach for the TEE ME YOU e-commerce platform admin dashboard, focusing on product management, financial tracking, shipping integration, and role-based access.

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
  - Direct integration with Replit Object Store APIs for storage and retrieval
  - Client-side image processing with server validation

#### Category & Tag Management
- **Admin Controls**:
  - Create, edit, delete, and reorder categories
  - Create, modify, and delete tags
  - Associate tags with multiple products in batch operations
- **Implementation Details**:
  - Categories stored in dedicated database table with hierarchy support
  - Tags implemented with many-to-many relationship to products
  - Card-based UI for managing categories and tags

#### Product Promotions & Specials
- **Features**:
  - Time-limited promotions with automatic start/end
  - Discount percentage or fixed amount options
  - Featured product placement
  - Flash deals for rapid sales
- **Implementation Details**:
  - Promotion start/end timestamps in product database
  - Scheduled tasks to activate/deactivate promotions
  - Visual indicators for products on promotion

### 2. Financial Tracking

#### PayFast Integration
- **Approach**:
  - Implement dummy payment flow mirroring PayFast's structure
  - Design modular payment processor that can be easily switched to real PayFast
  - Store transaction references compatible with PayFast's system
- **Implementation Details**:
  - Mock PayFast payment screens and callbacks
  - Configuration file for payment settings to simplify real integration
  - Separate payment service layer in codebase

#### Revenue & Financial Reporting
- **Features**:
  - Revenue summaries (daily, weekly, monthly)
  - Profit calculation based on product cost vs. selling price
  - Transaction history with advanced filtering
  - Sales performance by category and product
- **Implementation Details**:
  - Aggregated financial data stored in reporting tables
  - Card-based visualization using charts
  - Exportable reports in CSV/PDF formats

### 3. Shipping Management

#### South African Courier Integration
- **Partners**:
  - The Courier Guy (https://thecourierguy.co.za/)
  - PUDO (https://pudo.co.za/)
- **Implementation Approach**:
  - Create dummy shipping service modules that mimic real API structure
  - Design modular shipping provider system that can be replaced with real APIs
  - Simulate shipping rates, tracking, and delivery status
- **Features**:
  - Shipping rate calculator
  - Tracking number generation and management
  - Delivery status updates
  - Printable shipping labels

### 4. Role-Based Access

#### Role System
- **Roles**:
  - Normal User: Customer access only
  - Admin: Full site administration capabilities
- **Implementation Approach**:
  - Role information stored in user profile
  - UI rendering conditional on user role
  - Admin endpoints secured to require admin role

#### Access Control Architecture
- **Frontend**:
  - Admin navigation items and pages only visible to admin users
  - Admin components conditionally rendered based on role
- **Backend**:
  - Admin API endpoints validate user role before processing
  - Security middleware to check role for all admin routes

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

#### Interface Components
- **Card-Based Layouts**:
  - Replace traditional data tables with card-based views
  - Interactive cards with quick actions
  - Grid layouts for products and orders
- **Sorting & Filtering**:
  - Advanced filter controls for all listings
  - Multiple sort options (date, price, popularity)
  - Saved filter preferences

#### Visual Style
- **Design Inspiration**: Temu.com UI/UX patterns
- **Key Elements**:
  - Bold color scheme featuring #FF69B4 (Hot Pink)
  - Clean, high-contrast interfaces
  - Intuitive iconography
  - Visual hierarchy emphasizing primary actions

#### Admin Actions
- **Batch Operations**:
  - Multi-select functionality for products, orders
  - Bulk actions: update status, apply tags, delete
  - Progress indicators for batch processes

## Implementation Phases

### Phase 1: Admin Authentication & Dashboard Framework
- Admin role implementation and authorization
- Admin dashboard shell and navigation
- Role-based menu display

### Phase 2: Product Management
- Product CRUD operations
- Category and tag management
- Image upload with Replit Object Store integration
- Basic image processing (resize, crop)

### Phase 3: Advanced Product Features
- Google Gemini integration for background removal
- Product promotions and specials
- Batch operations for products

### Phase 4: Order & Shipping Management
- Order tracking interface
- Dummy shipping integration for The Courier Guy and PUDO
- Shipping label generation

### Phase 5: Financial Management
- Dummy PayFast integration
- Financial dashboard and reporting
- Revenue and profit tracking

## Technical Specifications

### Integration Points
- **Replit Object Store**: Direct API integration for image storage
- **Google Gemini API 1.5 Flash**: Integration for image background removal
- **PayFast**: Modular design for future integration
- **Shipping Services**: Modular design for future integration

### Data Model Extensions
- New tables for categories, tags, promotions
- Extended product schema for additional attributes
- Order status tracking enhancements
- Financial reporting tables

### Security Considerations
- Role validation for all admin endpoints
- Secure handling of payment information
- Data validation for all user inputs

## Next Steps

Upon approval of this plan, development will begin with Phase 1, establishing the admin authentication system and dashboard framework. Each subsequent phase will build upon the previous, delivering incremental functionality while maintaining a cohesive user experience.