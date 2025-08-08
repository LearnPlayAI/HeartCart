# HeartCart E-Commerce Platform

## Overview
HeartCart is a comprehensive e-commerce platform designed as a dropshipping solution for the South African market. Its core purpose is to facilitate online retail with features spanning product management, secure user authentication, efficient order processing, and an intuitive admin dashboard. Key capabilities include AI-powered product recommendations and a robust system for managing inventory and sales. The project aims to capture market share in South Africa's growing e-commerce sector by offering a full-stack, scalable, and user-friendly platform.

## User Preferences
Preferred communication style: Simple, everyday language.
Database naming convention: ALL new tables and table columns MUST use camelCase naming (never snake_case).

## System Architecture
HeartCart employs a full-stack architecture. The backend is built with **Express.js (TypeScript)**, utilizing **PostgreSQL** with **Drizzle ORM** for data persistence. **Passport.js** handles authentication with a local strategy and session management. For frontend, **React (TypeScript)** is used, bundled with **Vite**. UI components are developed with **Shadcn/UI** and **Radix UI**, styled using **TailwindCSS v4**. State management leverages **TanStack Query** for server state and **React Context** for application state, with **Wouter** for routing and **React Hook Form** with **Zod** for form validation.

Key architectural decisions include:
- **Modular Design**: Separation of concerns between frontend, backend, and database layers for maintainability and scalability.
- **AI Integration**: Google Gemini AI is integrated for advanced features like product analysis, SEO optimization, pricing suggestions, and content generation, enhancing user experience and administrative efficiency.
- **Scalability**: Designed with considerations for horizontal scaling, including PostgreSQL-backed sessions and object storage for distributed file access.
- **Robust Feature Set**: Includes a comprehensive product management system (multi-step wizard, attribute management, inventory tracking), secure authentication (user roles, session handling, password hashing), and full e-commerce functionality (persistent cart, order lifecycle management, payment integration readiness, PUDO shipping).
- **Admin Dashboard**: Centralized control panel for product, order, and user management, offering bulk operations and basic analytics.
- **Data Flow**: Structured processes for product creation (AI-assisted), order processing (from cart to fulfillment), and authentication, ensuring data integrity and efficient operations.
- **UI/UX**: Emphasis on clean, modern design using Shadcn/UI and TailwindCSS, with consistent branding and intuitive user flows. Hot pink branding elements are used for visual identity.

## External Dependencies
- **Database**: PostgreSQL 16
- **Node.js**: Version 20
- **AI Services**: Google Gemini API
- **Object Storage**: Replit Object Storage
- **Payment Gateway (Integration Ready)**: Structured for Stripe or local South African providers (e.g., Yoco).
- **Shipping**: PUDO locker system (South Africa).
- **Email Service**: MailerSend (with heartcart.shop domain).