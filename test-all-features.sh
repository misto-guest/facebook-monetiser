#!/bin/bash

echo "========================================"
echo "Facebook Monetiser - Comprehensive QA"
echo "========================================"
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

# Test 1: Check if all required files exist
echo "Test 1: File Structure Check"
echo "----------------------------"

FILES=(
  "backend/services/content-generator.js"
  "backend/services/runware-service.js"
  "backend/services/facebook-publisher.js"
  "backend/scripts/scrape-competitors.js"
  "backend/scripts/scrape-followers.js"
  "backend/scripts/monitor-posts.js"
  "backend/scripts/publish-scheduled.js"
  "backend/scripts/setup-automation.sh"
  "backend/api/publishing.js"
  ".env.example"
  "DEPLOYMENT-GUIDE.md"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $file"
    ((PASS++))
  else
    echo -e "${RED}✗${NC} $file (MISSING)"
    ((FAIL++))
  fi
done

echo ""
echo "Test 2: Script Executability"
echo "----------------------------"

SCRIPTS=(
  "backend/scripts/scrape-competitors.js"
  "backend/scripts/scrape-followers.js"
  "backend/scripts/monitor-posts.js"
  "backend/scripts/publish-scheduled.js"
  "backend/scripts/setup-automation.sh"
)

for script in "${SCRIPTS[@]}"; do
  if [ -x "$script" ]; then
    echo -e "${GREEN}✓${NC} $script (executable)"
    ((PASS++))
  else
    echo -e "${YELLOW}⚠${NC} $script (not executable, fixing...)"
    chmod +x "$script"
    echo -e "${GREEN}✓${NC} $script (fixed)"
    ((PASS++))
  fi
done

echo ""
echo "Test 3: Logs Directory"
echo "----------------------"

if [ -d "logs" ]; then
  echo -e "${GREEN}✓${NC} logs directory exists"
  ((PASS++))
else
  echo -e "${YELLOW}⚠${NC} logs directory missing, creating..."
  mkdir -p logs
  echo -e "${GREEN}✓${NC} logs directory created"
  ((PASS++))
fi

if [ -f "logs/automation.log" ]; then
  echo -e "${GREEN}✓${NC} logs/automation.log exists"
  ((PASS++))
else
  echo -e "${YELLOW}⚠${NC} logs/automation.log missing, creating..."
  touch logs/automation.log
  echo -e "${GREEN}✓${NC} logs/automation.log created"
  ((PASS++))
fi

echo ""
echo "Test 4: Environment Variables Template"
echo "---------------------------------------"

if grep -q "RUNWARE_API_KEY" .env.example; then
  echo -e "${GREEN}✓${NC} RUNWARE_API_KEY in .env.example"
  ((PASS++))
else
  echo -e "${RED}✗${NC} RUNWARE_API_KEY missing from .env.example"
  ((FAIL++))
fi

if grep -q "FACEBOOK_PAGE_ACCESS_TOKEN" .env.example; then
  echo -e "${GREEN}✓${NC} FACEBOOK_PAGE_ACCESS_TOKEN in .env.example"
  ((PASS++))
else
  echo -e "${RED}✗${NC} FACEBOOK_PAGE_ACCESS_TOKEN missing from .env.example"
  ((FAIL++))
fi

echo ""
echo "Test 5: JavaScript Syntax Check"
echo "-------------------------------"

JS_FILES=(
  "backend/services/content-generator.js"
  "backend/services/runware-service.js"
  "backend/services/facebook-publisher.js"
  "backend/api/publishing.js"
)

for jsfile in "${JS_FILES[@]}"; do
  if node -c "$jsfile" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} $jsfile (valid syntax)"
    ((PASS++))
  else
    echo -e "${RED}✗${NC} $jsfile (syntax error)"
    ((FAIL++))
  fi
done

echo ""
echo "Test 6: API Route Registration"
echo "------------------------------"

if grep -q "publishingRouter" backend/server.js; then
  echo -e "${GREEN}✓${NC} Publishing router registered in server.js"
  ((PASS++))
else
  echo -e "${RED}✗${NC} Publishing router NOT registered"
  ((FAIL++))
fi

if grep -q "app.use('/api/publishing'" backend/server.js; then
  echo -e "${GREEN}✓${NC} /api/publishing route configured"
  ((PASS++))
else
  echo -e "${RED}✗${NC} /api/publishing route NOT configured"
  ((FAIL++))
fi

echo ""
echo "========================================"
echo "Test Summary"
echo "========================================"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
  exit 0
else
  echo -e "${RED}✗ SOME TESTS FAILED${NC}"
  exit 1
fi
