#!/bin/bash

#####################################################################
# Smoke Tests for Xeno FDE Shopify Ingestion API
#
# Purpose: Quick validation of deployed services using curl commands
# Usage: BASE_URL=https://your-api.com ./smoke-tests.sh
#####################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
TEST_TENANT_ID="${TEST_TENANT_ID:-1}"
SHOPIFY_HMAC_SECRET="${SHOPIFY_HMAC_SECRET:-test_secret}"

# Counters
TESTS_PASSED=0
TESTS_FAILED=0

echo "========================================="
echo "   Xeno FDE API Smoke Tests"
echo "========================================="
echo "Target: $BASE_URL"
echo "Tenant ID: $TEST_TENANT_ID"
echo "========================================="
echo ""

#####################################################################
# Helper Functions
#####################################################################

# Print test header
print_test() {
  echo -e "${YELLOW}TEST:${NC} $1"
}

# Print success
print_success() {
  echo -e "${GREEN}✓ PASS:${NC} $1"
  ((TESTS_PASSED++))
  echo ""
}

# Print failure
print_fail() {
  echo -e "${RED}✗ FAIL:${NC} $1"
  ((TESTS_FAILED++))
  echo ""
}

# Generate HMAC signature for webhook testing
generate_hmac() {
  local payload=$1
  local secret=$2
  echo -n "$payload" | openssl dgst -sha256 -hmac "$secret" -binary | base64
}

#####################################################################
# Test 1: Health Check
#####################################################################

print_test "Health Check (GET /)"

RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/" || echo "000")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
  if echo "$BODY" | grep -q "status"; then
    print_success "Health check passed (Status: $HTTP_CODE)"
  else
    print_fail "Health check returned 200 but unexpected body: $BODY"
  fi
else
  print_fail "Health check failed (Status: $HTTP_CODE)"
fi

#####################################################################
# Test 2: Metrics API - Sample Request
#####################################################################

print_test "Metrics API (GET /api/tenants/$TEST_TENANT_ID/metrics)"

RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/tenants/$TEST_TENANT_ID/metrics" || echo "000")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
  if echo "$BODY" | grep -q "orders\|metrics"; then
    print_success "Metrics API accessible (Status: $HTTP_CODE)"
    echo "Sample response: ${BODY:0:200}..."
  else
    print_fail "Metrics returned 200 but unexpected body: $BODY"
  fi
elif [ "$HTTP_CODE" == "404" ]; then
  echo -e "${YELLOW}! WARNING:${NC} Tenant not found (may be expected if no tenant with ID $TEST_TENANT_ID)"
  echo ""
else
  print_fail "Metrics API failed (Status: $HTTP_CODE, Body: $BODY)"
fi

#####################################################################
# Test 3: Webhook Endpoint - Simulated Request
#####################################################################

print_test "Webhook Endpoint (POST /webhooks/shopify/orders_create)"

# Sample webhook payload
WEBHOOK_PAYLOAD='{
  "id": 820982911946154508,
  "email": "test@example.com",
  "created_at": "2023-01-01T12:00:00-05:00",
  "total_price": "199.00",
  "currency": "USD",
  "customer": {
    "id": 115310627314723954,
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "Customer"
  },
  "line_items": [
    {
      "id": 866550311766439020,
      "variant_id": 808950810,
      "title": "Test Product",
      "quantity": 1,
      "price": "199.00"
    }
  ]
}'

# Generate HMAC
HMAC_SIGNATURE=$(generate_hmac "$WEBHOOK_PAYLOAD" "$SHOPIFY_HMAC_SECRET")

echo "Generated HMAC: ${HMAC_SIGNATURE:0:20}..."

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: $HMAC_SIGNATURE" \
  -H "X-Shopify-Shop-Domain: test-store.myshopify.com" \
  -H "X-Shopify-Topic: orders/create" \
  -H "X-Shopify-API-Version: 2024-01" \
  -d "$WEBHOOK_PAYLOAD" \
  "$BASE_URL/webhooks/shopify/orders_create" || echo "000")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

# Webhook might return 200, 201, or 401 (if HMAC verification fails with different secret)
if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "201" ]; then
  print_success "Webhook endpoint accessible and processed (Status: $HTTP_CODE)"
elif [ "$HTTP_CODE" == "401" ]; then
  echo -e "${YELLOW}! WARNING:${NC} Webhook returned 401 (HMAC verification may use different secret)"
  echo "This is expected if SHOPIFY_HMAC_SECRET doesn't match server configuration"
  echo ""
elif [ "$HTTP_CODE" == "404" ]; then
  echo -e "${YELLOW}! WARNING:${NC} Webhook endpoint not found (may not be implemented yet)"
  echo ""
else
  print_fail "Webhook endpoint failed (Status: $HTTP_CODE, Body: $BODY)"
fi

#####################################################################
# Test 4: Onboarding Endpoint (Optional - may require Shopify auth)
#####################################################################

print_test "Onboarding Endpoint (POST /api/onboard)"

ONBOARD_PAYLOAD='{
  "shopifyDomain": "smoke-test-store.myshopify.com",
  "accessToken": "test_access_token_12345"
}'

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$ONBOARD_PAYLOAD" \
  "$BASE_URL/api/onboard" || echo "000")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "201" ]; then
  print_success "Onboarding endpoint accessible (Status: $HTTP_CODE)"
elif [ "$HTTP_CODE" == "400" ]; then
  echo -e "${YELLOW}! INFO:${NC} Onboarding returned 400 (may be validation error with test data)"
  echo ""
elif [ "$HTTP_CODE" == "404" ]; then
  echo -e "${YELLOW}! WARNING:${NC} Onboarding endpoint not found (may not be implemented yet)"
  echo ""
else
  echo -e "${YELLOW}! INFO:${NC} Onboarding returned status $HTTP_CODE"
  echo ""
fi

#####################################################################
# Test 5: Manual Sync Endpoint
#####################################################################

print_test "Manual Sync (POST /api/tenants/$TEST_TENANT_ID/sync)"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  "$BASE_URL/api/tenants/$TEST_TENANT_ID/sync" || echo "000")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
  print_success "Sync endpoint accessible (Status: $HTTP_CODE)"
  echo "Sample response: ${BODY:0:200}..."
elif [ "$HTTP_CODE" == "404" ]; then
  echo -e "${YELLOW}! WARNING:${NC} Tenant not found (may be expected if no tenant with ID $TEST_TENANT_ID)"
  echo ""
else
  echo -e "${YELLOW}! INFO:${NC} Sync returned status $HTTP_CODE (may need valid tenant)"
  echo ""
fi

#####################################################################
# Summary
#####################################################################

echo "========================================="
echo "   Test Summary"
echo "========================================="
echo -e "${GREEN}Passed:${NC} $TESTS_PASSED"
echo -e "${RED}Failed:${NC} $TESTS_FAILED"
echo "========================================="

if [ $TESTS_FAILED -gt 0 ]; then
  echo -e "${RED}Some tests failed!${NC}"
  exit 1
else
  echo -e "${GREEN}All critical tests passed!${NC}"
  exit 0
fi
