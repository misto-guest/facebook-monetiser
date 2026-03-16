#!/bin/bash

# Facebook Monetiser - Complete Facebook API Setup
# Run this script to deploy all credentials to Fly.io

set -e

echo "========================================"
echo "Facebook Monetiser - Deploying Secrets"
echo "========================================"
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_NAME="facebook-monetiser"

echo -e "${YELLOW}Setting Facebook secrets for ${APP_NAME}...${NC}"
echo ""

# Secret 1: App ID
echo "1/4 Setting FACEBOOK_APP_ID..."
flyctl secrets set FACEBOOK_APP_ID=958861036666808 -a ${APP_NAME}
echo -e "${GREEN}✓ FACEBOOK_APP_ID set${NC}"
echo ""

# Secret 2: App Secret
echo "2/4 Setting FACEBOOK_APP_SECRET..."
flyctl secrets set FACEBOOK_APP_SECRET=79cdd0d74eaaef49d13bc8ea4321409b -a ${APP_NAME}
echo -e "${GREEN}✓ FACEBOOK_APP_SECRET set${NC}"
echo ""

# Secret 3: Page ID
echo "3/4 Setting FACEBOOK_PAGE_ID..."
flyctl secrets set FACEBOOK_PAGE_ID=61587808031992 -a ${APP_NAME}
echo -e "${GREEN}✓ FACEBOOK_PAGE_ID set${NC}"
echo ""

# Secret 4: Page Access Token
echo "4/4 Setting FACEBOOK_PAGE_ACCESS_TOKEN..."
flyctl secrets set FACEBOOK_PAGE_ACCESS_TOKEN=EAANoFDt6v7gBQZBVCH9hThZBTC2BKhh9hNCOuBdY0Q2ej1SyUfb8DqhRQfJ8J6QntpHeY2cKWumRaIz0X2IpI583E7ktEgZAjrR3iwGthCPuakgDqIZAV3JnQx1zZB0RE4jeULmBJoUAbBHZBLbnh9ZAsOakpqD7Y8kjoAnwbSLBvf5PQZBzIRhf5td3SPljPotTBqzCfqJtGCTnOd8omaBPSVRcCbiXLEx4Hq24J43ojHfpIaPG28MM5CmoxFEJPc5ZCY3dSw75PEXsZD -a ${APP_NAME}
echo -e "${GREEN}✓ FACEBOOK_PAGE_ACCESS_TOKEN set${NC}"
echo ""

echo "========================================"
echo -e "${GREEN}All secrets deployed!${NC}"
echo "========================================"
echo ""

echo "Restarting app to apply changes..."
flyctl apps restart ${APP_NAME}
echo ""

echo -e "${GREEN}✓ App restarted${NC}"
echo ""

echo "========================================"
echo "Deployment Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Wait 30 seconds for app to fully restart"
echo "2. Go to: https://facebook-monetiser.fly.dev/dashboard"
echo "3. Click Settings → Facebook Graph API"
echo "4. Click 'Test Connection'"
echo "5. Should see: ✅ Facebook API connection successful"
echo ""
echo -e "${GREEN}You're all set! 🚀${NC}"
