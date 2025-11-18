# Stripe Setup Instructions

This document outlines the steps to complete the Stripe integration for the Decision Intelligence Hub.

## 1. Set Environment Variables

You need to set the following Stripe keys in your Supabase project:

### Required Keys:

1. **STRIPE_SECRET_KEY**: `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`
2. **STRIPE_WEBHOOK_SECRET**: (Get this from your Stripe webhook configuration)
3. **VITE_STRIPE_PUBLISHABLE_KEY**: (Your Stripe publishable key - starts with pk_)

### How to Set in Supabase:

```bash
# Set the Stripe secret key (restricted API key)
npx supabase secrets set STRIPE_SECRET_KEY=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

# Set the publishable key in .env file
echo "VITE_STRIPE_PUBLISHABLE_KEY=your_pk_key_here" >> .env

# Set webhook secret (after creating webhook in Stripe)
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

## 2. Run Database Migration

The migration has been created at: `supabase/migrations/20251119000000_stripe_products_setup.sql`

If using Supabase locally:
```bash
npx supabase db push
```

If using Supabase cloud, the migration will be applied automatically on next deployment.

## 3. Create Stripe Products Automatically

After setting the environment variables, call the Edge Function to automatically create products in Stripe:

```bash
curl -X POST https://bxuhttoeksdghgkywlst.supabase.co/functions/v1/setup-stripe-products \
  -H "Content-Type: application/json"
```

Or you can trigger it from the browser console when logged in as admin:

```javascript
const { data, error } = await supabase.functions.invoke('setup-stripe-products');
console.log(data, error);
```

## 4. Configure Stripe Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter URL: `https://bxuhttoeksdghgkywlst.supabase.co/functions/v1/stripe-webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
5. Copy the webhook signing secret
6. Set it as environment variable: `STRIPE_WEBHOOK_SECRET`

## 5. Test the Integration

1. Log in as the admin user: `shravanbvidhya@gmail.com` (password: `Avengers18@@@`)
2. You should be able to switch between plans freely on the Dashboard
3. Other users should see the upgrade buttons on the Pricing page
4. Test a checkout flow as a regular user (it will use the live Stripe environment)

## Features Implemented

### Special User Access
- The user `shravanbvidhya@gmail.com` has admin privileges
- Admin users can switch between all plans without payment
- Admin status is automatically assigned on signup

### Plan Limitations
- **Free Plan**: 2 decisions/month, 1 simulation/month
- **Pro Plan**: Unlimited decisions and simulations, 3x better AI
- **Premium Plan**: Lifetime access with premium features

### AI Analysis
- Free tier uses Gemini (Lovable AI Gateway)
- Pro/Premium tiers use Groq with Llama 3.3 70B (3x more detailed)
- Realistic messaging: "3x more detailed" instead of "100x better"

### Dynamic Product Creation
- Products are stored in the database (`stripe_products` table)
- The `setup-stripe-products` Edge Function automatically creates/updates Stripe products
- Checkout process uses price IDs from the database
- Supports both subscription and one-time payments

## What Changed

1. **New Migration**: `20251119000000_stripe_products_setup.sql`
   - Created `stripe_products` table
   - Added usage tracking columns to `user_roles`
   - Added functions for checking limits
   - Added triggers to increment usage counters

2. **New Edge Function**: `setup-stripe-products`
   - Automatically creates products in Stripe
   - Updates database with product/price IDs
   - Can be re-run safely (idempotent)

3. **Updated Edge Function**: `create-checkout`
   - Now uses database for product information
   - Dynamically creates prices if needed
   - Uses the restricted API key properly

4. **Updated UI**:
   - Pricing page now shows realistic improvements
   - "3x more detailed" instead of "100x better"
   - "50% more accurate insights" for premium

5. **Admin Features**:
   - Admin email can switch plans freely
   - Dashboard shows plan switcher for admin users
   - No payment required for admin

## Troubleshooting

If you get "empty string" errors with Stripe:
- Make sure `STRIPE_SECRET_KEY` is set in Supabase secrets
- The restricted API key should work without issues
- Check that the key starts with `rk_live_`

If products aren't created:
- Run the `setup-stripe-products` function manually
- Check Supabase function logs for errors
- Verify the Stripe API key has permission to create products/prices

If webhooks aren't working:
- Verify the webhook URL is correct
- Check the webhook signing secret is set
- Look at Stripe webhook logs for delivery failures
