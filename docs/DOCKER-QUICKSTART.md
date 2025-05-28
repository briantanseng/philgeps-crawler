# Docker Quick Start Guide

## Running with Docker Compose (Recommended for Development)

1. **Start the application:**
   ```bash
   docker-compose up -d
   ```

2. **View logs:**
   ```bash
   docker-compose logs -f
   ```

3. **Stop the application:**
   ```bash
   docker-compose down
   ```

4. **Access the application:**
   - Web UI: http://localhost:8080
   - API: http://localhost:8080/api

## Running with Docker (Production-like)

1. **Build the image:**
   ```bash
   docker build -t philgeps-crawler .
   ```

2. **Run the container:**
   ```bash
   docker run -d \
     --name philgeps-crawler \
     -p 8080:8080 \
     -e NODE_ENV=production \
     -e PORT=8080 \
     -e PHILGEPS_BASE_URL="https://notices.philgeps.gov.ph/GEPSNONPILOT/Tender/SplashOpportunitiesSearchUI.aspx?menuIndex=3&ClickFrom=OpenOpp&Result=3" \
     -e REQUEST_DELAY_MS=1500 \
     -e CRAWL_INTERVAL_MINUTES=60 \
     -e RUN_INITIAL_CRAWL=false \
     philgeps-crawler
   ```

3. **Check container status:**
   ```bash
   docker ps
   docker logs philgeps-crawler
   ```

4. **Stop and remove:**
   ```bash
   docker stop philgeps-crawler
   docker rm philgeps-crawler
   ```

## Deploying to Google Cloud Run

### Prerequisites
- Google Cloud account with billing enabled
- `gcloud` CLI installed and configured

### Quick Deploy Steps

1. **Set your project:**
   ```bash
   export PROJECT_ID=your-google-cloud-project-id
   gcloud config set project $PROJECT_ID
   ```

2. **Enable required services:**
   ```bash
   gcloud services enable cloudbuild.googleapis.com run.googleapis.com
   ```

3. **Build and deploy in one command:**
   ```bash
   gcloud run deploy philgeps-crawler \
     --source . \
     --platform managed \
     --region asia-southeast1 \
     --allow-unauthenticated \
     --memory 2Gi \
     --cpu 2 \
     --timeout 3600 \
     --set-env-vars "NODE_ENV=production,CRAWL_INTERVAL_MINUTES=60,REQUEST_DELAY_MS=1500,RUN_INITIAL_CRAWL=false"
   ```

4. **Access your deployed application:**
   The deployment will output a URL like: `https://philgeps-crawler-xxxxx-as.a.run.app`

### Using Cloud Build (CI/CD)

1. **Deploy using Cloud Build configuration:**
   ```bash
   gcloud builds submit --config cloudbuild.yaml
   ```

2. **Set up automatic deployments:**
   - Connect your GitHub repository to Cloud Build
   - Create a trigger for main branch pushes
   - Deployments will happen automatically

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment (development/production) | development |
| PORT | Server port | 8080 |
| PHILGEPS_BASE_URL | URL to crawl | (PhilGEPS search page) |
| DATABASE_PATH | SQLite database location | ./data/philgeps.db |
| CRAWL_INTERVAL_MINUTES | Auto-crawl frequency | 60 |
| REQUEST_DELAY_MS | Delay between requests | 1500 |
| RUN_INITIAL_CRAWL | Crawl on startup | false |

## Troubleshooting

### Container won't start
- Check logs: `docker logs philgeps-crawler`
- Ensure port 8080 is not in use
- Verify environment variables

### Puppeteer issues
- The Docker image includes Chromium
- If crashes occur, increase memory allocation

### Database persistence
- In Docker Compose, data persists in `./data` directory
- In Cloud Run, data is ephemeral (resets on deploy)
- For production, consider Cloud SQL or Firestore