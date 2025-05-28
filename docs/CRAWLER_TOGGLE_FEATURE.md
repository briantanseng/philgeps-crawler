# Crawler Toggle Feature

## Overview

The PhilGEPS Crawler now includes a web-based control interface that allows users to:
- Enable/disable the automated crawler
- View crawler status and scheduling information
- Manually trigger crawler runs
- Monitor crawler activity in real-time

## Features

### 1. Toggle Switch
- Enable or disable the automated crawler schedule
- When disabled, scheduled crawls are cancelled
- When enabled, crawler resumes based on configured interval

### 2. Status Display
- **Active**: Crawler is enabled and waiting for next scheduled run
- **Inactive**: Crawler is disabled
- **Running**: Crawler is currently fetching data

### 3. Information Panel
Shows real-time information about:
- Crawl interval (configurable via CRAWL_INTERVAL_MINUTES)
- Last crawl timestamp
- Next scheduled crawl time
- Current crawler status

### 4. Manual Run
- Trigger immediate crawler execution
- Available even when automatic scheduling is disabled
- Shows real-time status during execution

## Implementation Details

### Backend Components

#### PhilGEPSApp Class Properties
```javascript
class PhilGEPSApp {
  crawlerEnabled: boolean    // Toggle state
  crawlerJob: CronJob       // Scheduled job instance
  lastCrawl: Date           // Last execution timestamp
  nextCrawl: Date           // Next scheduled execution
  isCrawling: boolean       // Current execution state
}
```

#### API Endpoints

1. **GET /api/crawler/status**
   - Returns current crawler state and scheduling information
   - Response:
   ```json
   {
     "success": true,
     "data": {
       "enabled": true,
       "isRunning": false,
       "intervalMinutes": 30,
       "lastCrawl": "2025-01-29T10:00:00Z",
       "nextCrawl": "2025-01-29T10:30:00Z"
     }
   }
   ```

2. **POST /api/crawler/toggle**
   - Toggles crawler enabled/disabled state
   - Request body: `{ "enabled": true/false }`
   - Response:
   ```json
   {
     "success": true,
     "message": "Crawler enabled/disabled successfully",
     "data": { /* same as status endpoint */ }
   }
   ```

3. **POST /api/crawler/run**
   - Manually triggers crawler execution
   - Prevents concurrent runs
   - Response:
   ```json
   {
     "success": true,
     "message": "Crawler started successfully"
   }
   ```

### Frontend Components

The crawler control UI is integrated into `index-table.html`:

```javascript
// Auto-refresh crawler status every 10 seconds
setInterval(updateCrawlerStatus, 10000);

// Toggle crawler state
async function toggleCrawler() {
  const enabled = document.getElementById('crawlerToggle').checked;
  const response = await fetch('/api/crawler/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled })
  });
  // Update UI based on response
}

// Manual crawler run
async function runCrawler() {
  const response = await fetch('/api/crawler/run', { method: 'POST' });
  // Handle response and update UI
}
```

## Configuration

The crawler interval is configured via environment variable:
```bash
CRAWL_INTERVAL_MINUTES=30  # Default: 30 minutes
```

## Usage

1. **Access the Web Interface**
   - Navigate to http://localhost:3000
   - The crawler control section appears at the top of the page

2. **Enable/Disable Crawler**
   - Use the toggle switch to control automated crawling
   - Status updates immediately

3. **Monitor Status**
   - View current state, last run time, and next scheduled run
   - Information refreshes automatically every 10 seconds

4. **Manual Execution**
   - Click "Run Now" to trigger immediate crawl
   - Button is disabled during active crawls

## Benefits

1. **User Control**: No need to restart the application to pause crawling
2. **Visibility**: Clear indication of crawler state and schedule
3. **Flexibility**: Manual runs for immediate data updates
4. **Resource Management**: Pause crawling during high-load periods
5. **Debugging**: Easy testing of crawler functionality

## Technical Notes

- Crawler state persists only during application runtime
- On restart, crawler defaults to enabled state
- Manual runs respect the same crawling logic as scheduled runs
- Concurrent crawl prevention ensures data integrity