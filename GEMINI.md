# Gemini Project Context: Noor Chat

This document provides a comprehensive overview of the Noor Chat project, its architecture, and development practices to be used as instructional context for Gemini.

## Project Overview

Noor Chat is a full-stack web application for a meal delivery service. The project is built with a modern technology stack, featuring a React-based frontend and a Node.js backend.

- **Frontend:** A single-page application (SPA) built with React, Next.js, and TypeScript.
- **Backend:** A Node.js server providing a RESTful API.
- **Database:** PostgreSQL managed by Supabase, with Supabase also handling user authentication.
- **Styling:** Tailwind CSS with Radix UI for accessible and unstyled components.
- **Deployment:** Configuration for Docker is present (`docker-compose.yml`).

## Building and Running

### Development

The project includes a development environment that runs the Next.js development server.

- **Start the development server:**

  ```bash
  npm run dev
  ```

  This script starts the Next.js server on port 3000.

- **Run the backend server in development:**
  The backend is integrated with the Next.js development server.

### Building for Production

- **Build the entire application (frontend and backend):**
  ```bash
  npm run build
  ```
  This command will build the application for production.

### Testing

- **Run linter:**

  ```bash
  npm run lint
  ```

  This command runs the linter.

## Development Conventions

- **Code Style:** The project uses ESLint for code linting.
- **Type Checking:** The project uses TypeScript for static type checking. To check for type errors, run:

  ```bash
  npx tsc --noEmit
  ```

## Core AI/API Development Guard Rails

1.  The official and only approved Google AI SDK for this project is `@google/genai`. The legacy `@google/generative-ai` package is forbidden.
2.  All AI interactions must be implemented as stateless calls to the `generateContent` method. Do not use stateful chat objects or abstractions.
3.  The primary model for this project is `gemini-2.0-flash-lite`. Do not use other models without explicit instruction.
4.  Before implementing any new API interaction, first consult the official documentation provided by the user to verify all parameters, methods, and endpoints.
