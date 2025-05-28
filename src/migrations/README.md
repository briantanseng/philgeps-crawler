# Database Migrations

This directory contains the database schema migration for the PhilGEPS Crawler application.

## Schema Migration

The database schema is managed by a single unified migration script:

### `schema.js`

This comprehensive migration script creates the complete database schema including:

- **Opportunities table** - Main table with 39 columns for storing procurement opportunities
- **Crawl history table** - Tracks crawler execution history and statistics
- **Categories table** - Manages procurement categories
- **Performance indexes** - 20+ indexes for optimal query performance
- **Update triggers** - Automatic timestamp updates

## Usage

### Initial Setup
```bash
# Run the migration to create/update schema
node src/migrations/schema.js
```

### Clean Installation
```bash
# Drop all tables and recreate (WARNING: This will delete all data!)
node src/migrations/schema.js --clean
```

## Database Structure

### Opportunities Table
Stores comprehensive procurement opportunity data with ITB (Invitation to Bid) fields:
- Basic information (reference number, title, procuring entity)
- Procurement details (mode, classification, category)
- Budget and timeline information
- Contact information
- Bid submission details
- Metadata and timestamps

### Performance Optimizations
The schema includes:
- 11 single-column indexes for common filters
- 6 composite indexes for multi-column queries
- 1 partial index for budget queries
- Strategic indexes on foreign keys and commonly queried fields

### Crawl History
Tracks:
- Crawl execution times
- Number of opportunities found/updated
- Error counts
- Execution duration
- Page ranges crawled

## Development Notes

1. The migration is idempotent - it can be run multiple times safely
2. Uses `CREATE TABLE IF NOT EXISTS` to avoid errors on existing tables
3. Indexes are created with `IF NOT EXISTS` clause
4. The `--clean` flag should only be used in development
5. Always backup your database before running migrations in production

## Database Location

- Development: `./data/philgeps.db`
- Production: Set via `DATABASE_PATH` environment variable

## Inspection

To inspect the database schema:
```bash
# View all tables
sqlite3 data/philgeps.db ".tables"

# View schema
sqlite3 data/philgeps.db ".schema"

# View indexes
sqlite3 data/philgeps.db ".indexes"
```