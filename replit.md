# Juno - AI Travel Planner

## Overview

Juno is a full-stack travel planning application that leverages AI to create personalized travel itineraries. The application combines conversational AI with comprehensive trip management features, allowing users to plan, visualize, and manage their travel experiences. Built with TypeScript, React, and Node.js, Juno offers both free and premium subscription tiers with features like AI-powered trip planning, interactive maps, calendar integration, and trip sharing capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and caching
- **UI Framework**: Custom component library built on Radix UI primitives with Tailwind CSS for styling
- **Maps Integration**: Google Maps API integration for location visualization and trip mapping
- **Calendar System**: FullCalendar library for itinerary visualization and event management
- **Authentication**: Context-based authentication system with protected routes

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy using scrypt for password hashing
- **Session Management**: Express sessions with PostgreSQL session store
- **API Design**: RESTful API architecture with structured error handling
- **File Structure**: Monorepo structure with shared schema definitions between client and server

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM with schema-first approach
- **Migration Management**: Drizzle Kit for database schema management
- **Session Storage**: PostgreSQL-based session storage for user authentication
- **Schema Sharing**: Centralized schema definitions in shared directory for type safety

### Authentication and Authorization
- **Strategy**: Passport.js local authentication with username/password
- **Password Security**: Scrypt-based password hashing with salt generation
- **Session Management**: Server-side sessions with secure HTTP-only cookies
- **Route Protection**: Client-side protected route wrapper with authentication checks
- **User Context**: React context provider for authentication state management

### AI Integration
- **Primary AI**: OpenAI GPT-4 for conversational trip planning and suggestions
- **Weather Integration**: Open-Meteo API for weather-aware activity recommendations
- **Trip Generation**: AI-powered itinerary creation based on user preferences and constraints
- **Conversational Interface**: Chat-based trip planning with contextual follow-up questions
- **Weather-Adaptive Planning**: Dynamic activity suggestions based on weather forecasts

## External Dependencies

### Core Infrastructure
- **Database**: Neon PostgreSQL serverless database with connection pooling
- **File Storage**: Base64 image encoding for profile pictures (no external storage service)
- **Hosting**: Designed for Replit deployment with environment-based configuration

### Third-Party APIs
- **OpenAI API**: GPT-4 integration for AI-powered trip planning and recommendations
- **Google Maps API**: Location services, geocoding, and interactive map visualization
- **Open-Meteo API**: Weather forecasting for location-based activity planning
- **Stripe API**: Payment processing for subscription management (with mock fallbacks for development)

### UI and Styling
- **Radix UI**: Accessible component primitives for dialogs, dropdowns, and form elements
- **Tailwind CSS**: Utility-first CSS framework with custom theme configuration
- **Lucide React**: Icon library for consistent iconography
- **FullCalendar**: Calendar component for itinerary visualization and management

### Development and Build Tools
- **TypeScript**: Full-stack type safety with shared schema definitions
- **Vite**: Fast development server and build tool with React plugin
- **ESBuild**: Server-side bundling for production deployment
- **Drizzle Kit**: Database schema management and migration tools

### Subscription and Payment System
- **Stripe Integration**: Subscription management with multiple pricing tiers
- **Plan Management**: Database-driven subscription plans with feature gating
- **Payment Processing**: Stripe Checkout for secure payment handling
- **Feature Access Control**: Component-level premium feature restrictions

### Additional Integrations
- **React Hook Form**: Form state management with Zod validation
- **Date-fns**: Date manipulation and formatting utilities
- **React Query**: Server state caching and synchronization
- **Currency.js**: Financial calculations and currency formatting