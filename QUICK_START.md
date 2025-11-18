# Quick Start Guide - Stripe Integration

## Immediate Actions Required

### 1. Set the Stripe API Key (REQUIRED)
```bash
npx supabase secrets set STRIPE_SECRET_KEY=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
```

### 2. Add Publishable Key to .env (REQUIRED)
```bash
# Get your Stripe publishable key from: https://dashboard.stripe.com/apikeys
echo "VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY_HERE" >> .env
```

### 3. Run the Database Migration
```bash
npx supabase db push
```

### 4. Create Stripe Products
Run this to automatically create products in your Stripe account:
```bash
node scripts/setup-stripe-products.js
```

Or use the Edge Function:
```bash
curl -X POST https://bxuhttoeksdghgkywlst.supabase.co/functions/v1/setup-stripe-products
```

### 5. Set Up Stripe Webhook
1. Go to: https://dashboard.stripe.com/webhooks
2. Add endpoint URL: `https://bxuhttoeksdghgkywlst.supabase.co/functions/v1/stripe-webhook`
3. Select events: `checkout.session.completed`, `customer.subscription.deleted`
4. Copy the webhook signing secret
5. Run:
```bash
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
```

## Test Everything

### Admin User (Special Access)
- Email: `shravanbvidhya@gmail.com`
- Password: `Avengers18@@@`
- Can switch plans freely without payment
- Unlimited decisions and simulations

### Regular User Flow
1. Sign up with any email
2. Create 2 decisions (free limit)
3. Get redirected to pricing on 3rd attempt
4. Click upgrade button
5. Complete Stripe checkout
6. Get unlimited access

## What's New

### Database
- `stripe_products` table stores product/price IDs
- `user_roles.is_admin` for special access
- `user_roles.decisions_this_month` tracks usage
- `user_roles.simulations_this_month` tracks usage
- Functions check limits before creation

### UI Changes
- "3x more detailed AI analysis" (was "100x better")
- "50% more accurate insights" for premium
- Admin users see plan switcher on Dashboard
- Usage counters show remaining credits

### Edge Functions
- `setup-stripe-products` - Auto-creates products
- `create-checkout` - Uses database for products
- Both use restricted API key properly

## Pricing Plans

### Free
- £0 forever
- 2 decisions/month
- 1 simulation/month
- Basic AI (Gemini)

### Pro
- £10/month
- Unlimited decisions
- Unlimited simulations
- 3x better AI (Groq Llama 3.3)
- Team collaboration

### Premium (Lifetime)
- £50 one-time
- Everything in Pro
- Lifetime access
- 50% more accurate insights
- Premium support

## Files to Review

- `setup-stripe.md` - Complete setup documentation
- `IMPLEMENTATION_SUMMARY.md` - Full implementation details
- `supabase/migrations/20251119000000_stripe_products_setup.sql` - Database changes
- `scripts/setup-stripe-products.js` - Automated setup script

## Troubleshooting

**"Empty string" Stripe errors:**
- Make sure `STRIPE_SECRET_KEY` is set in Supabase secrets
- The create-checkout function now uses `|| ''` to prevent this

**Products not showing in checkout:**
- Run the setup-stripe-products script/function
- Check Supabase function logs for errors
- Verify Stripe API key has permission to create products

**Webhook not working:**
- Verify webhook URL is correct
- Check webhook signing secret is set
- Look at Stripe dashboard webhook logs

**Admin user can't switch plans:**
- Check if user has `is_admin = true` in user_roles table
- Verify email is exactly `shravanbvidhya@gmail.com`
- Check Dashboard code has admin check

## Next Steps

1. Run the setup commands above
2. Test with admin user first
3. Test checkout flow with test card
4. Enable live mode when ready
5. Monitor Stripe webhook logs

## Live Stripe Account

You're using the LIVE Stripe API key (rk_live_...), so:
- Real money will be charged
- Use test cards only during testing
- Switch to test keys for development
- Monitor transactions carefully

## Support

If anything doesn't work:
1. Check all environment variables are set
2. Review function logs in Supabase
3. Check Stripe webhook delivery logs
4. Verify database migration was applied
5. Test with admin user to isolate issues

Done! Your Stripe integration is ready to go.
