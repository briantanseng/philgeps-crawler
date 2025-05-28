#!/bin/bash

# PhilGEPS Full Download Script
# This script downloads all pages from PhilGEPS with resume capability

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}PhilGEPS Full Download Script${NC}"
echo "=============================="
echo ""

# Check if running in background
if [ "$1" == "--background" ]; then
    echo -e "${YELLOW}Running in background mode...${NC}"
    export AUTO_CONFIRM=true
    nohup npm run download:all > download.log 2>&1 &
    PID=$!
    echo -e "${GREEN}Download started in background with PID: $PID${NC}"
    echo "Check progress with: tail -f download.log"
    echo "Stop with: kill $PID"
    exit 0
fi

# Check if running with custom settings
if [ "$1" == "--fast" ]; then
    echo -e "${YELLOW}Running in fast mode (smaller delays)...${NC}"
    export REQUEST_DELAY_MS=2000
    export MAX_JITTER_MS=1000
    export BATCH_PAUSE_MS=10000
elif [ "$1" == "--slow" ]; then
    echo -e "${YELLOW}Running in slow mode (larger delays)...${NC}"
    export REQUEST_DELAY_MS=10000
    export MAX_JITTER_MS=5000
    export BATCH_PAUSE_MS=60000
elif [ "$1" == "--aggressive" ]; then
    echo -e "${RED}Running in aggressive mode (minimal delays)...${NC}"
    echo -e "${RED}WARNING: This may cause rate limiting!${NC}"
    export REQUEST_DELAY_MS=1000
    export MAX_JITTER_MS=500
    export BATCH_PAUSE_MS=5000
    export DOWNLOAD_BATCH_SIZE=20
fi

# Show current settings
echo "Current settings:"
echo "- Request delay: ${REQUEST_DELAY_MS:-5000}ms"
echo "- Max jitter: ${MAX_JITTER_MS:-3000}ms"
echo "- Batch pause: ${BATCH_PAUSE_MS:-30000}ms"
echo "- Batch size: ${DOWNLOAD_BATCH_SIZE:-10} pages"
echo ""

# Check for state file
STATE_FILE="data/download-state.json"
if [ -f "$STATE_FILE" ]; then
    echo -e "${YELLOW}Found existing download state${NC}"
    echo "Previous download will be resumed."
    echo ""
fi

# Run the download
npm run download:all

# Check exit code
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Download completed successfully!${NC}"
else
    echo -e "${RED}Download failed or was interrupted${NC}"
    echo "Run this script again to resume"
fi