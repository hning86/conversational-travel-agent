#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

# Define colors for premium output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=============================================================${NC}"
echo -e "${BLUE}   Booking.com AI Companion - Cloud Run Deployment Engine    ${NC}"
echo -e "${BLUE}=============================================================${NC}"
echo ""

# Step 1: Verify gcloud CLI installation
echo -e "${YELLOW}[Step 1/5] Checking gcloud CLI installation...${NC}"
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed.${NC}"
    echo -e "Please install the Google Cloud SDK from https://cloud.google.com/sdk and try again."
    exit 1
fi
echo -e "${GREEN}✓ gcloud CLI is installed.${NC}"
echo ""

# Step 2: Determine GCP Project
echo -e "${YELLOW}[Step 2/5] Selecting Google Cloud Project...${NC}"
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")

if [ -n "$CURRENT_PROJECT" ]; then
    read -p "Use current GCP project [$CURRENT_PROJECT]? (Y/n): " use_current
    use_current=${use_current:-"y"}
    if [[ "$use_current" =~ ^[yY] ]]; then
        PROJECT_ID=$CURRENT_PROJECT
    fi
fi

if [ -z "$PROJECT_ID" ]; then
    read -p "Enter your Google Cloud Project ID: " input_project
    if [ -z "$input_project" ]; then
        echo -e "${RED}Error: Project ID cannot be empty.${NC}"
        exit 1
    fi
    PROJECT_ID=$input_project
fi

# Set the active project
gcloud config set project "$PROJECT_ID"
echo -e "${GREEN}✓ Project set to: $PROJECT_ID${NC}"
echo ""

# Step 3: Determine Region
echo -e "${YELLOW}[Step 3/5] Configuring Deployment Region...${NC}"
DEFAULT_REGION="us-central1"
read -p "Enter region [$DEFAULT_REGION]: " input_region
REGION=${input_region:-$DEFAULT_REGION}
echo -e "${GREEN}✓ Region set to: $REGION${NC}"
echo ""

# Step 4: Determine Service Name
echo -e "${YELLOW}[Step 4/5] Setting Service Details...${NC}"
DEFAULT_SERVICE="booking-companion-demo"
read -p "Enter Cloud Run service name [$DEFAULT_SERVICE]: " input_service
SERVICE_NAME=${input_service:-$DEFAULT_SERVICE}
echo -e "${GREEN}✓ Service name set to: $SERVICE_NAME${NC}"
echo ""

# Step 5: Deploy to Cloud Run
echo -e "${YELLOW}[Step 5/5] Packaging and deploying to Google Cloud Run...${NC}"
echo -e "This will automatically build your container using Cloud Build and deploy it to Cloud Run."
echo -e "Running: ${BLUE}gcloud run deploy $SERVICE_NAME --source . --region $REGION --no-allow-unauthenticated${NC}"
echo ""

# Execute deployment
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --no-allow-unauthenticated

echo ""
echo -e "${GREEN}=============================================================${NC}"
echo -e "${GREEN} 🎉 Deployment Completed Successfully!                        ${NC}"
echo -e "${GREEN}=============================================================${NC}"
echo ""
echo -e "Your multi-agent companion is live. You can access the web UI at the URL above."
echo ""
