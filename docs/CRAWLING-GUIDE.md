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
```

## Performance Considerations

### Page Count Guidelines

| Pages | Opportunities | Time | Memory | Use Case |
|-------|--------------|------|--------|----------|
| 1-10 | ~200 | 1-2 min | 500MB | Quick updates |
| 10-50 | ~1,000 | 5-10 min | 1GB | Daily updates |
| 50-100 | ~2,000 | 10-20 min | 1.5GB | Weekly updates |
| 100-500 | ~10,000 | 30-60 min | 2GB | Full crawl |

### Optimization Tips

1. **Use smaller page ranges** for frequent updates
2. **Schedule large crawls** during off-peak hours
3. **Monitor memory usage** - each page adds ~10-20MB
4. **Increase delays** for stability: `REQUEST_DELAY_MS=2000`
5. **Use PostgreSQL** for better performance with large datasets

## Monitoring Crawl Progress

### Check Crawl History
```sql
SELECT * FROM crawl_history ORDER BY crawl_date DESC LIMIT 10;
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
3. **Handle failures**: Implement retry logic for failed pages
4. **Schedule wisely**: Avoid peak hours on target site
5. **Keep logs**: Enable debug logging for troubleshooting

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