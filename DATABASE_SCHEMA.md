# PhilGEPS Crawler Database Schema

This document describes the database schema used by the PhilGEPS Crawler application.

## Database Type
- **SQLite** (default) or **PostgreSQL** (configurable via environment variables)
- Database file location: `./data/philgeps.db` (SQLite)

## Tables

### 1. opportunities
Main table storing all scraped opportunity/tender information from PhilGEPS.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| reference_number | TEXT | UNIQUE NOT NULL | PhilGEPS reference number |
| title | TEXT | NOT NULL | Opportunity title |
| procuring_entity | TEXT | NOT NULL | Organization posting the opportunity |
| solicitation_number | TEXT | | ITB/RFQ solicitation number |
| area_of_delivery | TEXT | | Geographic area for delivery |
| trade_agreement | TEXT | | Applicable trade agreements |
| procurement_mode | TEXT | | Method of procurement |
| classification | TEXT | | Procurement classification |
| category | TEXT | | Opportunity category |
| approved_budget | REAL | | Approved budget amount |
| currency | TEXT | DEFAULT 'PHP' | Currency code |
| delivery_period | TEXT | | Expected delivery timeframe |
| publish_date | DATETIME | | Date opportunity was published |
| closing_date | DATETIME | | Bid submission deadline |
| date_published | TEXT | | Alternative publish date format |
| last_updated | TEXT | | Last update timestamp |
| contact_person | TEXT | | Contact person name |
| contact_designation | TEXT | | Contact person title |
| contact_address | TEXT | | Contact address |
| contact_phone | TEXT | | Contact phone number |
| contact_email | TEXT | | Contact email address |
| client_agency | TEXT | | Client agency name |
| bid_supplements | INTEGER | DEFAULT 0 | Number of bid supplements |
| document_request_list | INTEGER | DEFAULT 0 | Document request count |
| bid_documents_fee | TEXT | | Fee for bid documents |
| bid_submission_deadline | DATETIME | | Deadline for bid submission |
| bid_opening_date | DATETIME | | Date bids will be opened |
| pre_bid_conference | TEXT | | Pre-bid conference details |
| status | TEXT | | Opportunity status (Open/Closed) |
| description | TEXT | | Detailed description |
| eligibility_requirements | TEXT | | Eligibility requirements |
| created_by | TEXT | | User who created the opportunity |
| bac_chairman | TEXT | | BAC Chairman name |
| bac_secretariat | TEXT | | BAC Secretariat details |
| source_url | TEXT | | URL where opportunity was found |
| detail_url | TEXT | | Direct URL to opportunity details |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Record update timestamp |

#### Indexes
- `idx_reference_number` on `reference_number`
- `idx_closing_date` on `closing_date`
- `idx_category` on `category`
- `idx_procuring_entity` on `procuring_entity`
- `idx_solicitation_number` on `solicitation_number`
- `idx_procurement_mode` on `procurement_mode`

### 2. crawl_history
Tracks the history of crawling operations for monitoring and debugging.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| crawl_date | DATETIME | DEFAULT CURRENT_TIMESTAMP | When crawl was executed |
| opportunities_found | INTEGER | DEFAULT 0 | Total opportunities found |
| new_opportunities | INTEGER | DEFAULT 0 | New opportunities added |
| updated_opportunities | INTEGER | DEFAULT 0 | Existing opportunities updated |
| errors | INTEGER | DEFAULT 0 | Number of errors encountered |
| duration_seconds | REAL | | Time taken for crawl operation |
| status | TEXT | | Crawl status (success/failed/partial) |

### 3. categories
Stores category information and statistics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| name | TEXT | UNIQUE NOT NULL | Category name |
| opportunity_count | INTEGER | DEFAULT 0 | Number of opportunities in category |
| last_crawled | DATETIME | | Last time category was crawled |

## Reference Data (JSON Files)

### categories.json
Official PhilGEPS categories extracted from the search page.
- Location: `./data/categories.json`
- Structure: Array of objects with `value` and `text` properties
- Total: 168 categories

### areas.json
Official PhilGEPS areas of delivery extracted from the search page.
- Location: `./data/areas.json`
- Structure: Array of objects with `value` and `text` properties
- Total: 86 areas including regions, provinces, and cities

## Data Flow

1. **Scraping**: PuppeteerScraper extracts opportunity data from PhilGEPS
2. **Storage**: Opportunities are inserted/updated using the Opportunity model
3. **Search**: SearchService queries the database with various filters
4. **API**: RESTful endpoints expose the data for web interface and exports

## Migration History

1. **Initial Schema**: Basic opportunities table with core fields
2. **ITB Update**: Expanded schema to include detailed ITB (Invitation to Bid) fields
   - Added procurement details (solicitation_number, procurement_mode, etc.)
   - Added contact information fields
   - Added bid-related fields
   - Migration preserved existing 1600 records

## Query Patterns

### Common Queries
```sql
-- Active opportunities
SELECT * FROM opportunities 
WHERE closing_date > datetime('now') 
ORDER BY closing_date ASC;

-- Search by keyword
SELECT * FROM opportunities 
WHERE title LIKE '%keyword%' 
   OR description LIKE '%keyword%' 
   OR procuring_entity LIKE '%keyword%';

-- Filter by category and area
SELECT * FROM opportunities 
WHERE category = 'Construction' 
  AND area_of_delivery = 'NCR';

-- Statistics
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN closing_date > datetime('now') THEN 1 END) as active,
  COUNT(DISTINCT category) as categories,
  COUNT(DISTINCT procuring_entity) as entities
FROM opportunities;
```

## Performance Considerations

1. **Indexes**: Strategic indexes on commonly queried fields
2. **Pagination**: Results are paginated with limit/offset
3. **Text Search**: Uses LIKE queries for flexibility (consider FTS for scale)
4. **Date Filtering**: Efficient datetime comparisons for active opportunities

## Data Integrity

1. **Unique Constraints**: reference_number ensures no duplicates
2. **Default Values**: Sensible defaults for optional fields
3. **Data Types**: Appropriate types for each field (TEXT, REAL, INTEGER, DATETIME)
4. **Foreign Keys**: Enabled in SQLite for referential integrity