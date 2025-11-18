import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

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
    
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('Stripe secret key not configured');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    // Define pricing
    const prices: Record<string, { amount: number; mode: string }> = {
      pro: { amount: 1000, mode: 'subscription' }, // £10/month
      premium: { amount: 5000, mode: 'payment' },  // £50 one-time
    };

    const selectedPrice = prices[plan];
    if (!selectedPrice) {
      throw new Error('Invalid plan selected');
    }

    const sessionConfig: any = {
      customer_email: undefined, // Will be set from user metadata
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: plan === 'pro' ? 'Decision Hub Pro' : 'Decision Hub Lifetime',
              description: plan === 'pro' 
                ? 'Unlimited decisions, advanced features, £10/month'
                : 'Unlimited decisions forever, £50 one-time payment',
            },
            unit_amount: selectedPrice.amount,
            ...(selectedPrice.mode === 'subscription' && {
              recurring: { interval: 'month' },
            }),
          },
          quantity: 1,
        },
      ],
      mode: selectedPrice.mode,
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