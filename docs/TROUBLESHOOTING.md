# Troubleshooting Guide

## Common Issues and Solutions

### Socket Hang Up / Connection Reset Errors

These errors typically occur when the server closes the connection unexpectedly.

#### Symptoms
- `Error: socket hang up`
- `Error: read ECONNRESET`
- `Error: connect ETIMEDOUT`
- `Error: getaddrinfo ENOTFOUND`

#### Solutions

1. **Increase Request Delays**
   ```env
   REQUEST_DELAY_MS=5000  # Try 5-10 seconds between requests
   ```

2. **Reduce Concurrent Requests**
   ```env
   MAX_CONCURRENT_REQUESTS=1  # Process one at a time
   ```

3. **Use Smaller Page Ranges**
   ```bash
   # Instead of crawling 100 pages at once
   npm run crawl:all 10  # Crawl only 10 pages
   ```

4. **Check Your Internet Connection**
   - Ensure stable internet connection
   - Try using a VPN if the site blocks your region
   - Check if the site is accessible in your browser

5. **Restart with Fresh Session**
   ```bash
   # Clear any stale connections
   docker-compose down
   docker-compose up -d
   ```

### Timeout Errors

#### Symptoms
- `Error: timeout of 60000ms exceeded`
- `Navigation timeout of 60000 ms exceeded`

#### Solutions

1. **Increase Timeouts**
   ```env
   CRAWLER_TIMEOUT_SECONDS=7200  # 2 hours
   ```

2. **Use Puppeteer Instead of Basic Scraper**
   ```bash
   npm run crawl:all  # Uses headless browser
   ```

### Memory Issues

#### Symptoms
- `JavaScript heap out of memory`
- Container crashes or restarts

#### Solutions

1. **Increase Node.js Memory**
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm run crawl:all
   ```

2. **Increase Docker Memory**
   ```yaml
   # In docker-compose.yml
   deploy:
     resources:
       limits:
         memory: 4G
   ```

3. **Process Fewer Pages**
   ```bash
   npm run crawl:all 5  # Only 5 pages at a time
   ```

### Rate Limiting

#### Symptoms
- HTTP 429 errors
- Consistent connection failures after some requests

#### Solutions

1. **Increase Delays Significantly**
   ```env
   REQUEST_DELAY_MS=10000  # 10 seconds between requests
   ```

2. **Implement Time-Based Crawling**
   ```bash
   # Crawl different times
   npm run crawl:all 1 10   # Morning
   npm run crawl:all 11 20  # Afternoon
   npm run crawl:all 21 30  # Evening
   ```

### Database Lock Errors

#### Symptoms
- `SQLITE_BUSY: database is locked`
- `database is locked` errors

#### Solutions

1. **Ensure Single Instance**
   ```bash
   # Check running processes
   ps aux | grep node
   
   # Kill duplicate processes
   pkill -f "node.*crawl"
   ```

2. **Use PostgreSQL Instead**
   ```bash
   docker-compose -f docker-compose.postgres.yml up -d
   ```

### SSL/Certificate Errors

#### Symptoms
- `Error: self signed certificate`
- `Error: unable to verify the first certificate`

#### Solutions

Already handled in the code, but if persists:

1. **Disable SSL Verification (Development Only)**
   ```env
   NODE_TLS_REJECT_UNAUTHORIZED=0
   ```

### Debugging Steps

1. **Enable Debug Logging**
   ```env
   DEBUG=true
   LOG_LEVEL=debug
   ```

2. **Check Network Connectivity**
   ```bash
   # Test connection to PhilGEPS
   curl -I https://notices.philgeps.gov.ph
   
   # Check DNS resolution
   nslookup notices.philgeps.gov.ph
   ```

3. **Monitor Resource Usage**
   ```bash
   # Docker stats
   docker stats
   
   # System resources
   top
   htop
   ```

4. **View Detailed Logs**
   ```bash
   # Docker logs
   docker-compose logs -f --tail=100
   
   # Specific container
   docker logs philgeps-crawler -f
   ```

### Emergency Recovery

If nothing works:

1. **Reset Everything**
   ```bash
   # Stop all containers
   docker-compose down -v
   
   # Remove database
   rm -rf data/
   
   # Rebuild
   docker-compose build --no-cache
   docker-compose up -d
   ```

2. **Manual Test**
   ```bash
   # Test with curl
   curl -v https://notices.philgeps.gov.ph/GEPSNONPILOT/Tender/SplashOpportunitiesSearchUI.aspx
   ```

3. **Use Alternative Approach**
   - Try crawling at different times
   - Use a proxy or VPN
   - Contact PhilGEPS for API access

### Performance Optimization

1. **Optimal Settings for Stability**
   ```env
   REQUEST_DELAY_MS=5000
   MAX_CONCURRENT_REQUESTS=1
   MAX_PAGES_TO_CRAWL=10
   CRAWLER_TIMEOUT_SECONDS=3600
   ```

2. **Gradual Crawling Strategy**
   ```bash
   # Day 1: Test with small batch
   npm run crawl:all 5
   
   # Day 2: Increase if stable
   npm run crawl:all 20
   
   # Day 3: Full crawl in batches
   npm run crawl:all 1 50
   npm run crawl:all 51 100
   ```

### Getting Help

1. **Check Logs First**
   - Look for specific error messages
   - Note the time when errors occur
   - Check if errors are consistent

2. **Information to Provide**
   - Error messages
   - Environment settings
   - Docker/Node.js versions
   - Network environment (VPN, Proxy, etc.)

3. **Test Minimal Setup**
   ```bash
   # Test with single page
   npm run crawl
   
   # If that works, gradually increase
   npm run crawl:all 1
   npm run crawl:all 2
   ```