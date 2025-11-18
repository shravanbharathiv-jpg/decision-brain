#!/bin/bash

# Initialize Stripe Integration for Decision Intelligence Hub
# This script sets up the Stripe products in your Stripe account

echo "=========================================="
echo "Decision Intelligence Hub - Stripe Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI is not installed${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo -e "${YELLOW}Step 1: Setting Stripe Secret Key${NC}"
echo "Using the restricted API key..."

# Set the Stripe secret key
supabase secrets set STRIPE_SECRET_KEY=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

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Stripe secret key set successfully${NC}"
else
    echo -e "${RED}✗ Failed to set Stripe secret key${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Checking database migration${NC}"

# Push database migrations
supabase db push

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database migration applied${NC}"
else
    echo -e "${RED}✗ Failed to apply migration${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 3: Deploying Edge Functions${NC}"

# Deploy the setup-stripe-products function
supabase functions deploy setup-stripe-products

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Edge function deployed${NC}"
else
    echo -e "${RED}✗ Failed to deploy edge function${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 4: Creating Stripe Products${NC}"
echo "Calling Edge Function to create products in Stripe..."

# Get the Supabase project URL
PROJECT_URL="https://bxuhttoeksdghgkywlst.supabase.co"

# Call the Edge Function to create products
RESPONSE=$(curl -s -X POST "${PROJECT_URL}/functions/v1/setup-stripe-products" \
  -H "Content-Type: application/json")

if echo "$RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✓ Stripe products created successfully${NC}"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
else
    echo -e "${RED}✗ Failed to create Stripe products${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

echo ""
echo -e "${GREEN}=========================================="
echo "Setup Complete!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Add your Stripe publishable key to .env:"
echo "   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_key"
echo ""
echo "2. Set up Stripe webhook:"
echo "   URL: ${PROJECT_URL}/functions/v1/stripe-webhook"
echo "   Events: checkout.session.completed, customer.subscription.deleted"
echo ""
echo "3. Set webhook secret:"
echo "   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_secret"
echo ""
echo "4. Test the integration:"
echo "   - Login as admin: shravanbvidhya@gmail.com (Avengers18@@@)"
echo "   - Switch between plans on Dashboard"
echo "   - Test checkout flow as regular user"
echo ""
