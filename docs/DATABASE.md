# Database Schema Documentation

## Supported Databases

The application supports two database options:

1. **SQLite3** (Default) - Lightweight, file-based database perfect for development and small deployments
2. **PostgreSQL** - Full-featured relational database for production deployments

### Choosing a Database

- **Use SQLite when:**
  - Running locally or in development
  - Small to medium data volumes (< 100k records)
  - Single instance deployment
  - Simplicity is preferred

- **Use PostgreSQL when:**
  - Running in production
  - Large data volumes
  - Multiple instances need to share data
  - Advanced querying capabilities needed
  - Using cloud services (Cloud SQL, RDS, etc.)

## Tables

### 1. opportunities

Stores all procurement opportunity information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| reference_number | TEXT | UNIQUE NOT NULL | PhilGEPS reference number |
| title | TEXT | NOT NULL | Opportunity title |
| procuring_entity | TEXT | NOT NULL | Organization posting the opportunity |
| category | TEXT | | Procurement category |
| approved_budget | REAL | | Budget amount (nullable) |
| currency | TEXT | DEFAULT 'PHP' | Currency code |
| publish_date | DATETIME | | Publication date |
| closing_date | DATETIME | | Bid closing date/time |
| status | TEXT | | Opportunity status (Open/Closed) |
| description | TEXT | | Detailed description |
| contact_person | TEXT | | Contact person name |
| contact_details | TEXT | | Contact information |
| bid_documents | TEXT | | Bid document details |
| source_url | TEXT | | Source URL |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Record creation time |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update time |

**Indexes:**
- `idx_reference_number` on reference_number
- `idx_closing_date` on closing_date
- `idx_category` on category
- `idx_procuring_entity` on procuring_entity

### 2. crawl_history

Tracks all crawling operations for monitoring and debugging.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| crawl_date | DATETIME | DEFAULT CURRENT_TIMESTAMP | When crawl started |
| opportunities_found | INTEGER | DEFAULT 0 | Total opportunities processed |
| new_opportunities | INTEGER | DEFAULT 0 | New records created |
| updated_opportunities | INTEGER | DEFAULT 0 | Existing records updated |
| errors | INTEGER | DEFAULT 0 | Number of errors encountered |
| duration_seconds | REAL | | Time taken to complete |
| status | TEXT | | Crawl status (completed/failed) |

### 3. categories

Caches category information (currently not actively used).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| name | TEXT | UNIQUE NOT NULL | Category name |
| opportunity_count | INTEGER | DEFAULT 0 | Number of opportunities |
| last_crawled | DATETIME | | Last crawl timestamp |

## Common Queries

### Search with filters
```sql
SELECT * FROM opportunities 
WHERE (title LIKE '%keyword%' OR description LIKE '%keyword%')
  AND category = 'Construction Projects'
  AND approved_budget BETWEEN 100000 AND 1000000
  AND closing_date > datetime('now')
ORDER BY closing_date ASC
LIMIT 50;
```

### Get active opportunities
```sql
SELECT * FROM opportunities 
WHERE closing_date > datetime('now')
ORDER BY closing_date ASC;
```

### Statistics query
```sql
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN closing_date > datetime('now') THEN 1 END) as active,
  COUNT(DISTINCT category) as categories,
  COUNT(DISTINCT procuring_entity) as entities
FROM opportunities;
```

### Recent crawl history
```sql
SELECT * FROM crawl_history 
ORDER BY crawl_date DESC 
LIMIT 10;
```

## Database Migrations

The database schema is created automatically on first run by `src/models/database.js`. No migration system is currently implemented.

## Backup Recommendations

1. **Regular Backups**: Copy the `.db` file regularly
   ```bash
   cp data/philgeps.db data/backup/philgeps_$(date +%Y%m%d).db
   ```

2. **Before Major Operations**: Always backup before bulk imports or schema changes

3. **Export to SQL**: 
   ```bash
   sqlite3 data/philgeps.db .dump > backup.sql
   ```

## Database Setup

### SQLite Setup

No setup required! The database file is created automatically on first run.

```bash
# Using SQLite (default)
DATABASE_TYPE=sqlite3
DATABASE_PATH=./data/philgeps.db
```

### PostgreSQL Setup

#### Option 1: Docker Compose (Recommended)

```bash
# Start PostgreSQL with pgAdmin
docker-compose -f docker-compose.postgres.yml up -d

# Access pgAdmin at http://localhost:5050
# Email: admin@example.com
# Password: admin
```

#### Option 2: Local PostgreSQL

1. Install PostgreSQL
2. Create database:
   ```sql
   CREATE DATABASE philgeps;
   ```
3. Configure environment:
   ```bash
   DATABASE_TYPE=postgres
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_USER=your_user
   POSTGRES_PASSWORD=your_password
   POSTGRES_DATABASE=philgeps
   ```

#### Option 3: Cloud PostgreSQL

For production, use managed PostgreSQL services:

**Google Cloud SQL:**
```bash
DATABASE_URL=postgresql://user:password@/database?host=/cloudsql/project:region:instance
```

**AWS RDS:**
```bash
DATABASE_URL=postgresql://user:password@hostname.rds.amazonaws.com:5432/database
```

**Heroku Postgres:**
```bash
DATABASE_URL=postgres://user:password@hostname.herokuapp.com:5432/database
```

## Performance Considerations

### SQLite Performance

1. **Indexes**: Key columns are indexed for fast searching
2. **VACUUM**: Run periodically to optimize database file
   ```sql
   VACUUM;
   ```
3. **Write-Ahead Logging**: Consider enabling for better concurrency
4. **Database Size**: Handles 100k+ records efficiently

### PostgreSQL Performance

1. **Connection Pooling**: Configured automatically with Knex
2. **Indexes**: Same indexes as SQLite, plus PostgreSQL-specific optimizations
3. **Maintenance**: Run periodic maintenance
   ```sql
   VACUUM ANALYZE;
   ```
4. **Monitoring**: Use `pg_stat_statements` for query analysis