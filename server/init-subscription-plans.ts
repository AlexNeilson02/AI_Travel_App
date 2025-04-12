import Stripe from 'stripe';
import { db } from './db';
import { subscriptionPlans } from '@shared/schema';
import { log } from './vite';

// Initialize Stripe with the secret key from environment variables
const stripeApiKey = process.env.STRIPE_SECRET_KEY || '';

// Create a mock Stripe object for development without API key
const stripeMock = {
  products: {
    create: async (params: any) => ({ id: `prod_mock_${Date.now()}` }),
  },
  prices: {
    create: async (params: any) => ({ id: `price_mock_${params.product}_${Date.now()}` }),
  }
};

// Get Stripe instance or mock based on API key availability
function getStripe() {
  if (!stripeApiKey) {
    log('No Stripe API key found. Using mock Stripe implementation.');
    return stripeMock;
  }
  
  try {
    return new Stripe(stripeApiKey);
  } catch (error) {
    log('Error initializing Stripe. Using mock implementation.', error);
    return stripeMock;
  }
}

// Define subscription plan types
type BasePlan = {
  name: string;
  description: string;
  monthlyPrice: number;
  features: string[];
  maxTrips: number;
  isActive: boolean;
};

type FreePlan = BasePlan & {
  stripePriceId: string;
};

type PaidPlan = BasePlan & {
  interval: string;
};

// Define subscription plans
const plans: (FreePlan | PaidPlan)[] = [
  {
    name: 'Free',
    description: 'Basic travel planning features',
    monthlyPrice: 0,
    features: ['Up to 3 trips', 'Basic trip planning', 'Standard recommendations'],
    maxTrips: 3,
    stripePriceId: 'free_tier', // No real Stripe price ID for free plan
    isActive: true
  },
  {
    name: 'Premium',
    description: 'Enhanced travel planning with advanced features',
    monthlyPrice: 999, // $9.99 in cents
    features: ['Unlimited trips', 'Advanced AI recommendations', 'PDF exports', 'Premium support'],
    maxTrips: -1, // Unlimited
    interval: 'month',
    isActive: true
  },
  {
    name: 'Business',
    description: 'Complete travel planning solution for businesses',
    monthlyPrice: 1999, // $19.99 in cents
    features: ['Unlimited trips', 'Advanced AI recommendations', 'PDF exports', 'Premium support', 'Team collaboration', 'Expense tracking'],
    maxTrips: -1, // Unlimited
    interval: 'month',
    isActive: true
  },
];

/**
 * Create a Stripe price for a subscription plan
 */
async function createStripePrice(planName: string, priceInDollars: number, interval: string): Promise<string> {
  if (!stripeApiKey) {
    log('Stripe API key not configured. Using mock price ID.');
    return `price_mock_${planName.toLowerCase().replace(' ', '_')}`;
  }

  try {
    // Get Stripe instance or mock
    const stripe = getStripe();
    
    // First create a product
    const product = await stripe.products.create({
      name: `Juno ${planName} Plan`,
      description: `Juno Travel ${planName} Subscription`,
    });

    // Then create a price for the product
    const stripePrice = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(priceInDollars * 100), // Convert to cents
      currency: 'usd',
      recurring: {
        interval: interval as 'month' | 'year',
      },
    });

    return stripePrice.id;
  } catch (error) {
    console.error(`Error creating Stripe price for ${planName}:`, error);
    throw error;
  }
}

/**
 * Initialize subscription plans in the database
 */
export async function initSubscriptionPlans(): Promise<void> {
  // Check if plans already exist
  const existingPlans = await db.select().from(subscriptionPlans);
  
  if (existingPlans.length > 0) {
    log('Subscription plans already exist in the database.');
    return;
  }

  log('Initializing subscription plans...');

  // Create plans in the database
  for (const plan of plans) {
    try {
      // Initialize stripe price ID
      let stripePriceId = '';
      
      // For free plan, use the predefined stripe price ID
      if ('stripePriceId' in plan) {
        stripePriceId = plan.stripePriceId;
      } 
      // For paid plans, create a Stripe price
      else if (plan.monthlyPrice > 0 && 'interval' in plan) {
        stripePriceId = await createStripePrice(plan.name, plan.monthlyPrice / 100, plan.interval);
      }

      // Insert the plan in the database
      await db.insert(subscriptionPlans).values({
        name: plan.name,
        description: plan.description,
        stripePriceId,
        monthlyPrice: plan.monthlyPrice,
        features: plan.features,
        maxTrips: plan.maxTrips,
        isActive: plan.isActive
      });

      log(`Created subscription plan: ${plan.name}`);
    } catch (error) {
      console.error(`Error creating subscription plan ${plan.name}:`, error);
    }
  }

  log('Subscription plans initialization complete.');
}

// In ES modules, we don't have the concept of `require.main`, so we'll just export the function
// This will be called from server/index.ts