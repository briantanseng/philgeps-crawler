# PhilGEPS Crawler

A web crawler and search application for Philippine Government Electronic Procurement System (PhilGEPS) opportunities.

## 🚀 Quick Start with Docker

```bash
# Using Docker Compose (recommended)
docker-compose up -d

# Access the application
open http://localhost:8080
```

## ☁️ Deploy to Google Cloud Run

```bash
gcloud run deploy philgeps-crawler \
  --source . \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated
```

## Features

- **Automated Web Crawling**: Regularly crawls PhilGEPS website to fetch latest procurement opportunities
- **Keyword Search**: Search opportunities by keywords across titles, descriptions, and procuring entities
- **Advanced Filtering**: Filter by category, budget range, and status (active/expired)
- **Dual Database Support**: Choose between SQLite (simple) or PostgreSQL (scalable)
- **REST API**: Access data programmatically via API endpoints
- **Web UI**: Simple web interface for searching and browsing opportunities
- **CSV Export**: Export search results to CSV format
- **Scheduled Crawling**: Automatic crawling at configurable intervals
- **Crawler Control**: Web-based toggle to enable/disable crawler with manual run option
- **Docker Ready**: Easy deployment with Docker and Docker Compose
- **Cloud Ready**: Optimized for Google Cloud Run deployment

## Installation

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd philgeps-crawler

# Using SQLite (default)
docker-compose up -d

# OR using PostgreSQL
docker-compose -f docker-compose.postgres.yml up -d
```

### Option 2: Local Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd philgeps-crawler
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure settings in `.env` (optional)

## Usage

### Start the Application (with scheduled crawling)

```bash
npm start
```

This will:
- Start the web server on http://localhost:3000
- Schedule automatic crawling based on CRAWL_INTERVAL_MINUTES
- Ask if you want to run an initial crawl

### Manual Crawl

Basic crawl (first page only):
```bash
npm run crawl
```

Full crawl with pagination (requires Puppeteer):
```bash
# Crawl 10 pages (default)
npm run crawl:all

# Crawl first N pages
npm run crawl:all 50

# Crawl specific page range
npm run crawl:all 10 20    # Crawl pages 10 to 20
npm run crawl:all 100 150  # Crawl pages 100 to 150
```

### Command Line Search

```bash
npm run search
```

This opens an interactive CLI for searching opportunities.

### Web Interface

Open http://localhost:3000 in your browser to access the web UI.

Features:
- Search and filter opportunities
- View statistics dashboard
- Control crawler (enable/disable automatic crawling)
- Manually trigger crawler runs
- Monitor crawler status and schedule

## API Endpoints

### Search Opportunities
```
GET /api/opportunities/search?q=keyword&category=IT&minBudget=100000&maxBudget=1000000&activeOnly=true
```

### Get Active Opportunities
```
GET /api/opportunities/active
```

### Get Opportunities by Category
```
GET /api/opportunities/category/:category
```

### Get All Categories
```
GET /api/categories
```

### Get Statistics
```
GET /api/statistics
```

### Export to CSV
```
GET /api/opportunities/export?q=keyword&category=IT&activeOnly=true
```

### Trigger Manual Crawl
```
POST /api/crawl/trigger
```

### Get Crawl History
```
GET /api/crawl/history
```

### Crawler Control
```
GET /api/crawler/status     # Get crawler status and schedule
POST /api/crawler/toggle    # Enable/disable crawler
POST /api/crawler/run       # Manually trigger crawler
```

## Project Structure

```
philgeps-crawler/
├── src/
│   ├── scrapers/         # Web scraping logic
│   ├── models/           # Database models
│   ├── services/         # Business logic
│   ├── api/              # REST API routes
│   ├── index.js          # Main application entry
│   ├── crawl.js          # Manual crawl script
│   └── search.js         # CLI search tool
├── public/               # Web UI files
├── data/                 # SQLite database location
├── tests/                # Test files
├── docs/                 # Documentation
│   ├── API.md           # API endpoint reference
│   ├── ARCHITECTURE.md  # System architecture
│   ├── DATABASE.md      # Database schema
│   ├── DEPLOYMENT.md    # Cloud deployment guide
│   ├── DOCKER-QUICKSTART.md # Docker quick start
│   └── CRAWLER_TOGGLE_FEATURE.md # Crawler control documentation
├── Dockerfile           # Docker container definition
├── docker-compose.yml   # Docker Compose configuration
└── cloudbuild.yaml      # Google Cloud Build config
```

## Database Options

### SQLite (Default)
- Simple file-based database
- No setup required
- Perfect for development and small deployments
- **Cloud Run**: Supports persistent storage via GCS volume mount

### PostgreSQL
- Full-featured relational database
- Better for production and multi-instance deployments
- Use `docker-compose -f docker-compose.postgres.yml up` for easy setup

See [Database Documentation](docs/DATABASE.md) for detailed schema and setup instructions.

## Cloud Run Deployment with Persistent Storage

When deploying to Google Cloud Run with SQLite, use GCS volume mount for persistence:

```bash
# Set up GCS volume mount
cd scripts && ./setup-gcs-volume.sh

# Deploy with persistent SQLite
gcloud builds submit --substitutions=_DATABASE_TYPE=sqlite3
```

See [GCS Volume Mount Guide](docs/GCS-VOLUME-MOUNT.md) for details.

## Development

### Running in Development Mode

```bash
npm run dev
```

This uses Node.js --watch flag for auto-restart on file changes.

### Testing

```bash
npm test
```

## Notes

- The crawler respects rate limiting with configurable delays between requests
- Initial crawl may take several minutes depending on the number of opportunities
- The web UI updates in real-time as new data is crawled
- All dates/times are stored in ISO format in the database
- The basic crawler (`npm run crawl`) only extracts from the first page due to ASP.NET postback limitations
- Use `npm run crawl:all` for full pagination support (requires Puppeteer installation)
- PhilGEPS has over 24,000 active opportunities across 1,200+ pages

## Troubleshooting

### Common Issues

1. **Socket hang up / Connection errors**
   - Increase `REQUEST_DELAY_MS` to 5000 or 10000
   - Set `MAX_CONCURRENT_REQUESTS=1`
   - Use smaller page ranges (5-10 pages)

2. **Timeout errors**
   - Increase `CRAWLER_TIMEOUT_SECONDS`
   - Check internet connection stability

3. **Database locked errors**
   - Ensure only one instance is running
   - Consider switching to PostgreSQL

4. **No opportunities found**
   - Check if PhilGEPS website is accessible
   - Try the basic crawler first: `npm run crawl`

See [Troubleshooting Guide](docs/TROUBLESHOOTING.md) for detailed solutions.

## Documentation

- 📖 [API Reference](docs/API.md) - REST API endpoints
- 🏗️ [Architecture](docs/ARCHITECTURE.md) - System design and components
- 💾 [Database Schema](docs/DATABASE.md) - SQLite table structure
- 🚀 [Deployment Guide](docs/DEPLOYMENT.md) - Deploy to Google Cloud Run
- 🐳 [Docker Quick Start](docs/DOCKER-QUICKSTART.md) - Docker setup guide
- 🔧 [Configuration](docs/CONFIGURATION.md) - Environment variables
- 🕷️ [Crawling Guide](docs/CRAWLING-GUIDE.md) - Page range crawling strategies
- 🎛️ [Crawler Control](docs/CRAWLER_TOGGLE_FEATURE.md) - Web-based crawler management
- 🚨 [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions

## License

MIT