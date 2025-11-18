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
    const { userId, plan } = await req.json();

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
    if (!stripeKey) {
      throw new Error('Stripe secret key not configured');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get product details from database
    const { data: productData, error: productError } = await supabase
      .from('stripe_products')
      .select('*')
      .eq('plan_name', plan)
      .single();

    if (productError || !productData) {
      throw new Error('Product not found in database');
    }

    // If price_id doesn't exist, create it dynamically
    let priceId = productData.stripe_price_id;

    if (!priceId && productData.stripe_product_id) {
      const priceData: any = {
        product: productData.stripe_product_id,
        unit_amount: productData.amount,
        currency: productData.currency,
      };

      if (productData.interval === 'month') {
        priceData.recurring = { interval: 'month' };
      }

      const price = await stripe.prices.create(priceData);
      priceId = price.id;

      // Update database with new price ID
      await supabase
        .from('stripe_products')
        .update({ stripe_price_id: priceId })
        .eq('plan_name', plan);
    }

    if (!priceId) {
      throw new Error('Unable to create or find price for product');
    }

    const sessionConfig: any = {
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: productData.interval === 'month' ? 'subscription' : 'payment',
      success_url: `${req.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/pricing`,
      metadata: {
        userId,
        plan,
      },
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return new Response(
      JSON.stringify({ sessionId: session.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});