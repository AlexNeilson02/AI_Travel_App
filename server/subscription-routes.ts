import { Router, Request, Response } from 'express';
import { storage } from './storage';
import { stripeService } from './stripe';
import { z } from 'zod';
import { APP_NAME } from '@shared/schema';

const router = Router();

// Schema for checkout session request
const checkoutSessionSchema = z.object({
  planId: z.number(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

// Schema for creating a subscription plan
const createPlanSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  stripePriceId: z.string().min(1),
  monthlyPrice: z.number().positive(),
  features: z.array(z.string()),
  maxTrips: z.number().int().positive(),
  isActive: z.boolean().default(true),
});

// Get all subscription plans
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const plans = await storage.getSubscriptionPlans();
    return res.status(200).json(plans);
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return res.status(500).json({ error: 'Failed to fetch subscription plans' });
  }
});

// Get subscription plan by ID
router.get('/plans/:id', async (req: Request, res: Response) => {
  try {
    const planId = parseInt(req.params.id);
    if (isNaN(planId)) {
      return res.status(400).json({ error: 'Invalid plan ID' });
    }

    const plan = await storage.getSubscriptionPlan(planId);
    if (!plan) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }

    return res.status(200).json(plan);
  } catch (error) {
    console.error('Error fetching subscription plan:', error);
    return res.status(500).json({ error: 'Failed to fetch subscription plan' });
  }
});

// Create subscription plan (admin only)
router.post('/plans', async (req: Request, res: Response) => {
  try {
    // For demo purposes, we'll allow any user to create a plan
    // In a real app, you would check if the user is an admin
    
    const parsedData = createPlanSchema.safeParse(req.body);
    if (!parsedData.success) {
      return res.status(400).json({ error: parsedData.error.message });
    }

    const plan = await storage.createSubscriptionPlan(parsedData.data);
    return res.status(201).json(plan);
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    return res.status(500).json({ error: 'Failed to create subscription plan' });
  }
});

// Create a checkout session
router.post('/checkout', async (req: Request, res: Response) => {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const parsedData = checkoutSessionSchema.safeParse(req.body);
    if (!parsedData.success) {
      return res.status(400).json({ error: parsedData.error.message });
    }

    const { planId, successUrl, cancelUrl } = parsedData.data;
    const userId = (req.user as any).id;

    // Get the specified plan
    const plan = await storage.getSubscriptionPlan(planId);
    if (!plan) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }

    // Create checkout session
    const checkoutUrl = await stripeService.createCheckoutSession(
      userId,
      planId,
      successUrl,
      cancelUrl
    );

    return res.status(200).json({ url: checkoutUrl });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Get user's current subscription
router.get('/my-subscription', async (req: Request, res: Response) => {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = (req.user as any).id;
    
    // Get user's active subscription
    const subscription = await storage.getUserActiveSubscription(userId);
    
    if (!subscription) {
      return res.status(200).json({ subscription: null, tier: 'free' });
    }

    // Get the plan details
    const plan = await storage.getSubscriptionPlan(subscription.planId);
    
    return res.status(200).json({
      subscription,
      plan,
      tier: subscription.status === 'active' ? plan?.name.toLowerCase() || 'free' : 'free'
    });
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    return res.status(500).json({ error: 'Failed to fetch subscription details' });
  }
});

// Cancel user's subscription
router.post('/cancel', async (req: Request, res: Response) => {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = (req.user as any).id;
    
    // Cancel the subscription
    await stripeService.cancelSubscription(userId);
    
    return res.status(200).json({ message: 'Subscription has been canceled' });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Stripe webhook handler
router.post('/webhook', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  
  try {
    // For demo purposes we're not verifying the signature
    // In a real app, you would verify using the webhook secret
    
    // Just use the raw event data
    const event = req.body;

    // Handle the event
    await stripeService.handleWebhookEvent(event);
    
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error handling webhook event:', error);
    return res.status(400).json({ error: 'Webhook error' });
  }
});

// Manually create subscription (demo mode only)
// This endpoint is used when the webhook isn't configured to simulate subscription creation
router.post('/demo-activate', async (req: Request, res: Response) => {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = (req.user as any).id;
    const { planId } = req.body;
    
    if (!planId) {
      return res.status(400).json({ error: 'Plan ID is required' });
    }
    
    // Get user
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get plan
    const plan = await storage.getSubscriptionPlan(planId);
    if (!plan) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }
    
    // Create mock subscription
    const mockSubscriptionId = `mock_sub_${Date.now()}`;
    const now = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // Add one month
    
    // Create user subscription
    await storage.createUserSubscription({
      userId,
      planId,
      stripeSubscriptionId: mockSubscriptionId,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: endDate,
      cancelAtPeriodEnd: false,
    });
    
    // Update user subscription tier
    await storage.updateUser(userId, {
      subscriptionTier: plan.name.toLowerCase(),
      subscriptionStartDate: now,
      subscriptionEndDate: endDate,
    });
    
    return res.status(200).json({ 
      success: true,
      message: 'Subscription activated successfully'
    });
  } catch (error) {
    console.error('Error activating subscription:', error);
    return res.status(500).json({ error: 'Failed to activate subscription' });
  }
});

export default router;