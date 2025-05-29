# Crawling Guide

This guide explains how to effectively crawl the PhilGEPS website using various options.

## Basic Crawling

### Quick Start (First Page Only)
```bash
npm run crawl
```
- Extracts opportunities from the first page only
- Fast but limited to ~20 opportunities
- Good for testing and development

## Advanced Crawling with Puppeteer

### Prerequisites
- Puppeteer must be installed (`npm install`)
- Chromium browser available (included in Docker image)

### Features
- **Automatic ITB Details Extraction**: The crawler now automatically fetches ITB (Invitation to Bid) details for each opportunity
- **State Management**: Supports resuming interrupted crawls
- **Batch Processing**: Processes opportunities in configurable batches
- **Retry Logic**: Automatic retry with exponential backoff for failed requests
- **Error Tracking**: Comprehensive error logging and recovery

### Full Page Range Crawling

#### Default Crawl (10 pages)
```bash
npm run crawl:all
```

#### Crawl First N Pages
```bash
npm run crawl:all 50        # Crawl pages 1-50
npm run crawl:all 100       # Crawl pages 1-100
```

#### Crawl Specific Page Range
```bash
npm run crawl:all 10 20     # Crawl pages 10-20
npm run crawl:all 50 100    # Crawl pages 50-100
npm run crawl:all 200 250   # Crawl pages 200-250
```

#### Resume Interrupted Crawl
```bash
npm run crawl:resume        # Resume from last saved state
```

#### Clear State and Start Fresh
```bash
npm run crawl:clean         # Clear previous state and start new crawl
```

## Crawling Strategies

### 1. Initial Full Crawl
For the first time setup, crawl a large number of pages:
```bash
npm run crawl:all 100       # Get first 2000 opportunities
```

### 2. Daily Updates
Crawl only recent pages for daily updates:
```bash
npm run crawl:all 10        # Get latest ~200 opportunities
```

### 3. Targeted Crawling
If you know specific pages have new opportunities:
```bash
npm run crawl:all 5 15      # Target specific page range
```

### 4. Distributed Crawling
For large-scale crawling, split across multiple instances:
```bash
# Instance 1
npm run crawl:all 1 100

# Instance 2
npm run crawl:all 101 200

# Instance 3
npm run crawl:all 201 300
```

## API-Based Crawling

### Trigger Crawl via API

#### Default Crawl
```bash
curl -X POST http://localhost:3000/api/crawl/trigger
```

#### Crawl Specific Pages
```bash
# Crawl pages 1-50
curl -X POST http://localhost:3000/api/crawl/trigger \
  -H "Content-Type: application/json" \
  -d '{"endPage": 50}'

# Crawl pages 100-150
curl -X POST http://localhost:3000/api/crawl/trigger \
  -H "Content-Type: application/json" \
  -d '{"startPage": 100, "endPage": 150}'
```

## Environment Variables

Configure default crawling behavior:

```env
# Default maximum pages to crawl
MAX_PAGES_TO_CRAWL=20

# Default page range
CRAWL_START_PAGE=1
CRAWL_END_PAGE=50

# Auto-crawl on startup
RUN_INITIAL_CRAWL=true

# Crawler Configuration
BATCH_SIZE=10                    # Process opportunities in batches
MAX_RETRIES=3                    # Retry failed requests
BASE_DELAY=2000                  # Base delay between requests (ms)
MAX_JITTER=1000                  # Random jitter added to delays
ITB_FETCH_DELAY=1500             # Delay between ITB detail fetches
PAGE_CRAWL_TIMEOUT=60000         # Timeout for page crawl (ms)
ITB_CRAWL_TIMEOUT=30000          # Timeout for ITB details (ms)
```

## Performance Considerations

### Page Count Guidelines (with ITB Details)

| Pages | Opportunities | Time | Memory | Use Case |
|-------|--------------|------|--------|----------|
| 1-10 | ~200 | 2-5 min | 500MB | Quick updates |
| 10-50 | ~1,000 | 10-25 min | 1GB | Daily updates |
| 50-100 | ~2,000 | 25-50 min | 1.5GB | Weekly updates |
| 100-500 | ~10,000 | 1-3 hours | 2GB | Full crawl |

*Note: Times include ITB detail fetching with delays to respect server rate limits*

### Optimization Tips

1. **Use smaller page ranges** for frequent updates
2. **Schedule large crawls** during off-peak hours
3. **Monitor memory usage** - each page adds ~10-20MB
4. **Increase delays** for stability: `REQUEST_DELAY_MS=2000`
5. **Use PostgreSQL** for better performance with large datasets

## Monitoring Crawl Progress

### Check Crawl History
```sql
-- View recent crawls with ITB statistics
SELECT 
  crawl_date,
  opportunities_found,
  new_opportunities,
  updated_opportunities,
  itb_details_fetched,
  errors,
  duration_seconds,
  page_range
FROM crawl_history 
ORDER BY crawl_date DESC 
LIMIT 10;

-- Check opportunities with ITB details
SELECT COUNT(*) AS with_itb_details
FROM opportunities 
WHERE itb_solicitation_number IS NOT NULL;
```

### View Current Statistics
```bash
curl http://localhost:3000/api/statistics
```

### Monitor Logs
```bash
# Docker
docker-compose logs -f philgeps-crawler

# Local
npm start | grep "Crawl"
```

## Troubleshooting

### Common Issues

1. **"No more pages available"**
   - The requested page range exceeds available pages
   - Check total pages first

2. **"Failed to navigate to page X"**
   - Network timeout or site changes
   - Increase `REQUEST_DELAY_MS`
   - Retry with smaller range

3. **Memory errors**
   - Too many pages in one session
   - Split into smaller ranges
   - Increase Docker memory limit

4. **Slow crawling**
   - Normal for large page ranges
   - Each page takes 10-30 seconds
   - Consider parallel crawling

### Best Practices

1. **Start small**: Test with 5-10 pages first
2. **Monitor resources**: Watch CPU and memory usage
3. **Use resume feature**: For large crawls, use `crawl:resume` to handle interruptions
4. **Schedule wisely**: Avoid peak hours on target site
5. **Keep logs**: Enable debug logging for troubleshooting
6. **Batch size tuning**: Adjust BATCH_SIZE based on your system resources
7. **Rate limiting**: Respect server limits with appropriate delays

## Advanced Usage

### Parallel Crawling Script
```bash
#!/bin/bash
# crawl-parallel.sh

# Crawl 300 pages in 3 parallel processes
npm run crawl:all 1 100 &
npm run crawl:all 101 200 &
npm run crawl:all 201 300 &

# Wait for all to complete
wait
echo "All crawls completed"
```

### Scheduled Page Range Crawling
```cron
# Crawl latest 10 pages every hour
0 * * * * cd /app && npm run crawl:all 10

# Full crawl of 100 pages every Sunday at 2 AM
0 2 * * 0 cd /app && npm run crawl:all 100
```