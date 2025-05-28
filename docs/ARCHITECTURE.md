# Architecture Overview

## System Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                 │     │                  │     │                 │
│  PhilGEPS Site  │────▶│  Web Scrapers    │────▶│  SQLite DB      │
│                 │     │                  │     │                 │
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
                │   REST API   │ │   Web UI     │
                │              │ │              │
                └──────────────┘ └──────────────┘
```

## Directory Structure

```
philgeps-crawler/
├── src/
│   ├── scrapers/          # Web scraping implementations
│   │   ├── PhilGEPSScraper.js      # Basic HTTP scraper
│   │   └── PuppeteerScraper.js     # Headless browser scraper
│   │
│   ├── models/            # Data models and database
│   │   ├── database.js    # Database connection and schema
│   │   └── Opportunity.js # Opportunity model with CRUD operations
│   │
│   ├── services/          # Business logic layer
│   │   ├── CrawlerService.js  # Orchestrates crawling operations
│   │   └── SearchService.js   # Search and filter logic
│   │
│   ├── api/               # REST API
│   │   └── routes.js      # Express route definitions
│   │
│   ├── index.js           # Main application entry point
│   ├── crawl.js           # CLI for manual crawling
│   ├── crawl-all.js       # CLI for full pagination crawling
│   └── search.js          # CLI for interactive search
│
├── public/                # Static web UI files
│   └── index.html         # Single-page search interface
│
├── data/                  # Database storage
│   └── philgeps.db        # SQLite database file
│
└── docs/                  # Documentation
    ├── API.md            # API endpoint documentation
    ├── ARCHITECTURE.md   # This file
    └── DATABASE.md       # Database schema documentation
```

## Component Descriptions

### Scrapers
- **PhilGEPSScraper**: Uses axios and cheerio for basic HTML parsing. Limited to first page due to ASP.NET postback requirements.
- **PuppeteerScraper**: Uses Puppeteer (headless Chrome) to handle JavaScript and pagination.

### Models
- **database.js**: Initializes SQLite database, creates tables, and provides database connection.
- **Opportunity.js**: Data access layer for opportunities with methods for insert, search, and statistics.

### Services
- **CrawlerService**: Coordinates the crawling process, handles errors, and records crawl history.
- **SearchService**: Implements search logic, filtering, formatting, and CSV export functionality.

### API
- **routes.js**: Defines all REST API endpoints using Express.js framework.

### Entry Points
- **index.js**: Main application that starts the web server and scheduled crawler.
- **crawl.js**: Command-line tool for manual crawling (first page only).
- **crawl-all.js**: Command-line tool for full crawling with pagination support.
- **search.js**: Interactive command-line search interface.

## Data Flow

1. **Crawling Process**:
   - Scraper fetches HTML from PhilGEPS website
   - Parser extracts opportunity data from HTML
   - CrawlerService validates and saves data to database
   - Crawl history is recorded for monitoring

2. **Search Process**:
   - User submits search query via API or CLI
   - SearchService queries database with filters
   - Results are formatted with additional metadata
   - Response sent back to client

3. **Scheduled Operations**:
   - Cron job triggers crawler at configured intervals
   - Crawler runs in background without blocking API
   - New data becomes immediately available for search

## Technology Stack

- **Runtime**: Node.js v22+
- **Database**: SQLite3 with better-sqlite3 driver
- **Web Framework**: Express.js
- **Scraping**: Axios, Cheerio, Puppeteer
- **Scheduling**: node-cron
- **Environment**: dotenv for configuration

## Configuration

All configuration is managed through environment variables:
- `PHILGEPS_BASE_URL`: Target URL for crawling
- `DATABASE_PATH`: SQLite database location
- `CRAWL_INTERVAL_MINUTES`: Auto-crawl frequency
- `REQUEST_DELAY_MS`: Delay between requests
- `PORT`: Web server port

## Security Considerations

1. **Rate Limiting**: Configurable delays prevent overwhelming target server
2. **Input Validation**: All user inputs are sanitized before database queries
3. **No Authentication**: Currently open access - add auth for production
4. **CORS**: Enabled for development - restrict in production