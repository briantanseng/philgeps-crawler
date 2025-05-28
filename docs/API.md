# API Documentation

## Base URL
```
http://localhost:3000/api
```

## Endpoints

### 1. Search Opportunities
Search for opportunities with various filters.

**Endpoint:** `GET /api/opportunities/search`

**Query Parameters:**
- `q` (string): Search query for keywords
- `category` (string): Filter by category
- `minBudget` (number): Minimum budget amount
- `maxBudget` (number): Maximum budget amount
- `activeOnly` (boolean): Show only active opportunities
- `limit` (number): Maximum results to return (default: 50)

**Example Request:**
```
GET /api/opportunities/search?q=construction&category=Construction Projects&activeOnly=true&limit=20
```

**Example Response:**
```json
{
  "success": true,
  "count": 15,
  "data": [
    {
      "reference_number": "11828820",
      "title": "COMPLETION OF ACADEMIC BUILDING",
      "procuring_entity": "ABRA STATE INSTITUTE OF SCIENCES AND TECHNOLOGY",
      "category": "Construction Projects",
      "formatted_budget": "₱0.00",
      "days_until_closing": 45,
      "is_closing_soon": false,
      "is_expired": false,
      "publish_date": "2025-05-01T00:00:00.000Z",
      "closing_date": "2025-07-15T08:00:00.000Z"
    }
  ]
}
```

### 2. Get Active Opportunities
Get all currently active (not expired) opportunities.

**Endpoint:** `GET /api/opportunities/active`

**Query Parameters:**
- `limit` (number): Maximum results to return (default: 50)

### 3. Get Opportunities by Category
Get opportunities filtered by a specific category.

**Endpoint:** `GET /api/opportunities/category/:category`

**URL Parameters:**
- `category` (string): Category name

**Example:**
```
GET /api/opportunities/category/Construction Projects
```

### 4. Get All Categories
Get list of all available categories.

**Endpoint:** `GET /api/categories`

**Example Response:**
```json
{
  "success": true,
  "count": 25,
  "data": [
    "Construction Projects",
    "IT Equipment and Software",
    "Medical Equipment",
    "Office Supplies"
  ]
}
```

### 5. Get Statistics
Get overall statistics about opportunities in the database.

**Endpoint:** `GET /api/statistics`

**Example Response:**
```json
{
  "success": true,
  "data": {
    "total": 1250,
    "active": 850,
    "categories": 45,
    "entities": 320
  }
}
```

### 6. Get Crawl History
Get recent crawl operation history.

**Endpoint:** `GET /api/crawl/history`

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "crawl_date": "2025-05-28T10:30:00.000Z",
      "opportunities_found": 250,
      "new_opportunities": 45,
      "updated_opportunities": 205,
      "errors": 0,
      "duration_seconds": 125.5,
      "status": "completed"
    }
  ]
}
```

### 7. Trigger Manual Crawl
Start a manual crawl operation in the background with optional page range.

**Endpoint:** `POST /api/crawl/trigger`

**Request Body (optional):**
```json
{
  "startPage": 10,  // Optional: Starting page number (default: 1)
  "endPage": 20     // Optional: Ending page number (default: MAX_PAGES_TO_CRAWL)
}
```

**Example Requests:**

```bash
# Crawl with default settings
curl -X POST http://localhost:3000/api/crawl/trigger

# Crawl pages 1-50
curl -X POST http://localhost:3000/api/crawl/trigger \
  -H "Content-Type: application/json" \
  -d '{"endPage": 50}'

# Crawl pages 100-150
curl -X POST http://localhost:3000/api/crawl/trigger \
  -H "Content-Type: application/json" \
  -d '{"startPage": 100, "endPage": 150}'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Crawl started in background from page 100 to page 150",
  "options": {
    "startPage": 100,
    "endPage": 150
  }
}
```

### 8. Export Opportunities as CSV
Export search results as a CSV file.

**Endpoint:** `GET /api/opportunities/export`

**Query Parameters:**
- `q` (string): Search query
- `category` (string): Filter by category
- `activeOnly` (boolean): Export only active opportunities

**Response:** CSV file download

### 9. Get Crawler Status
Get current crawler status and scheduling information.

**Endpoint:** `GET /api/crawler/status`

**Example Response:**
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

### 10. Toggle Crawler
Enable or disable the automated crawler.

**Endpoint:** `POST /api/crawler/toggle`

**Request Body:**
```json
{
  "enabled": true  // or false to disable
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Crawler enabled successfully",
  "data": {
    "enabled": true,
    "isRunning": false,
    "intervalMinutes": 30,
    "lastCrawl": "2025-01-29T10:00:00Z",
    "nextCrawl": "2025-01-29T10:30:00Z"
  }
}
```

### 11. Run Crawler Manually
Trigger an immediate crawler run.

**Endpoint:** `POST /api/crawler/run`

**Example Response:**
```json
{
  "success": true,
  "message": "Crawler started successfully"
}
```

**Error Response (if already running):**
```json
{
  "success": false,
  "error": "Crawler is already running"
}
```

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

## Rate Limiting

The API respects the `REQUEST_DELAY_MS` configuration but does not enforce rate limiting on clients. For production use, consider implementing rate limiting middleware.