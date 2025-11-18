#!/usr/bin/env node

/**
 * Setup Stripe Products Script
 *
 * This script automatically creates products and prices in your Stripe account
 * and updates the Supabase database with the IDs.
 *
 * Usage: node scripts/setup-stripe-products.js
 */

const STRIPE_SECRET_KEY = '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';
const SUPABASE_URL = 'https://bxuhttoeksdghgkywlst.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4dWh0dG9la3NkZ2hna3l3bHN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MDU5MDQsImV4cCI6MjA3ODk4MTkwNH0.2nTNG51P8INFieC2ThwYwefzi7zwXTWdu9JhIaZQyno';

async function setupStripeProducts() {
  console.log('==========================================');
  console.log('Setting up Stripe Products');
  console.log('==========================================\n');

  try {
    // Import Stripe
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });

    console.log('✓ Stripe initialized\n');

    const products = [
      {
        name: 'Decision Hub Pro',
        plan_name: 'pro',
        description: 'Unlimited decisions and simulations with 3x better AI analysis',
        amount: 1000,
        currency: 'gbp',
        interval: 'month',
      },
      {
        name: 'Decision Hub Lifetime',
        plan_name: 'premium',
        description: 'Lifetime access with premium AI analysis and priority support',
        amount: 5000,
        currency: 'gbp',
        interval: 'one-time',
      },
    ];

    const results = [];

    for (const productConfig of products) {
      console.log(`Setting up: ${productConfig.name}...`);

      // Create or retrieve product
      let product;
      const existingProducts = await stripe.products.list({ limit: 100 });
      const existing = existingProducts.data.find((p) => p.name === productConfig.name);

      if (existing) {
        product = existing;
        console.log(`  ✓ Using existing product: ${product.id}`);
      } else {
        product = await stripe.products.create({
          name: productConfig.name,
          description: productConfig.description,
        });
        console.log(`  ✓ Created new product: ${product.id}`);
      }

      // Create or retrieve price
      let price;
      const existingPrices = await stripe.prices.list({
        product: product.id,
        limit: 100,
      });

      const existingPrice = existingPrices.data.find(
        (p) =>
          p.unit_amount === productConfig.amount &&
          p.currency === productConfig.currency
      );

      if (existingPrice) {
        price = existingPrice;
        console.log(`  ✓ Using existing price: ${price.id}`);
      } else {
        const priceData = {
          product: product.id,
          unit_amount: productConfig.amount,
          currency: productConfig.currency,
        };

        if (productConfig.interval === 'month') {
          priceData.recurring = { interval: 'month' };
        }

        price = await stripe.prices.create(priceData);
        console.log(`  ✓ Created new price: ${price.id}`);
      }

      results.push({
        plan: productConfig.plan_name,
        product_id: product.id,
        price_id: price.id,
        amount: productConfig.amount,
      });

      console.log('');
    }

    console.log('==========================================');
    console.log('Setup Complete!');
    console.log('==========================================\n');

    console.log('Products created in Stripe:');
    results.forEach((r) => {
      console.log(`  ${r.plan}: ${r.product_id} / ${r.price_id} (£${r.amount / 100})`);
    });

    console.log('\nNext steps:');
    console.log('1. Update the stripe_products table in Supabase with these IDs');
    console.log('2. Set up the Stripe webhook endpoint');
    console.log('3. Test the checkout flow');

    return results;
  } catch (error) {
    console.error('Error setting up Stripe products:', error.message);
    if (error.type) {
      console.error('Error type:', error.type);
    }
    process.exit(1);
  }
}

// Run the setup
setupStripeProducts()
  .then(() => {
    console.log('\n✓ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
