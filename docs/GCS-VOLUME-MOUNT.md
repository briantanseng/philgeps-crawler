# Google Cloud Storage Volume Mount for SQLite

This guide explains how to use Google Cloud Storage (GCS) as a persistent volume for SQLite when deploying to Cloud Run.

## Overview

Cloud Run now supports mounting Google Cloud Storage buckets as file system volumes using Cloud Storage FUSE. This allows SQLite databases to persist across deployments and container restarts.

## Prerequisites

- Google Cloud Project with billing enabled
- `gcloud` CLI installed and configured
- Cloud Run API enabled
- Sufficient IAM permissions

## Setup Instructions

### 1. Automated Setup (Recommended)

Run the provided setup script:

```bash
cd scripts
./setup-gcs-volume.sh
```

This script will:
- Create a GCS bucket named `{PROJECT_ID}-philgeps-data`
- Create a service account `philgeps-crawler-sa`
- Grant necessary permissions
- Update deployment configurations

### 2. Manual Setup

If you prefer manual setup:

```bash
# Set variables
export PROJECT_ID=$(gcloud config get-value project)
export BUCKET_NAME="${PROJECT_ID}-philgeps-data"
export SERVICE_ACCOUNT="philgeps-crawler-sa"

# Create bucket
gsutil mb -p ${PROJECT_ID} -c standard -l asia-southeast1 gs://${BUCKET_NAME}/

# Create service account
gcloud iam service-accounts create ${SERVICE_ACCOUNT} \
  --display-name="PhilGEPS Crawler Service Account"

# Grant permissions
gsutil iam ch serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com:objectAdmin gs://${BUCKET_NAME}
```

## Deployment

### Using Cloud Build

Deploy with SQLite and GCS volume mount:

```bash
gcloud builds submit --substitutions=_DATABASE_TYPE=sqlite3
```

### Using Service Configuration

Deploy using the service YAML file:

```bash
gcloud run services replace cloud-run-service.yaml --region=asia-southeast1
```

## How It Works

1. **Volume Mount**: The GCS bucket is mounted at `/data` in the container
2. **Database Path**: SQLite database is stored at `/data/philgeps.db`
3. **Persistence**: All changes are automatically synced to GCS
4. **Performance**: Cloud Storage FUSE provides local caching for better performance

## Configuration

### Environment Variables

```env
DATABASE_TYPE=sqlite3
DATABASE_PATH=/data/philgeps.db
```

### Service Configuration

The `cloud-run-service.yaml` includes:

```yaml
spec:
  template:
    spec:
      volumes:
      - name: data-volume
        csi:
          driver: gcsfuse.run.googleapis.com
          volumeAttributes:
            bucketName: YOUR_BUCKET_NAME
            mountOptions: "implicit-dirs"
      containers:
      - name: philgeps-crawler
        volumeMounts:
        - name: data-volume
          mountPath: /data
```

## Best Practices

1. **Initialization**: First deployment creates an empty database
2. **Backups**: Use GCS versioning for automatic backups
3. **Performance**: Consider PostgreSQL for high-traffic scenarios
4. **Monitoring**: Set up alerts for storage usage

## Troubleshooting

### Database Not Persisting

1. Check volume mount in Cloud Run console
2. Verify service account permissions
3. Check GCS bucket accessibility

### Permission Errors

```bash
# Grant additional permissions if needed
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

### Performance Issues

- Enable GCS bucket caching
- Consider increasing Cloud Run memory
- Monitor I/O metrics in Cloud Console

## Migration

### From Local SQLite to GCS

```bash
# Upload existing database
gsutil cp data/philgeps.db gs://${BUCKET_NAME}/data/
```

### From GCS to PostgreSQL

1. Download SQLite database from GCS
2. Use migration tools to convert to PostgreSQL
3. Deploy with `_DATABASE_TYPE=postgres`

## Cost Considerations

- **Storage**: ~$0.02/GB/month for standard storage
- **Operations**: Minimal cost for read/write operations
- **Network**: No egress charges within same region

## Security

- Service account has minimal required permissions
- Database file is not publicly accessible
- Consider encryption at rest for sensitive data

## Limitations

- SQLite concurrent write limitations still apply
- Not suitable for multiple Cloud Run instances writing simultaneously
- For high concurrency, use PostgreSQL instead