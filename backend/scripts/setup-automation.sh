#!/bin/bash

# Facebook Monetiser - Automation Setup Script
# This script sets up all cron jobs for the Facebook Monetiser tool

set -e

echo "==================================="
echo "Facebook Monetiser Automation Setup"
echo "==================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Detect environment
if [ -n "$FLY_APP_NAME" ]; then
    ENVIRONMENT="fly.io"
    WORKING_DIR="/app"
elif [ -d "/app" ]; then
    ENVIRONMENT="production"
    WORKING_DIR="/app"
else
    ENVIRONMENT="local"
    WORKING_DIR="$(pwd)"
fi

echo -e "${GREEN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${GREEN}Working directory: ${WORKING_DIR}${NC}"
echo ""

# Create logs directory
echo "Creating logs directory..."
mkdir -p "${WORKING_DIR}/logs"
touch "${WORKING_DIR}/logs/automation.log"
echo -e "${GREEN}✓ Logs directory created${NC}"
echo ""

# Check if scripts are executable
echo "Making scripts executable..."
chmod +x "${WORKING_DIR}/backend/scripts/"*.js
echo -e "${GREEN}✓ Scripts are executable${NC}"
echo ""

# Setup cron jobs
echo "Setting up cron jobs..."
echo ""

# For Fly.io or production servers
if [ "$ENVIRONMENT" = "fly.io" ] || [ "$ENVIRONMENT" = "production" ]; then
    echo "To setup cron jobs on this server, run:"
    echo ""
    echo -e "${YELLOW}crontab -e${NC}"
    echo ""
    echo "Then add the following lines:"
    echo ""
    echo -e "${GREEN}# Facebook Monetiser - Competitor Scraping (every 3 hours)${NC}"
    echo "0 */3 * * * cd ${WORKING_DIR} && node backend/scripts/scrape-competitors.js >> logs/automation.log 2>&1"
    echo ""
    echo -e "${GREEN}# Facebook Monetiser - Follower Count Scraping (daily at 9 AM)${NC}"
    echo "0 9 * * * cd ${WORKING_DIR} && node backend/scripts/scrape-followers.js >> logs/automation.log 2>&1"
    echo ""
    echo -e "${GREEN}# Facebook Monetiser - Post Monitoring (every 6 hours)${NC}"
    echo "0 */6 * * * cd ${WORKING_DIR} && node backend/scripts/monitor-posts.js >> logs/automation.log 2>&1"
    echo ""
    echo -e "${GREEN}# Facebook Monetiser - Scheduled Posts Publishing (every 5 minutes)${NC}"
    echo "*/5 * * * * cd ${WORKING_DIR} && node backend/scripts/publish-scheduled.js >> logs/automation.log 2>&1"
    echo ""

# For local development
else
    echo -e "${YELLOW}Local development detected${NC}"
    echo "Cron jobs are not set up for local development."
    echo "To test scripts manually, run:"
    echo ""
    echo -e "${GREEN}node backend/scripts/scrape-competitors.js${NC}"
    echo -e "${GREEN}node backend/scripts/scrape-followers.js${NC}"
    echo -e "${GREEN}node backend/scripts/monitor-posts.js${NC}"
    echo -e "${GREEN}node backend/scripts/publish-scheduled.js${NC}"
    echo ""
fi

echo "==================================="
echo "Setup Complete!"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Configure environment variables (copy .env.example to .env)"
echo "2. Set up Facebook Graph API credentials"
echo "3. Add competitor sources in the dashboard"
echo "4. Test scripts manually before adding to crontab"
echo ""
echo "View logs:"
echo -e "${GREEN}tail -f ${WORKING_DIR}/logs/automation.log${NC}"
echo ""
