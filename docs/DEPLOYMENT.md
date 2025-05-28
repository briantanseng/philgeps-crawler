# Deployment Guide for Google Cloud Run

## Prerequisites

1. Google Cloud Project with billing enabled
2. Google Cloud SDK (`gcloud`) installed
3. Docker installed locally (for testing)
4. Enable required APIs:
   ```bash
   gcloud services enable cloudbuild.googleapis.com run.googleapis.com
   ```

## Local Docker Testing

1. Build the Docker image:
   ```bash
   docker build -t philgeps-crawler .
   ```

2. Run locally:
   ```bash
   docker run -p 8080:8080 \
     -e PHILGEPS_BASE_URL="https://notices.philgeps.gov.ph/GEPSNONPILOT/Tender/SplashOpportunitiesSearchUI.aspx?menuIndex=3&ClickFrom=OpenOpp&Result=3" \
     -e REQUEST_DELAY_MS=1500 \
     -e CRAWL_INTERVAL_MINUTES=60 \
     -e RUN_INITIAL_CRAWL=false \
     philgeps-crawler
   ```

3. Test the application at http://localhost:8080

## Manual Deployment to Cloud Run

1. Set your project ID:
   ```bash
   export PROJECT_ID=your-project-id
   gcloud config set project $PROJECT_ID
   ```

2. Build and push the image:
   ```bash
   # Build the image
   docker build -t gcr.io/$PROJECT_ID/philgeps-crawler .
   
   # Configure Docker for GCR
   gcloud auth configure-docker
   
   # Push to Google Container Registry
   docker push gcr.io/$PROJECT_ID/philgeps-crawler
   ```

3. Deploy to Cloud Run:
   ```bash
   gcloud run deploy philgeps-crawler \
     --image gcr.io/$PROJECT_ID/philgeps-crawler \
     --platform managed \
     --region asia-southeast1 \
     --allow-unauthenticated \
     --memory 2Gi \
     --cpu 2 \
     --timeout 3600 \
     --max-instances 10 \
     --min-instances 0 \
     --set-env-vars "NODE_ENV=production,CRAWL_INTERVAL_MINUTES=60,REQUEST_DELAY_MS=1500,RUN_INITIAL_CRAWL=false"
   ```

## Automatic Deployment with Cloud Build

1. Connect your GitHub repository to Cloud Build:
   ```bash
   # Go to Cloud Console > Cloud Build > Triggers
   # Create a new trigger connected to your GitHub repo
   ```

2. Or deploy using Cloud Build manually:
   ```bash
   gcloud builds submit --config cloudbuild.yaml
   ```

## Environment Variables for Cloud Run

Configure these in the Cloud Run console or via `--set-env-vars`:

- `NODE_ENV`: Set to "production"
- `PHILGEPS_BASE_URL`: The PhilGEPS search URL
- `CRAWL_INTERVAL_MINUTES`: How often to crawl (default: 60)
- `REQUEST_DELAY_MS`: Delay between requests (default: 1500)
- `MAX_CONCURRENT_REQUESTS`: Concurrent request limit (default: 5)
- `RUN_INITIAL_CRAWL`: Whether to crawl on startup (default: false)

## Persistent Storage Considerations

Cloud Run is stateless, so the SQLite database will be reset on each deployment. For production use, we provide several options:

### Option 1: Google Cloud Storage Volume Mount (Recommended for SQLite)

This option uses Cloud Run's native GCS volume mount feature for persistent SQLite storage:

1. **Set up GCS volume mount**:
   ```bash
   # Run the setup script
   cd scripts
   ./setup-gcs-volume.sh
   ```

   This script will:
   - Create a GCS bucket (`PROJECT_ID-philgeps-data`)
   - Set up a service account with proper permissions
   - Update the deployment configuration

2. **Deploy with volume mount**:
   ```bash
   # Using Cloud Build (automatically uses volume mount for SQLite)
   gcloud builds submit --substitutions=_DATABASE_TYPE=sqlite3
   
   # Or manual deployment with service configuration
   gcloud run services replace cloud-run-service.yaml --region=asia-southeast1
   ```

3. **Configuration**:
   - The SQLite database is persisted at `/data/philgeps.db` in the container
   - The GCS bucket is mounted at `/data` using Cloud Run's CSI driver
   - No manual syncing required - changes are automatically persisted

### Option 2: PostgreSQL with Cloud SQL (For Production Scale)

For high-traffic production deployments:

1. **Create Cloud SQL instance**:
   ```bash
   gcloud sql instances create philgeps-db \
     --database-version=POSTGRES_14 \
     --tier=db-f1-micro \
     --region=asia-southeast1
   ```

2. **Deploy with PostgreSQL**:
   ```bash
   # Deploy using Cloud Build
   gcloud builds submit --substitutions=_DATABASE_TYPE=postgres
   ```

3. **Set environment variables**:
   ```
   DATABASE_TYPE=postgres
   DATABASE_URL=postgresql://user:password@host:port/database
   ```

### Option 3: Manual Cloud Storage Sync (Legacy)

Add to your Dockerfile:
```dockerfile
# Install gsutil
RUN apk add --no-cache python3 py3-pip
RUN pip3 install gsutil

# Add sync script
COPY sync-db.sh .
RUN chmod +x sync-db.sh
```

Create `sync-db.sh`:
```bash
#!/bin/sh
# Download database from GCS on startup
gsutil cp gs://$BUCKET_NAME/philgeps.db ./data/philgeps.db || true

# Sync database every 5 minutes
while true; do
  sleep 300
  gsutil cp ./data/philgeps.db gs://$BUCKET_NAME/philgeps.db
done &

# Start the application
node src/index.js
```

## Monitoring and Logging

1. View logs:
   ```bash
   gcloud run services logs read philgeps-crawler --region asia-southeast1
   ```

2. Set up alerts in Cloud Monitoring for:
   - High error rates
   - Memory usage
   - Request latency

## Cost Optimization

1. **Set minimum instances to 0**: Only pay when the service is used
2. **Use Cloud Scheduler**: Instead of internal cron, use Cloud Scheduler to trigger crawls
3. **Optimize memory**: Start with 1Gi and increase if needed
4. **Regional deployment**: Deploy in region closest to PhilGEPS servers

## Security Best Practices

1. **Enable Cloud Armor**: Protect against DDoS
2. **Use Secret Manager**: Store sensitive environment variables
3. **Enable VPC connector**: For database access
4. **Set up IAM**: Restrict who can deploy and access

## Troubleshooting

### Common Issues

1. **Puppeteer crashes**: Increase memory allocation
2. **Timeout errors**: Increase Cloud Run timeout (max 3600s)
3. **Database locks**: Consider migrating to Cloud SQL
4. **Cold starts**: Set minimum instances to 1

### Debug Commands

```bash
# Check service status
gcloud run services describe philgeps-crawler --region asia-southeast1

# View recent logs
gcloud run services logs read philgeps-crawler --limit 50

# Test the deployed service
curl https://philgeps-crawler-xxxxx.asia-southeast1.run.app/health
```