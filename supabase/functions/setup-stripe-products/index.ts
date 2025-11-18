import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('Stripe secret key not configured');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
      // Create or retrieve product
      let product;
      const existingProducts = await stripe.products.list({
        limit: 100,
      });

      const existing = existingProducts.data.find(
        (p) => p.name === productConfig.name
      );

      if (existing) {
        product = existing;
        console.log(`Using existing product: ${product.id}`);
      } else {
        product = await stripe.products.create({
          name: productConfig.name,
          description: productConfig.description,
        });
        console.log(`Created new product: ${product.id}`);
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
        console.log(`Using existing price: ${price.id}`);
      } else {
        const priceData: any = {
          product: product.id,
          unit_amount: productConfig.amount,
          currency: productConfig.currency,
        };

        if (productConfig.interval === 'month') {
          priceData.recurring = { interval: 'month' };
        }

        price = await stripe.prices.create(priceData);
        console.log(`Created new price: ${price.id}`);
      }

      // Update database
      const { error: updateError } = await supabase
        .from('stripe_products')
        .update({
          stripe_product_id: product.id,
          stripe_price_id: price.id,
          updated_at: new Date().toISOString(),
        })
        .eq('plan_name', productConfig.plan_name);

      if (updateError) {
        console.error(`Error updating ${productConfig.plan_name}:`, updateError);
      }

      results.push({
        plan: productConfig.plan_name,
        product_id: product.id,
        price_id: price.id,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Stripe products configured successfully',
        products: results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error setting up Stripe products:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
