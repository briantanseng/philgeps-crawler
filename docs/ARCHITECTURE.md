# Architecture Overview

## System Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                 │     │                  │     │                 │
│  PhilGEPS Site  │────▶│  Web Scrapers    │────▶│  SQLite DB      │
│                 │     │  (Puppeteer)     │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │                          ▲
                                ▼                          │
                        ┌──────────────────┐               │
                        │                  │               │
                        │  Services Layer  │───────────────┘
                        │                  │
                        └──────────────────┘
                                │
                        ┌───────┴────────┐
                        │                │
                ┌───────▼──────┐ ┌──────▼───────┐
                │              │ │              │
                │ Next.js API  │ │   Next.js    │
                │   Routes     │ │   Web UI     │
                └──────────────┘ └──────────────┘
```

## Modern Architecture Stack

### Frontend (Next.js 14 App Router)
- **Framework**: Next.js 14 with App Router
- **UI Library**: React 18 with Server Components
- **Styling**: Tailwind CSS for responsive design
- **State Management**: React hooks and TanStack Table
- **Data Fetching**: Native fetch with Next.js caching

### Backend (Next.js API Routes)
- **API Layer**: Next.js API routes with TypeScript
- **Database**: SQLite with better-sqlite3
- **Services**: Modular service architecture
- **Background Jobs**: Separate Node.js crawler process

### Data Layer
- **Primary Storage**: SQLite database
- **Schema**: Normalized with comprehensive indexes
- **Migrations**: Automated schema management
- **Query Builder**: Raw SQL with parameterized queries

## Directory Structure

```
philgeps-crawler/
├── app/                      # Next.js 14 App Directory
│   ├── api/                 # API Routes
│   │   ├── areas/          # GET /api/areas
│   │   ├── categories/     # GET /api/categories  
│   │   ├── crawler/        # Crawler control endpoints
│   │   │   ├── history/    # GET /api/crawler/history
│   │   │   ├── run/        # POST /api/crawler/run
│   │   │   ├── status/     # GET /api/crawler/status
│   │   │   └── toggle/     # POST /api/crawler/toggle
│   │   ├── opportunities/  # Opportunity endpoints
│   │   │   ├── export/     # GET /api/opportunities/export
│   │   │   └── search/     # GET /api/opportunities/search
│   │   └── statistics/     # GET /api/statistics
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Home page component
│   └── globals.css         # Global styles with Tailwind
│
├── components/              # React Components
│   ├── CrawlerControl.tsx  # Crawler management UI
│   ├── OpportunitiesTable.tsx # TanStack Table implementation
│   ├── SearchForm.tsx      # Advanced search form
│   └── Statistics.tsx      # Statistics dashboard
│
├── lib/                    # Core Libraries
│   ├── db.ts              # Database connection singleton
│   ├── crawler/           # Crawler service
│   │   └── crawlerService.js
│   ├── services/          # Business logic
│   │   └── searchService.ts
│   └── utils/             # Utilities
│       └── dateFormat.ts  # Date/number formatting
│
├── src/                   # Legacy Crawler (Node.js)
│   ├── scrapers/         # Web scraping engines
│   │   ├── PhilGEPSScraper.js    # Base HTTP scraper
│   │   ├── PuppeteerScraper.js   # Browser automation
│   │   ├── ITBDetailScraper.js   # ITB details parser
│   │   └── RFQDetailScraper.js   # RFQ details parser
│   ├── services/         # Crawler services
│   │   ├── CrawlerService.js     # Orchestration
│   │   └── ReferenceDataService.js # Reference data
│   ├── models/           # Data models
│   │   ├── database.js   # Legacy DB connection
│   │   ├── Opportunity.js # Opportunity model
│   │   └── db.js         # Knex configuration
│   └── migrations/       # Database migrations
│       └── schema.js     # Complete schema definition
│
├── tests/                # Test Suites
│   ├── e2e/             # Playwright E2E tests
│   │   ├── homepage.spec.ts
│   │   ├── search.spec.ts
│   │   └── crawler-control.spec.ts
│   ├── integration/     # Integration tests
│   └── unit/           # Unit tests
│
├── public/             # Static assets
├── data/               # Database storage
└── docs/               # Documentation
```

## Component Architecture

### 1. Web UI Layer (Next.js)

#### Server Components
- **Page Components**: Server-rendered for SEO
- **Layout**: Shared layout with metadata
- **Data Fetching**: Direct database queries

#### Client Components
- **SearchForm**: Interactive search with real-time validation
- **OpportunitiesTable**: TanStack Table with expansion
- **CrawlerControl**: Real-time status updates
- **Statistics**: Auto-refreshing metrics

### 2. API Layer (Next.js API Routes)

#### Opportunity Endpoints
- **Search**: Advanced filtering with pagination
- **Export**: CSV generation with streaming

#### Reference Data Endpoints
- **Categories**: Cached category list
- **Areas**: Cached area list
- **Statistics**: Aggregated metrics

#### Crawler Control Endpoints
- **Status**: Real-time crawler state
- **Toggle**: Enable/disable crawler
- **Run**: Manual trigger
- **History**: Crawl logs

### 3. Service Layer

#### SearchService (TypeScript)
- Query building with SQL injection prevention
- Result formatting and enrichment
- Pagination and sorting logic
- Export functionality

#### CrawlerService (JavaScript)
- Orchestrates crawling operations
- Manages crawler state
- Records history
- Error handling and recovery

### 4. Data Access Layer

#### Database Connection
- Singleton pattern for connection reuse
- Automatic initialization
- Migration on startup
- Connection pooling

#### Models
- **Opportunity**: Main data model
- **CrawlHistory**: Audit trail
- **Categories**: Reference data

### 5. Scraping Layer

#### PuppeteerScraper
- Headless Chrome automation
- JavaScript rendering support
- Pagination handling
- Request throttling

#### ITBDetailScraper
- Integrated into main crawl process
- Automatic ITB details extraction for each opportunity
- Field mapping and validation
- Retry logic with exponential backoff

## Data Flow Patterns

### 1. Search Flow
```
User Input → SearchForm → API Route → SearchService → Database → Format → Response
```

### 2. Crawl Flow
```
Trigger → CrawlerService → PuppeteerScraper → Parse → ITBDetailScraper → Validate → Database → History
```

### 3. Real-time Updates
```
Client → Poll API → Check State → Update UI → Set Timeout → Repeat
```

## State Management

### Client State
- **React State**: Component-level state
- **TanStack Table**: Table state management
- **Form State**: Controlled components

### Server State
- **Database**: Source of truth
- **Crawler State**: File-based persistence
- **Cache**: In-memory for reference data

## Performance Optimizations

### Database
- **Indexes**: 15+ indexes for query performance
- **Prepared Statements**: Query plan caching
- **Connection Reuse**: Singleton pattern

### Frontend
- **Server Components**: Reduced client bundle
- **Lazy Loading**: ITB details on demand
- **Memoization**: Expensive computations cached
- **Virtual Scrolling**: Large dataset handling

### API
- **Streaming**: CSV export streaming
- **Pagination**: Server-side limiting
- **Caching**: Reference data caching

## Security Architecture

### Input Validation
- **Parameterized Queries**: SQL injection prevention
- **Type Validation**: TypeScript + runtime checks
- **Sanitization**: User input cleaning

### Access Control
- **CORS**: Configured for production
- **Rate Limiting**: API throttling
- **Error Handling**: No sensitive data leakage

## Deployment Architecture

### Development
```
Next.js Dev Server (Port 3000) + Background Crawler
```

### Production Options

#### Docker Deployment
```
Container 1: Next.js App (Port 3000)
Container 2: Crawler Service
Volume: Shared database
```

#### Traditional Deployment
```
PM2/Systemd → Next.js App
PM2/Systemd → Crawler Service
Shared filesystem for database
```

#### Cloud Deployment (Google Cloud Run)
```
Cloud Run Service: Next.js App
Cloud Scheduler: Crawler triggers
Cloud Storage: Database persistence
```

## Scalability Considerations

### Current Limitations
- **SQLite**: Single-writer limitation
- **Crawler**: Single-instance only
- **Memory**: Large result sets

### Future Scalability
- **PostgreSQL**: Multi-connection support
- **Redis**: Caching and queuing
- **Worker Pools**: Parallel crawling
- **CDN**: Static asset delivery

## Technology Stack Summary

### Frontend
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- TanStack Table

### Backend
- Node.js v18+
- SQLite3 + better-sqlite3
- Puppeteer
- Express.js (legacy API)

### Testing
- Playwright (E2E)
- Jest (Unit/Integration)
- React Testing Library

### DevOps
- Docker
- GitHub Actions
- Google Cloud Platform