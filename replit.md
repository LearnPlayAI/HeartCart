# TeeMeYou E-Commerce Platform

## Overview

TeeMeYou is a comprehensive e-commerce platform built as a dropshipping solution for South African markets. The application features a full-stack architecture with Express.js backend, React frontend, and PostgreSQL database. The platform includes product management, user authentication, order processing, AI-powered product recommendations, and admin dashboard functionality.

## System Architecture

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy and session-based auth
- **File Storage**: Replit Object Storage for product images
- **AI Integration**: Google Gemini AI for product analysis and recommendations
- **Session Management**: PostgreSQL-backed session store

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **UI Components**: Shadcn/UI with Radix UI primitives
- **Styling**: TailwindCSS v4
- **State Management**: TanStack Query for server state, React Context for app state
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Data Storage Solutions
- **Primary Database**: PostgreSQL for relational data
- **Object Storage**: Replit Object Storage for images and files
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple
- **Schema Management**: Drizzle ORM with TypeScript-first approach

## Key Components

### Product Management System
- **Product Wizard**: Multi-step product creation with AI assistance
- **Attribute System**: Centralized attribute management for product variants
- **Image Management**: Bulk upload, optimization, and storage
- **Inventory Tracking**: Stock levels, low stock alerts, backorder management

### Authentication & Authorization
- **User Roles**: Admin and customer roles with permission-based access
- **Session Management**: Secure session handling with PostgreSQL storage
- **Password Security**: Scrypt-based password hashing with salt
- **Rate Limiting**: Login attempt protection

### E-Commerce Features
- **Shopping Cart**: Persistent cart with quantity management
- **Order Processing**: Complete order lifecycle management
- **Payment Integration**: Ready for payment gateway integration
- **Shipping**: PUDO locker integration for South African delivery

### AI-Powered Features
- **Product Analysis**: Gemini AI for image analysis and description generation
- **SEO Optimization**: AI-generated meta tags and descriptions
- **Price Suggestions**: Market research-based pricing recommendations
- **Content Generation**: Automated product descriptions and tags

### Admin Dashboard
- **Product Management**: CRUD operations with bulk actions
- **Order Management**: Order status tracking and updates
- **User Management**: Customer account administration
- **Analytics**: Basic reporting and insights
- **Batch Operations**: CSV import/export capabilities

## Data Flow

### Product Creation Flow
1. Admin initiates product creation through wizard
2. AI analyzes supplier images and URLs
3. System generates product suggestions (name, description, pricing)
4. Admin reviews and modifies suggestions
5. Product attributes are configured
6. Images are processed and stored
7. Product is saved to database with all relationships

### Order Processing Flow
1. Customer adds items to cart
2. Cart calculates totals with discounts/taxes
3. Customer proceeds to checkout
4. Order is created with "pending" status
5. Payment processing (when integrated)
6. Order status updates through fulfillment stages
7. Admin can track and manage order lifecycle

### Authentication Flow
1. User submits login credentials
2. Passport.js validates against database
3. Password verified using scrypt comparison
4. Session created and stored in PostgreSQL
5. User context maintained across requests
6. Role-based access control enforced

## External Dependencies

### Core Dependencies
- **Database**: PostgreSQL 16 (configured in .replit)
- **Node.js**: Version 20 runtime environment
- **AI Services**: Google Gemini API for content generation
- **Object Storage**: Replit Object Storage for file management

### Payment & Shipping (Ready for Integration)
- **Payment**: Structured for Stripe or local SA payment providers
- **Shipping**: PUDO locker system for South African delivery
- **Notifications**: Email/SMS integration points prepared

### Development Tools
- **Drizzle Kit**: Database schema management and migrations
- **TypeScript**: Full type safety across client and server
- **ESBuild**: Production bundling and optimization

## Deployment Strategy

### Environment Configuration
- **Development**: `npm run dev` with hot reloading
- **Production**: `npm run build && npm run start`
- **Database**: Automatic PostgreSQL provisioning on Replit
- **Deployment Target**: Google Cloud Engine (configured in .replit)

### Build Process
1. Frontend built with Vite to `dist/public`
2. Backend bundled with ESBuild to `dist/index.js`
3. Static assets served from Express in production
4. Database migrations applied via `npm run db:push`

### Scaling Considerations
- Session storage in PostgreSQL for horizontal scaling
- Object storage for distributed file access
- Database indexes optimized for common queries
- API designed for potential microservice separation

## Changelog
```
Changelog:
- June 27, 2025. Initial setup
- June 27, 2025. Implemented unified MailerSend email system with 5 email scenarios:
  * Account verification emails with token-based security
  * Password reset emails with 1-hour expiration
  * Payment confirmation emails integrated with payment flow
  * Order status update emails for shipping notifications
  * Invoice emails with PDF attachment support
  * All emails branded with TeeMeYou design and sent from sales@teemeyou.shop
  * Domain verification completed and all email types successfully tested
- June 27, 2025. UI improvements:
  * Removed social media links (Facebook, Twitter, Instagram) from footer
  * Removed PWA features card per user request
  * Updated footer with contact information instead
- June 27, 2025. PWA install functionality disabled:
  * Removed PWA install notifications from desktop and mobile
  * Disabled InstallPrompt and FloatingInstallButton components
  * Updated usePWAInstall hook to return disabled state
  * Eliminated "Install App" prompts per user request
- June 27, 2025. Comprehensive cache invalidation system implemented:
  * Enhanced service worker with automatic version detection and cache management
  * Created useAppUpdate hook for client-side update monitoring
  * Added UpdateNotification component with user-friendly update prompts
  * Implemented automatic cache clearing and page reload for seamless updates
  * Periodic update checks every 30 seconds and on page visibility changes
  * Eliminates need for manual cache clearing after deployments
```

## User Preferences
```
Preferred communication style: Simple, everyday language.
```