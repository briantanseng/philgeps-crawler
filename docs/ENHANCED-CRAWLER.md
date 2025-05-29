# Enhanced PhilGEPS Crawler v2.0

The enhanced crawler (`crawl-all.js`) now includes several advanced features for robust and efficient data collection.

## Features

### 1. **Jitter and Smart Delays**
- Random jitter (0-1000ms) added to base delays to avoid detection
- Configurable base delay between requests (default: 2000ms)
- Separate delays for page crawls and ITB detail fetches

### 2. **Retry Logic with Exponential Backoff**
- Automatic retry up to 3 times for failed requests
- Exponential backoff: delays double with each retry (2s, 4s, 8s)
- Separate retry logic for page crawls and ITB details

### 3. **Batch Processing**
- Processes opportunities in configurable batches (default: 10)
- Provides detailed summary after each batch
- Saves state after each batch for better recovery

### 4. **ITB Details Integration**
- Automatically fetches ITB details for each opportunity
- Merges ITB data with opportunity data before saving
- Tracks ITB fetch success rate

### 5. **Enhanced Restart Capability**
- Saves state after each batch, not just each page
- Tracks individual processed opportunities
- Resume from exact last processed item
- Maintains all statistics across restarts

### 6. **Comprehensive Statistics**
- Pages crawled
- Opportunities found/new/updated
- ITB details fetched
- Errors and retries
- Success rates
- Average processing time

## Usage

### Basic Commands

```bash
# Crawl first 10 pages (default)
npm run crawl:all

# Crawl specific number of pages
npm run crawl:all 20

# Crawl page range
npm run crawl:all 5 15

# Resume interrupted crawl
npm run crawl:all -- --resume

# Clean start (clear previous state)
npm run crawl:all -- --clean

# Combine flags
npm run crawl:all -- --clean 50
```

### Configuration

Environment variables in `.env`:

```env
# Base delays (milliseconds)
REQUEST_DELAY_MS=2000
ITB_FETCH_DELAY=1500

# Retry configuration
MAX_RETRIES=3

# Batch size
BATCH_SIZE=10

# Timeouts
PAGE_CRAWL_TIMEOUT=60000
ITB_CRAWL_TIMEOUT=30000

# Disable ITB fetching in PuppeteerScraper (we handle it separately)
FETCH_ITB_DETAILS=false
```

### Output Example

```
PhilGEPS Enhanced Crawler v2.0
================================

🚀 Starting enhanced crawl from page 1 to 10...
   Batch size: 10 opportunities
   Max retries: 3
   Base delay: 2000ms with up to 1000ms jitter

📄 Crawling page 1...
⏱️  Waiting 2547ms (base: 2000ms, jitter: 547ms)
✅ Found 20 opportunities on page 1

📦 Processing batch 1 (10 opportunities from page 1)...

🔄 Processing opportunity 12345678
   Title: Supply and Delivery of Office Equipment...
⏱️  Waiting 1823ms (base: 1500ms, jitter: 323ms)
   🔍 Fetching ITB details for 12345678...
   ✅ ITB details fetched successfully
      - Solicitation: 2025-001
      - Mode: Public Bidding
   ✅ Successfully saved new opportunity

[... more opportunities ...]

📊 Batch 1 Summary:
   Duration: 45.23s
   Processed: 10
   New: 8
   Updated: 2
   ITB Details: 9
   Errors: 0
   Success Rate: 100.0%

[... more batches ...]

==============================================================
🎉 CRAWL COMPLETED SUCCESSFULLY
==============================================================
Total Duration: 523.45s
Pages Crawled: 10
Batches Processed: 20

Opportunities:
  - Total Found: 200
  - New: 150
  - Updated: 50
  - ITB Details Fetched: 195

Performance:
  - Errors: 3
  - Retries: 7
  - Success Rate: 98.5%
  - Avg Time per Opportunity: 2.62s
```

### State Management

The crawler maintains state in `data/crawl-state.json`:

```json
{
  "startTime": "2025-05-29T10:00:00.000Z",
  "startPage": 1,
  "endPage": 10,
  "lastCompletedPage": 5,
  "currentPage": 6,
  "processedOpportunities": 100,
  "stats": {
    "pages_crawled": 5,
    "opportunities_found": 100,
    "new_opportunities": 80,
    "updated_opportunities": 20,
    "itb_details_fetched": 95,
    "errors": 2,
    "retries": 5,
    "batches_processed": 10
  },
  "processedReferences": ["12345678", "12345679", ...],
  "lastBatchNumber": 10
}
```

### Error Handling

- Errors are logged to `logs/crawler-{timestamp}.log`
- Failed opportunities are retried automatically
- Page failures don't stop the crawl (continues to next page)
- Graceful shutdown on SIGINT (Ctrl+C) with state saving

### Performance Tips

1. **Adjust batch size** based on your system resources
2. **Increase delays** if experiencing rate limiting
3. **Reduce max retries** for faster completion (at cost of reliability)
4. **Monitor logs** for patterns in failures
5. **Use --resume** to continue interrupted crawls

### Troubleshooting

**High error rate?**
- Increase base delays
- Check internet connection
- Verify PhilGEPS website is accessible

**Out of memory?**
- Reduce batch size
- Process fewer pages at a time

**Stuck on a page?**
- Check logs for specific errors
- Manually skip by editing crawl-state.json

**ITB details not fetching?**
- Verify detail URLs are correct
- Check ITB scraper timeout settings
- Look for patterns in failed ITB fetches