# Chat + Canvas

A production-ready AI-powered platform for natural language database and document analysis.

## Project Overview

- **Name**: Chat + Canvas
- **Goal**: Enable natural language interaction with databases and documents through an AI assistant
- **Features**: 
  - Natural language SQL generation with safety guardrails
  - Document Q&A with citations
  - Interactive Canvas for visualizations and reports
  - Two operational modes: Super Analyst (read-only) and Super Admin (full access with guardrails)

## URLs

- **Development**: http://localhost:3000
- **GitHub**: (Repository URL to be added after GitHub setup)

## Data Architecture

- **Data Models**: Users, Database Sources, Document Sources, Artifacts, Embeddings, Audit Logs
- **Storage Services**: 
  - PostgreSQL with pgvector extension (for app data and embeddings)
  - Redis (for background job queues)
  - Configurable document sources (S3, Supabase Storage, local folders)
- **Data Flow**: 
  - Users authenticate via native email/password system
  - AI processes natural language queries against configured databases
  - Document ingestion creates embeddings stored in pgvector
  - Canvas displays results, charts, and artifacts

## Tech Stack

### Frontend
- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS with Radix UI components
- **Visualizations**: Vega-Lite for charts and graphs
- **Layout**: Responsive design with resizable Canvas panel

### Backend
- **Runtime**: Node.js with Next.js API routes
- **Authentication**: Argon2id password hashing with JWT cookies
- **Database**: PostgreSQL with pgvector extension
- **Queue System**: BullMQ with Redis
- **File Processing**: Multi-format document parsers (PDF, DOCX, TXT, MD, HTML, CSV, XLSX, JSON)

### Infrastructure
- **Deployment**: Docker containers with docker-compose
- **Database**: PostgreSQL 16 with pgvector extension
- **Caching**: Redis 7
- **Email**: Development support with Mailhog

## User Guide

### Getting Started

1. **Sign Up**: Create an account with email verification
2. **Configure Sources**: Add database and document connections in Settings
3. **Start Chatting**: Use natural language to query your data
4. **View Results**: Charts, tables, and documents appear in the Canvas panel
5. **Export Artifacts**: Save visualizations and reports for later use

### Operational Modes

- **Super Analyst Mode**: Read-only access with SELECT and EXPLAIN queries only
- **Super Admin Mode**: Full DDL/DML access with safety guardrails:
  - Dry-run previews with EXPLAIN and row counts
  - Typed confirmation for destructive operations
  - Transactional execution with rollback on failure
  - Complete audit logging

### Canvas Features

- **Visuals Tab**: Charts, graphs, and visualizations from query results
- **Tables Tab**: Tabular data display with sorting and filtering
- **Docs Tab**: Document search results with citations
- **Lineage Tab**: Database schema and relationship diagrams

## Development Setup

### Prerequisites

- Node.js 18+ with npm
- Docker and Docker Compose
- Git

### Local Development

1. **Clone and Install**:
   ```bash
   git clone <repository-url>
   cd webapp
   npm install
   ```

2. **Start Infrastructure**:
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

3. **Environment Setup**:
   ```bash
   cp .env.local .env.local.example
   # Edit .env.local with your configuration
   ```

4. **Initialize Database**:
   ```bash
   npm run db:init
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```

### Default Admin Credentials

- **Email**: admin@chatcanvas.local
- **Password**: admin123456
- **Note**: Change password after first login!

## Production Deployment

### Using Docker Compose

1. **Build and Deploy**:
   ```bash
   docker-compose up --build -d
   ```

2. **Initialize Database**:
   ```bash
   docker-compose exec webapp npm run db:init
   ```

3. **Access Application**:
   - Application: http://localhost:3000
   - Database: localhost:5432
   - Redis: localhost:6379

### Environment Variables

Required environment variables for production:

```bash
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-pass
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```

## Implementation Status

### ✅ Phase 1 Complete: Skeleton + Auth + Settings
- [x] Next.js application skeleton with TypeScript
- [x] Native authentication system (Argon2id + JWT cookies)
- [x] User registration and login flows
- [x] Basic settings page structure
- [x] Database schema with pgvector support
- [x] Docker infrastructure setup

### 🔄 Phase 2 In Progress: DB Connector + Analyst Mode + Canvas
- [ ] Database connection management
- [ ] Natural language to SQL conversion
- [ ] Analyst mode with read-only queries
- [ ] Basic Canvas with Vega-Lite charts
- [ ] Schema introspection

### ⏳ Phase 3 Pending: Admin Mode + Guardrails
- [ ] Admin mode with full DDL/DML access
- [ ] EXPLAIN dry-run previews
- [ ] Typed confirmation system
- [ ] Transaction wrapper with rollback
- [ ] Audit logging system

### ⏳ Phase 4 Pending: Document Processing
- [ ] S3, Supabase Storage, and folder connectors
- [ ] Multi-format document parsers
- [ ] Embedding generation and storage
- [ ] RAG pipeline with citations
- [ ] Research Brief export

### ⏳ Phase 5 Pending: Advanced Features
- [ ] Schema graph generation
- [ ] Business glossary import
- [ ] Exemplar NL→SQL library
- [ ] Data quality rules
- [ ] Index hints and optimization

### ⏳ Phase 6 Pending: Production Ready
- [ ] PDF/DOCX export functionality
- [ ] Comprehensive test suite
- [ ] Production deployment guides
- [ ] Security documentation

## Testing

```bash
# Run linting
npm run lint

# Run type checking
npx tsc --noEmit

# Run development server
npm run dev

# Build for production
npm run build
```

## Security Features

- **Native Authentication**: Argon2id password hashing with secure JWT cookies
- **SQL Injection Prevention**: Parameterized queries and input validation
- **Access Control**: Role-based permissions (analyst/admin)
- **Audit Logging**: Complete tracking of administrative actions
- **Safe Defaults**: Row limits, timeouts, and schema restrictions
- **Email Verification**: Mandatory email verification for new accounts

## Contributing

This is currently a single-phase implementation project. Future phases will be implemented sequentially with proper testing and validation at each stage.

## License

(License information to be added)

---

**Last Updated**: 2024-09-27  
**Version**: 0.1.0 (Phase 1 Complete)  
**Status**: ✅ Active Development