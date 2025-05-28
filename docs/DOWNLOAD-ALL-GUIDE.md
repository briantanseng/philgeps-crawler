# Full Download Guide

This guide explains how to download all pages from PhilGEPS using the `download:all` script.

## Overview

The `download:all` script is designed to:
- Download all 1200+ pages of opportunities
- Add random jitter to avoid detection
- Resume from interruptions
- Save progress after each batch
- Handle errors gracefully

## Features

### 1. Resumable Downloads
- Progress saved to `data/download-state.json`
- Automatically resumes from last completed page
- No duplicate downloads

### 2. Intelligent Delays
- Base delay + random jitter
- Prevents rate limiting
- Mimics human behavior

### 3. Batch Processing
- Downloads in configurable batches
- Pauses between batches
- Progress updates after each batch

### 4. Error Handling
- Retries failed batches
- Stops after consecutive failures
- Detailed error logging

## Quick Start

### Basic Usage

```bash
# Start download with default settings
npm run download:all

# Or use the shell script
./scripts/download-all.sh
```

### Download Modes

```bash
# Fast mode (shorter delays, riskier)
./scripts/download-all.sh --fast

# Slow mode (longer delays, safer)
./scripts/download-all.sh --slow

# Aggressive mode (minimal delays, high risk)
./scripts/download-all.sh --aggressive

# Background mode (runs in background)
./scripts/download-all.sh --background
```

## Configuration

### Environment Variables

```env
# Batch size (pages per batch)
DOWNLOAD_BATCH_SIZE=10

# Base delay between requests (ms)
REQUEST_DELAY_MS=5000

# Maximum random jitter (ms)
MAX_JITTER_MS=3000

# Pause between batches (ms)
BATCH_PAUSE_MS=30000

# Total pages estimate
TOTAL_PAGES=1200

# Skip confirmation prompt
AUTO_CONFIRM=true
```

### Recommended Settings

#### For Stable Connection
```env
DOWNLOAD_BATCH_SIZE=20
REQUEST_DELAY_MS=3000
MAX_JITTER_MS=2000
BATCH_PAUSE_MS=20000
```

#### For Unreliable Connection
```env
DOWNLOAD_BATCH_SIZE=5
REQUEST_DELAY_MS=8000
MAX_JITTER_MS=4000
BATCH_PAUSE_MS=60000
```

#### For Overnight Download
```env
DOWNLOAD_BATCH_SIZE=10
REQUEST_DELAY_MS=10000
MAX_JITTER_MS=5000
BATCH_PAUSE_MS=120000
```

## How Jitter Works

The script adds random delays to make requests look more human:

```
Actual Delay = BASE_DELAY + random(0 to MAX_JITTER)

Example:
BASE_DELAY = 5000ms
MAX_JITTER = 3000ms
Actual delays: 5000-8000ms (randomly)
```

## Progress Tracking

### State File Structure
```json
{
  "lastCompletedPage": 150,
  "totalPages": 1200,
  "totalOpportunities": 3000,
  "startedAt": "2025-05-28T10:00:00Z",
  "batches": [
    {
      "startPage": 141,
      "endPage": 150,
      "opportunities": 200,
      "saved": 198,
      "errors": 2,
      "duration": "45.23",
      "completedAt": "2025-05-28T10:15:00Z"
    }
  ]
}
```

### Monitor Progress

```bash
# Watch state file
watch -n 5 cat data/download-state.json

# Monitor logs
tail -f download.log

# Check database growth
watch -n 10 'ls -lh data/philgeps.db'
```

## Time Estimates

Based on default settings:

| Pages | Opportunities | Estimated Time |
|-------|---------------|----------------|
| 100 | ~2,000 | 1-2 hours |
| 500 | ~10,000 | 5-8 hours |
| 1200 | ~24,000 | 12-20 hours |

Factors affecting time:
- Network speed
- Server response time
- Configured delays
- Error rate

## Best Practices

### 1. Start Small
```bash
# Test with 10 pages first
DOWNLOAD_BATCH_SIZE=10 TOTAL_PAGES=10 npm run download:all
```

### 2. Run Overnight
```bash
# Use slow settings for overnight
./scripts/download-all.sh --slow --background
```

### 3. Split Across Days
```bash
# Day 1: Pages 1-400
TOTAL_PAGES=400 npm run download:all

# Day 2: Pages 401-800
# (Will auto-resume from 401)
TOTAL_PAGES=800 npm run download:all

# Day 3: Complete
TOTAL_PAGES=1200 npm run download:all
```

### 4. Monitor Resources
```bash
# CPU and Memory
htop

# Disk space
df -h

# Network
iftop
```

## Troubleshooting

### Script Stops Unexpectedly

1. Check last error in console
2. Resume by running again:
   ```bash
   npm run download:all
   ```

### Too Many Errors

1. Increase delays:
   ```bash
   export REQUEST_DELAY_MS=10000
   export BATCH_PAUSE_MS=60000
   ```

2. Reduce batch size:
   ```bash
   export DOWNLOAD_BATCH_SIZE=5
   ```

### Database Issues

1. Check disk space
2. Ensure single instance running
3. Consider PostgreSQL for large datasets

### Network Issues

1. Check internet stability
2. Try VPN if blocked
3. Run during off-peak hours

## Recovery

### Reset Download
```bash
# Delete state file to start over
rm data/download-state.json

# Optionally clear database
rm data/philgeps.db
```

### Resume from Specific Page
```bash
# Edit state file
nano data/download-state.json
# Change "lastCompletedPage" to desired value
```

### Export Progress
```bash
# Backup state
cp data/download-state.json data/download-state-backup.json

# Backup database
cp data/philgeps.db data/philgeps-backup.db
```

## Advanced Usage

### Custom Batch Logic

Create `custom-download.js`:
```javascript
import FullDownloader from './src/download-all.js';

const downloader = new FullDownloader();
downloader.batchSize = 25;
downloader.baseDelay = 2000;
downloader.downloadAll();
```

### Parallel Downloads

Run multiple instances with different page ranges:

Terminal 1:
```bash
CRAWL_START_PAGE=1 CRAWL_END_PAGE=400 npm run download:all
```

Terminal 2:
```bash
CRAWL_START_PAGE=401 CRAWL_END_PAGE=800 npm run download:all
```

## Completion

When download completes:

1. **Verify Data**
   ```sql
   SELECT COUNT(*) FROM opportunities;
   SELECT COUNT(DISTINCT category) FROM opportunities;
   ```

2. **Backup Database**
   ```bash
   cp data/philgeps.db data/philgeps-complete-$(date +%Y%m%d).db
   ```

3. **Generate Report**
   ```bash
   npm run search
   # Choose option 5 for statistics
   ```

4. **Switch to Update Mode**
   - Configure to only crawl recent pages
   - Set up scheduled crawling for updates

## Safety Tips

1. **Respect the Website**
   - Don't run multiple instances
   - Use reasonable delays
   - Stop if getting errors

2. **Monitor Impact**
   - Check CPU/memory usage
   - Watch network traffic
   - Ensure not affecting other services

3. **Legal Compliance**
   - Ensure you have permission
   - Follow website terms of service
   - Use data responsibly