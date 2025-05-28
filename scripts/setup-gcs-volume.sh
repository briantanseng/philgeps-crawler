#!/bin/bash

# Setup script for Google Cloud Storage volume mount with Cloud Run
# This script creates the necessary GCS bucket and service account

set -e

# Configuration
PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project)}
REGION=${GOOGLE_CLOUD_REGION:-asia-southeast1}
BUCKET_NAME="${PROJECT_ID}-philgeps-data"
SERVICE_ACCOUNT_NAME="philgeps-crawler-sa"
SERVICE_NAME="philgeps-crawler"

echo "Setting up GCS volume mount for PhilGEPS Crawler"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Bucket: $BUCKET_NAME"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "Error: gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Create GCS bucket if it doesn't exist
echo "Creating GCS bucket..."
if ! gsutil ls -b gs://${BUCKET_NAME} &> /dev/null; then
    gsutil mb -p ${PROJECT_ID} -c standard -l ${REGION} gs://${BUCKET_NAME}/
    echo "Bucket created: gs://${BUCKET_NAME}"
else
    echo "Bucket already exists: gs://${BUCKET_NAME}"
fi

# Create data directory in bucket
echo "Creating data directory structure in bucket..."
echo "SQLite database will be stored here" | gsutil cp - gs://${BUCKET_NAME}/data/README.txt

# Create service account if it doesn't exist
echo "Creating service account..."
if ! gcloud iam service-accounts describe ${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com &> /dev/null; then
    gcloud iam service-accounts create ${SERVICE_ACCOUNT_NAME} \
        --display-name="PhilGEPS Crawler Service Account" \
        --project=${PROJECT_ID}
    echo "Service account created"
else
    echo "Service account already exists"
fi

# Grant necessary permissions to the service account
echo "Granting permissions to service account..."

# Grant Storage Object Admin role for the bucket
gsutil iam ch serviceAccount:${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com:objectAdmin gs://${BUCKET_NAME}

# Grant Cloud Run invoker role (if needed for authenticated access)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/run.invoker" \
    --condition=None

# Enable required APIs
echo "Enabling required APIs..."
gcloud services enable run.googleapis.com \
    cloudbuild.googleapis.com \
    containerregistry.googleapis.com \
    artifactregistry.googleapis.com \
    --project=${PROJECT_ID}

# Update the cloud-run-service.yaml with actual values
echo "Updating cloud-run-service.yaml..."
sed -i.bak \
    -e "s/YOUR_BUCKET_NAME/${BUCKET_NAME}/g" \
    -e "s/PROJECT_ID/${PROJECT_ID}/g" \
    ../cloud-run-service.yaml

echo ""
echo "Setup complete! Next steps:"
echo "1. Build and push your container image:"
echo "   gcloud builds submit --tag gcr.io/${PROJECT_ID}/philgeps-crawler"
echo ""
echo "2. Deploy to Cloud Run with volume mount:"
echo "   gcloud run services replace ../cloud-run-service.yaml --region=${REGION}"
echo ""
echo "3. (Optional) Initialize the database:"
echo "   gsutil cp data/philgeps.db gs://${BUCKET_NAME}/data/"
echo ""
echo "Your SQLite database will be persisted at: gs://${BUCKET_NAME}/data/philgeps.db"