# Troubleshooting Guide

## Common Issues and Solutions

### Socket Hang Up Errors

**Problem**: Getting "socket hang up" errors when running crawlers.

**Solutions**:

1. **For HTTP-based crawling**: 
   - Use the HTTP crawler which is more stable: `npm run crawl:all:http`
   - Increase delays in `.env`:
     ```
     REQUEST_DELAY_MS=5000
     MAX_CONCURRENT_REQUESTS=1
     ```

2. **For Puppeteer-based crawling**:
   - Ensure Chrome/Chromium is properly installed
   - Reinstall puppeteer if needed: `npm uninstall puppeteer && npm install puppeteer`
   - The script now includes retry logic for browser launch

### Database Errors

**Problem**: "db is not a function" or "table has no column" errors.

**Solution**: The code now handles both SQLite (better-sqlite3) and PostgreSQL (Knex) databases automatically. Make sure your `.env` file has the correct `DATABASE_TYPE` setting.

### Puppeteer Method Errors

**Problem**: "page.waitForTimeout is not a function" error.

**Solution**: This deprecated method has been replaced with `await new Promise(resolve => setTimeout(resolve, ms))`.

### Zero Opportunities on Later Pages

**Problem**: Getting 0 opportunities when downloading pages beyond page 1.

**Solution**: This was caused by incorrect pagination navigation. The PhilGEPS site uses ASP.NET postback with a "Next" button for navigation. The fix:
- Updated PuppeteerScraper to use sequential Next button clicks
- Modified download-all script to crawl page ranges instead of individual pages
- Added proper wait conditions for page content to load

### macOS Puppeteer Configuration

**Problem**: "Browser was not found at the configured executablePath" error on macOS.

**Solution**: Comment out or remove these lines in `.env`:
```env
# PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false  # Set to false for macOS
```

## Available Crawling Scripts

1. **HTTP Crawler** (limited to first page):
   ```bash
   npm run crawl:all:http [pages]
   ```

2. **Puppeteer Crawler** (supports page ranges):
   ```bash
   npm run crawl:all [startPage] [endPage]
   ```

3. **Full Download Script** (with retry and resume):
   ```bash
   npm run download:all
   ```

## Environment Variables for Stability

```env
# Recommended settings for stable operation
REQUEST_DELAY_MS=5000
MAX_CONCURRENT_REQUESTS=1
MAX_RETRIES=3
REQUEST_TIMEOUT=30000
BATCH_PAUSE_MS=30000
PAGE_RETRY_ATTEMPTS=3
PAGE_RETRY_MULTIPLIER=2
DOWNLOAD_BATCH_SIZE=5  # Keep small for better reliability
```

## Performance Expectations

- Each page typically contains ~21 opportunities
- Download speed: ~6-7 seconds per page
- Total pages on PhilGEPS: ~1,200 (24,000+ opportunities)
- Full download time estimate: ~2-3 hours with safe settings

## Debugging Tips

1. Check if Chrome is installed: `which chromium || which google-chrome`
2. View database contents: `npm run search`
3. Check logs for specific error messages
4. Use HTTP crawler for testing basic connectivity
5. Use Puppeteer crawler for full functionality including pagination
6. Test with small batches first: `DOWNLOAD_BATCH_SIZE=3 npm run download:all`