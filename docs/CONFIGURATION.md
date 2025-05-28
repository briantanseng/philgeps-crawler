# Configuration Guide

This document describes all available environment variables for configuring the PhilGEPS Crawler application.

## Environment Setup

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your preferred settings

3. For production deployment, set these variables in your hosting platform (Cloud Run, etc.)

## Core Configuration

### Application Environment

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NODE_ENV` | string | `development` | Application environment. Use `production` for deployed instances |
| `PORT` | number | `3000` | Web server port. Cloud Run automatically sets this |

### PhilGEPS Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `PHILGEPS_BASE_URL` | string | (see .env.example) | Base URL for crawling. Default includes `Result=3` filter for active opportunities |

### Database Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DATABASE_TYPE` | string | `sqlite3` | Database type: `sqlite3` or `postgres` |
| `DATABASE_PATH` | string | `./data/philgeps.db` | SQLite database file location (when DATABASE_TYPE=sqlite3) |
| `DATABASE_URL` | string | (empty) | PostgreSQL connection URL (overrides individual settings) |
| `POSTGRES_HOST` | string | `localhost` | PostgreSQL host |
| `POSTGRES_PORT` | number | `5432` | PostgreSQL port |
| `POSTGRES_USER` | string | `postgres` | PostgreSQL username |
| `POSTGRES_PASSWORD` | string | `postgres` | PostgreSQL password |
| `POSTGRES_DATABASE` | string | `philgeps` | PostgreSQL database name |
| `POSTGRES_SSL` | boolean | `false` | Enable SSL for PostgreSQL connection |

## Crawler Settings

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `CRAWL_INTERVAL_MINUTES` | number | `60` | How often to run automatic crawls (in minutes) |
| `MAX_CONCURRENT_REQUESTS` | number | `5` | Maximum parallel HTTP requests during crawling |
| `REQUEST_DELAY_MS` | number | `1500` | Delay between requests in milliseconds |
| `MAX_PAGES_TO_CRAWL` | number | `20` | Maximum pages to crawl in one session |
| `CRAWL_START_PAGE` | number | `1` | Default starting page for crawls |
| `CRAWL_END_PAGE` | number | (empty) | Default ending page (uses MAX_PAGES_TO_CRAWL if not set) |
| `RUN_INITIAL_CRAWL` | boolean | `false` | Whether to crawl on application startup |
| `CRAWLER_TIMEOUT_SECONDS` | number | `3600` | Maximum time for a crawl operation (seconds) |

## Puppeteer Configuration

For Docker/Cloud Run environments using headless Chrome:

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` | boolean | `true` | Skip downloading Chromium (use system version) |
| `PUPPETEER_EXECUTABLE_PATH` | string | `/usr/bin/chromium-browser` | Path to Chromium executable |

## API Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `API_RATE_LIMIT_WINDOW` | number | `15` | Rate limit window in minutes |
| `API_RATE_LIMIT_MAX_REQUESTS` | number | `100` | Max requests per window |
| `CORS_ORIGINS` | string | `*` | Allowed CORS origins (comma-separated or `*`) |
| `API_KEY` | string | (empty) | Optional API key for protected endpoints |

## Feature Flags

Enable/disable specific features:

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ENABLE_FULL_CRAWL` | boolean | `true` | Enable full pagination crawling |
| `ENABLE_SCHEDULED_CRAWL` | boolean | `true` | Enable automatic scheduled crawling |
| `ENABLE_API` | boolean | `true` | Enable REST API endpoints |
| `ENABLE_WEB_UI` | boolean | `true` | Enable web interface |

## Performance Tuning

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `SEARCH_RESULTS_LIMIT` | number | `1000` | Maximum search results to return |
| `EXPORT_CSV_LIMIT` | number | `5000` | Maximum records in CSV export |

## Logging Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `LOG_LEVEL` | string | `info` | Logging level: error, warn, info, debug |
| `LOG_FORMAT` | string | `json` | Log format: json or simple |
| `DEBUG` | boolean | `false` | Enable debug mode (verbose logging) |
| `FORCE_COLORS` | boolean | `true` | Force colored output in logs |

## Cloud Deployment Settings

For Google Cloud Platform:

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `GOOGLE_CLOUD_PROJECT` | string | (empty) | Your GCP project ID |
| `GOOGLE_CLOUD_REGION` | string | `asia-southeast1` | Deployment region |
| `CLOUD_STORAGE_BUCKET` | string | (empty) | GCS bucket for database backups |

## Monitoring and Alerts

Optional integrations:

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `SENTRY_DSN` | string | (empty) | Sentry error tracking DSN |
| `SLACK_WEBHOOK_URL` | string | (empty) | Slack webhook for notifications |

## Security

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ADMIN_PASSWORD` | string | (empty) | Password for admin endpoints |

## Environment-Specific Configurations

### Development
```env
NODE_ENV=development
DEBUG=true
LOG_FORMAT=simple
RUN_INITIAL_CRAWL=false
```

### Production (Cloud Run)
```env
NODE_ENV=production
DEBUG=false
LOG_FORMAT=json
RUN_INITIAL_CRAWL=true
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### Docker Compose
```env
NODE_ENV=development
PORT=8080
DATABASE_PATH=/app/data/philgeps.db
```

## Best Practices

1. **Never commit `.env` files** - Keep them in `.gitignore`
2. **Use secrets management** - For production, use Google Secret Manager or similar
3. **Validate required variables** - Ensure critical variables are set before deployment
4. **Document changes** - Update this guide when adding new variables
5. **Use appropriate types** - Parse numbers and booleans correctly in code

## Troubleshooting

### Common Issues

1. **Missing required variables**: Check logs for "undefined" errors
2. **Type mismatches**: Ensure numbers are parsed with `parseInt()` or `parseFloat()`
3. **Path issues**: Use absolute paths in production environments
4. **Permission errors**: Ensure write permissions for database path

### Debugging

Enable debug mode to see all configuration values on startup:
```env
DEBUG=true
LOG_LEVEL=debug
```