# PhilGEPS Crawler

A modern Next.js application for searching and crawling Philippine Government Electronic Procurement System (PhilGEPS) opportunities with advanced features and real-time data management.

## 🚀 Key Features

### Search & Discovery
- 🔍 **Advanced Search** - Full-text search with keyword matching across titles and entities
- 🏷️ **Smart Filtering** - Filter by category, area of delivery, budget range, and status
- 📊 **Real-time Results** - Instant search results with pagination and sorting
- 📥 **CSV Export** - Export search results with all filters applied

### Data Visualization
- 📈 **Live Statistics Dashboard** - Real-time metrics showing:
  - Total opportunities in database
  - Active opportunities count
  - Number of categories
  - Procuring entities count
- 🎯 **Status Indicators** - Visual badges for opportunity status (Active, Closing Soon, Expired)
- ⏱️ **Days Until Closing** - Countdown display for each opportunity

### ITB Details & Expansion
- 📄 **Expandable Rows** - Interactive rows with smooth animations
  - Visual arrow indicator (▶/▼) shows expandable rows
  - "ITB" badge indicates rows with available details
  - Smooth slide-in animation when expanding/collapsing
  - State persists during pagination
- 📋 **Comprehensive ITB Information** including:
  - Solicitation details and procurement mode
  - Funding source and delivery period
  - Contact information (person, email, phone, address)
  - Pre-bid conference details
  - Bid submission and opening dates
  - Trade agreements and classifications
  - BAC (Bids and Awards Committee) information
  - Eligibility requirements and descriptions
  - Direct links to PhilGEPS pages
- 🔄 **Integrated ITB Crawling** - Automatic ITB details extraction during main crawl

### Crawler Management
- 🤖 **Enhanced Crawler v2.0** - Intelligent crawling with ITB integration
  - Automatic ITB details extraction for each opportunity
  - Batch processing with configurable batch size
  - Retry logic with exponential backoff
  - State management for resume capability
  - Comprehensive error logging and recovery
- 🎛️ **Web-based Crawler Control Panel**:
  - Enable/disable crawler with toggle switch
  - Manual crawl triggering with "Run Now" button
  - Real-time crawler status (Active/Inactive/Running)
  - Auto-refreshing status every 10 seconds
- 📊 **Crawl History & Metrics**:
  - Last crawl timestamp and duration
  - Opportunities found, new, and updated counts
  - ITB details fetched count
  - Error tracking and status reporting
  - Success rate and performance metrics

### Technical Features
- ⚡ **Next.js 14 App Router** - Modern React framework with server components
- 🗄️ **SQLite Database** - Efficient local storage with automatic schema migration
- 🎨 **Tailwind CSS** - Responsive, mobile-first design
- 📱 **Fully Responsive** - Optimized for desktop, tablet, and mobile devices
- 🧪 **Comprehensive Testing** - E2E tests with Playwright across multiple browsers
- 🔄 **Real-time Updates** - Automatic UI updates without page refresh

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Chrome/Chromium (for Puppeteer-based crawling)

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd philgeps-crawler
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

4. **Initialize the database**
```bash
npm run migrate
```

5. **Start the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📁 Project Structure

```
philgeps-crawler/
├── app/                        # Next.js 14 App Directory
│   ├── api/                   # API Routes
│   │   ├── areas/            # Area reference data
│   │   ├── categories/       # Category reference data
│   │   ├── crawler/          # Crawler control endpoints
│   │   ├── opportunities/    # Search and export
│   │   └── statistics/       # Dashboard metrics
│   ├── layout.tsx            # Root layout with metadata
│   └── page.tsx              # Home page with search UI
├── components/                # React Components
│   ├── CrawlerControl.tsx    # Crawler management panel
│   ├── OpportunitiesTable.tsx # TanStack Table with ITB expansion
│   ├── SearchForm.tsx        # Advanced search form
│   └── Statistics.tsx        # Metrics dashboard
├── lib/                      # Core Libraries
│   ├── db.ts                # Database connection
│   ├── crawler/             # Crawler service
│   ├── services/            # Business logic
│   │   └── searchService.ts # Search and formatting
│   └── utils/               # Utilities
│       └── dateFormat.ts    # Date/number formatting
├── src/                     # Legacy Crawler Code
│   ├── scrapers/           # Web scraping logic
│   │   ├── PhilGEPSScraper.js    # Main scraper
│   │   ├── ITBDetailScraper.js   # ITB details
│   │   └── PuppeteerScraper.js   # Browser automation
│   ├── services/           # Crawler services
│   └── migrations/         # Database schema
├── tests/                  # Test Suites
│   └── e2e/               # Playwright E2E tests
├── public/                # Static assets
└── data/                  # SQLite database (auto-created)
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following:

```env
# Database
DATABASE_PATH=./data/philgeps.db

# Crawler Configuration
CRAWL_INTERVAL_MINUTES=60         # How often to run crawler
MAX_PAGES_TO_CRAWL=10            # Pages per crawl run
REQUEST_DELAY_MS=2000            # Delay between requests
CRAWLER_TIMEOUT_SECONDS=300      # Overall timeout

# Enhanced Crawler Settings
BATCH_SIZE=10                    # Process opportunities in batches
MAX_RETRIES=3                    # Retry failed requests
BASE_DELAY=2000                  # Base delay between requests (ms)
MAX_JITTER=1000                  # Random jitter added to delays
ITB_FETCH_DELAY=1500             # Delay between ITB detail fetches
ITB_MAX_JITTER=500               # Jitter for ITB fetches
PAGE_CRAWL_TIMEOUT=60000         # Timeout for page crawl (ms)
ITB_CRAWL_TIMEOUT=30000          # Timeout for ITB details (ms)

# Development
NODE_ENV=development
```

### Available Scripts

```bash
# Development
npm run dev                 # Start Next.js dev server
npm run build              # Build for production
npm start                  # Start production server

# Testing
npm run test               # Run all tests
npm run test:e2e           # Run E2E tests only
npm run test:unit          # Run unit tests only
npm run test:coverage      # Generate coverage report

# Crawler Operations
npm run background:crawler  # Start background crawler service
npm run crawl              # Run one-time crawl (first page only)
npm run crawl:all          # Enhanced crawler with ITB details extraction
npm run crawl:all 50       # Crawl first 50 pages
npm run crawl:all 10 20    # Crawl pages 10-20
npm run crawl:resume       # Resume interrupted crawl from saved state
npm run crawl:clean        # Clear crawler state and start fresh
npm run migrate            # Run database migrations

# Code Quality
npm run lint               # Run ESLint
npm run type-check         # Run TypeScript checks
```

## 🌐 API Reference

### Opportunities Endpoints

#### Search Opportunities
```http
GET /api/opportunities/search
```
Query parameters:
- `q` - Search keywords
- `category` - Filter by category
- `areaOfDelivery` - Filter by area
- `minBudget` - Minimum budget
- `maxBudget` - Maximum budget
- `activeOnly` - Show only active opportunities
- `limit` - Results per page (default: 50)
- `offset` - Pagination offset

#### Export to CSV
```http
GET /api/opportunities/export
```
Same query parameters as search. Returns CSV file download.

### Reference Data Endpoints

#### Get Statistics
```http
GET /api/statistics
```
Returns:
```json
{
  "success": true,
  "data": {
    "total": 1000,
    "active": 250,
    "categories": 15,
    "entities": 200
  }
}
```

#### Get Categories
```http
GET /api/categories
```

#### Get Areas
```http
GET /api/areas
```

### Crawler Control Endpoints

#### Get Crawler Status
```http
GET /api/crawler/status
```
Returns current status, last crawl info, and configuration.

#### Toggle Crawler
```http
POST /api/crawler/toggle
Body: { "enabled": true/false }
```

#### Run Manual Crawl
```http
POST /api/crawler/run
```

## 🧪 Testing

The project includes comprehensive E2E tests using Playwright:

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode
npm run test:e2e -- --ui

# Run specific test file
npm run test:e2e search.spec.ts

# Generate HTML report
npm run test:e2e -- --reporter=html
```

Test coverage includes:
- Homepage functionality
- Search and filtering
- Crawler controls
- ITB detail expansion
- Export functionality
- Cross-browser compatibility (Chrome, Firefox, Safari, Mobile)

## 🚀 Deployment

### Docker Deployment

```bash
# Build image
docker build -t philgeps-crawler .

# Run container
docker run -p 3000:3000 -v $(pwd)/data:/app/data philgeps-crawler
```

### Google Cloud Run

```bash
# Build and deploy
gcloud builds submit --config cloudbuild.yaml
```

### Traditional Server

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

3. Run crawler as a separate process:
```bash
# Using PM2
pm2 start npm --name "philgeps-crawler" -- run background:crawler

# Using systemd (create service file)
# See docs/DEPLOYMENT.md for details
```

### Vercel Deployment

1. Push to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy (Note: crawler needs separate hosting)

## 📊 Database Schema

The application uses SQLite with the following main tables:

### opportunities
- Core procurement data with 40+ fields
- ITB details integrated into main table
- Comprehensive indexing for performance

### crawl_history
- Tracks all crawler runs
- Stores metrics and error information

See `DATABASE_SCHEMA.md` for complete schema documentation.

## 🔍 Performance Features

- **Efficient Pagination** - Server-side pagination with TanStack Table
- **Smart Caching** - Browser caching for static assets
- **Optimized Queries** - Database indexes on all searchable fields
- **Lazy Loading** - ITB details loaded only when expanded
- **Debounced Search** - Prevents excessive API calls

## 🛡️ Security Features

- **Input Sanitization** - All user inputs are sanitized
- **SQL Injection Prevention** - Parameterized queries
- **XSS Protection** - React's built-in XSS prevention
- **CORS Configuration** - Proper CORS headers
- **Rate Limiting** - API rate limiting (configurable)

## 📱 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- PhilGEPS for providing public procurement data
- Next.js team for the amazing framework
- TanStack for the powerful table library
- All contributors and testers