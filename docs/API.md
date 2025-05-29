# API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
Currently, the API does not require authentication. For production use, implement appropriate authentication mechanisms.

## Response Format
All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "count": 100,  // For list endpoints
  "message": "Operation completed"  // For action endpoints
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE"  // Optional error code
}
```

## Endpoints

### 1. Opportunities

#### Search Opportunities
Search and filter procurement opportunities with advanced options.

**Endpoint:** `GET /api/opportunities/search`

**Query Parameters:**
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| q | string | Search keywords (searches title and procuring entity) | - |
| category | string | Filter by category name | - |
| areaOfDelivery | string | Filter by area of delivery | - |
| minBudget | number | Minimum approved budget | - |
| maxBudget | number | Maximum approved budget | - |
| activeOnly | boolean | Show only active (non-expired) opportunities | true |
| limit | number | Results per page | 50 |
| offset | number | Pagination offset | 0 |

**Example Request:**
```http
GET /api/opportunities/search?q=construction&category=Construction%20Projects&minBudget=1000000&activeOnly=true&limit=20
```

**Example Response:**
```json
{
  "success": true,
  "count": 15,
  "data": [
    {
      "id": 1234,
      "reference_number": "11828820",
      "title": "COMPLETION OF ACADEMIC BUILDING",
      "procuring_entity": "ABRA STATE INSTITUTE OF SCIENCES AND TECHNOLOGY",
      "category": "Construction Projects",
      "area_of_delivery": "Region I",
      "approved_budget": 5000000,
      "currency": "PHP",
      "closing_date": "2025-07-15T08:00:00.000Z",
      "publish_date": "2025-05-01T00:00:00.000Z",
      "formatted_budget": "₱5,000,000",
      "days_until_closing": 45,
      "is_closing_soon": false,
      "is_expired": false,
      "hasItbDetails": true,
      "solicitation_number": "ABC-2025-001",
      "procurement_mode": "Public Bidding",
      "funding_source": "GAA",
      "contact_person": "Juan Dela Cruz",
      "contact_email": "procurement@agency.gov.ph",
      "detail_url": "https://notices.philgeps.gov.ph/..."
    }
  ]
}
```

#### Export Opportunities to CSV
Export search results as a CSV file with all opportunity details.

**Endpoint:** `GET /api/opportunities/export`

**Query Parameters:** Same as search endpoint

**Response Headers:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="opportunities-2025-05-29.csv"
```

**CSV Columns:**
- Reference Number
- Title
- Procuring Entity
- Category
- Area of Delivery
- Approved Budget
- Currency
- Closing Date
- Days Until Closing
- Status
- Solicitation Number
- Procurement Mode
- Contact Person
- Contact Email
- URL

### 2. Reference Data

#### Get Categories
Retrieve all unique categories from the database.

**Endpoint:** `GET /api/categories`

**Example Response:**
```json
{
  "success": true,
  "data": [
    "Construction Projects",
    "Consulting Services",
    "Goods and Supplies",
    "IT Equipment and Software",
    "Medical Equipment and Supplies",
    "Office Supplies",
    "Security Services",
    "Transportation Services"
  ]
}
```

#### Get Areas of Delivery
Retrieve all unique areas of delivery.

**Endpoint:** `GET /api/areas`

**Example Response:**
```json
{
  "success": true,
  "data": [
    "Region I - Ilocos Region",
    "Region II - Cagayan Valley",
    "Region III - Central Luzon",
    "NCR - National Capital Region",
    "Region IV-A - CALABARZON",
    "Nationwide"
  ]
}
```

### 3. Statistics

#### Get Overall Statistics
Get aggregated statistics about opportunities in the database.

**Endpoint:** `GET /api/statistics`

**Example Response:**
```json
{
  "success": true,
  "data": {
    "total": 15420,
    "active": 3256,
    "categories": 45,
    "entities": 892
  }
}
```

### 4. Crawler Management

#### Get Crawler Status
Get current crawler status, configuration, and last crawl information.

**Endpoint:** `GET /api/crawler/status`

**Example Response:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "intervalMinutes": 60,
    "isRunning": false,
    "lastCrawl": {
      "timestamp": "2025-05-29T10:30:00.000Z",
      "duration": 125.5,
      "status": "completed",
      "opportunitiesFound": 250,
      "newOpportunities": 45,
      "updatedOpportunities": 205,
      "errors": 0
    },
    "nextScheduledRun": "2025-05-29T11:30:00.000Z",
    "configuration": {
      "maxPages": 10,
      "requestDelay": 2000,
      "fetchItbDetails": true
    }
  }
}
```

#### Toggle Crawler
Enable or disable the automated crawler service.

**Endpoint:** `POST /api/crawler/toggle`

**Request Body:**
```json
{
  "enabled": true
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Crawler enabled successfully",
  "data": {
    "enabled": true,
    "intervalMinutes": 60
  }
}
```

#### Run Manual Crawl
Trigger an immediate crawler run regardless of schedule.

**Endpoint:** `POST /api/crawler/run`

**Request Body (Optional):**
```json
{
  "maxPages": 5,         // Override MAX_PAGES_TO_CRAWL
  "fetchItbDetails": true // Override FETCH_ITB_DETAILS
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Crawler started successfully",
  "crawlId": "crawl_20250529_103000"
}
```

**Error Response (Already Running):**
```json
{
  "success": false,
  "error": "Crawler is already running",
  "code": "CRAWLER_BUSY"
}
```

### 5. Crawl History

#### Get Crawl History
Retrieve recent crawl operation history.

**Endpoint:** `GET /api/crawler/history`

**Query Parameters:**
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| limit | number | Number of records to return | 10 |
| status | string | Filter by status (completed/failed/running) | - |

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 156,
      "crawl_date": "2025-05-29T10:30:00.000Z",
      "opportunities_found": 250,
      "new_opportunities": 45,
      "updated_opportunities": 205,
      "errors": 0,
      "duration_seconds": 125.5,
      "status": "completed",
      "page_range": "1-10",
      "fetch_details": true
    },
    {
      "id": 155,
      "crawl_date": "2025-05-29T09:30:00.000Z",
      "opportunities_found": 0,
      "new_opportunities": 0,
      "updated_opportunities": 0,
      "errors": 1,
      "duration_seconds": 15.2,
      "status": "failed",
      "error_message": "Connection timeout",
      "page_range": "1-10",
      "fetch_details": true
    }
  ]
}
```

## Error Codes

| Code | Description |
|------|-------------|
| INVALID_PARAMS | Invalid or missing required parameters |
| DATABASE_ERROR | Database operation failed |
| CRAWLER_BUSY | Crawler is already running |
| CRAWLER_DISABLED | Crawler is disabled |
| NOT_FOUND | Resource not found |
| EXPORT_FAILED | CSV export failed |
| INTERNAL_ERROR | Unexpected server error |

## Rate Limiting

The API implements the following rate limits:
- Search endpoints: 100 requests per minute per IP
- Export endpoint: 10 requests per minute per IP
- Crawler control endpoints: 5 requests per minute per IP

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1622544000
```

## Pagination

List endpoints support pagination using `limit` and `offset` parameters:

```http
GET /api/opportunities/search?limit=20&offset=40
```

Paginated responses include total count:
```json
{
  "success": true,
  "count": 250,  // Total matching records
  "data": [...]  // Current page results
}
```

## Best Practices

1. **Use Specific Filters**: Apply filters to reduce response size and improve performance
2. **Implement Caching**: Cache category and area lists as they change infrequently
3. **Handle Errors**: Always check the `success` field and handle errors appropriately
4. **Respect Rate Limits**: Implement exponential backoff when rate limited
5. **Use Pagination**: For large result sets, use pagination to improve performance

## WebSocket Events (Future)

The following WebSocket events are planned for real-time updates:

- `crawler:started` - Crawler has started
- `crawler:progress` - Crawler progress update
- `crawler:completed` - Crawler has completed
- `crawler:error` - Crawler encountered an error
- `opportunity:new` - New opportunity added
- `opportunity:updated` - Opportunity updated

## Changelog

### v1.0.0 (Current)
- Initial API release
- Search and filter endpoints
- CSV export functionality
- Crawler control endpoints
- Statistics and reference data
- Crawl history tracking