# Guildford Programmer Developer Landing Page

## Overview

This is a modern, single-page landing page website for Guildford Programmer Developer, a programming and web development business serving clients from Abbotsford to Vancouver. The site is built as a full-stack application featuring a React frontend with a Node.js/Express backend, designed to showcase the company's services and capture client inquiries through a contact form.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**React with TypeScript SPA**: The client uses React 18 with TypeScript, built as a single-page application using Wouter for lightweight routing. The application follows a component-based architecture with clear separation between UI components and business logic.

**UI Framework**: Implements shadcn/ui components built on Radix UI primitives, providing accessible and customizable UI elements. The design system uses Tailwind CSS for styling with custom CSS variables for theming and consistent visual hierarchy.

**State Management**: Uses React Query (TanStack Query) for server state management and data fetching, with React Hook Form for form state management. This provides optimistic updates and efficient data synchronization.

**Build System**: Vite handles the development server and build process, with custom path aliasing for clean imports and hot module replacement for development efficiency.

### Backend Architecture

**Express.js API Server**: Lightweight REST API built with Express.js and TypeScript, handling contact form submissions and data persistence. The server includes request logging middleware and structured error handling.

**In-Memory Storage**: Currently uses an in-memory storage implementation with a well-defined interface that can be easily swapped for a database implementation. Supports both user and contact management with type-safe operations.

**Type Safety**: Shares TypeScript types and Zod schemas between frontend and backend through a shared directory, ensuring consistent data validation and type safety across the full stack.

### Database Architecture

**PostgreSQL with Drizzle ORM**: Configured to use PostgreSQL as the production database with Drizzle ORM for type-safe database operations. Database schema includes tables for users and contacts with proper relationships and constraints.

**Neon Database Integration**: Configured to work with Neon serverless PostgreSQL, providing scalable cloud database hosting with connection pooling.

**Migration System**: Uses Drizzle Kit for database migrations and schema management, with migrations stored in a dedicated directory structure.

### Form and Validation System

**Contact Form Processing**: Implements a contact form with fields for name, email, phone, and message. Uses Zod schemas for both client-side and server-side validation to ensure data consistency.

**Form State Management**: React Hook Form with Zod resolver provides form state management, validation, and error handling with a smooth user experience.

**Toast Notifications**: Provides user feedback through toast notifications for form submission success/error states.

### Styling and Design System

**Modern Design Language**: Implements a tech-focused design with gradient backgrounds, smooth animations, and a professional color scheme featuring navy, tech blue, and electric cyan.

**Responsive Design**: Mobile-first responsive design with breakpoint-specific layouts and touch-friendly interactions.

**Animation System**: Custom CSS animations for hero elements, hover effects, and smooth scrolling navigation between page sections.

### Development and Build Pipeline

**TypeScript Configuration**: Comprehensive TypeScript setup with path mapping, strict type checking, and proper module resolution for both client and server code.

**Development Workflow**: Hot reload in development with integrated error handling and debugging tools, including runtime error overlays for better development experience.

**Production Build**: Optimized production builds with code splitting, asset optimization, and proper static file serving through Express.js.

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL database hosting
- **Drizzle ORM**: Type-safe database toolkit with PostgreSQL dialect
- **connect-pg-simple**: PostgreSQL session store for Express sessions

### Frontend Libraries
- **React 18**: Core frontend framework with TypeScript support
- **Radix UI**: Accessible component primitives for building the UI
- **TanStack React Query**: Server state management and data fetching
- **React Hook Form**: Form state management and validation
- **Wouter**: Lightweight client-side routing
- **Lucide React**: Modern icon library for UI elements

### Styling and UI
- **Tailwind CSS**: Utility-first CSS framework for styling
- **shadcn/ui**: Pre-built component library based on Radix UI
- **class-variance-authority**: Utility for creating type-safe CSS class variants
- **Embla Carousel**: Carousel/slider component for portfolio showcase

### Backend and Build Tools
- **Express.js**: Web application framework for Node.js
- **Zod**: TypeScript-first schema validation library
- **Vite**: Fast build tool and development server
- **esbuild**: Fast JavaScript bundler for production builds

### Development Tools
- **tsx**: TypeScript execution environment for development
- **PostCSS**: CSS processing with Tailwind CSS integration
- **Google Fonts**: Web fonts (Poppins, Geist, Fira Code) for typography