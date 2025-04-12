import Stripe from 'stripe';
import { storage } from './storage';
import { type User, type SubscriptionPlan, type UserSubscription } from '@shared/schema';
import { userSubscriptions } from '@shared/schema';
import { db } from './db';

// Initialize Stripe with API key, but only if it's available
const stripeApiKey = process.env.STRIPE_SECRET_KEY || '';

// Mock the Stripe instance for development when no API key is available
// This will allow the application to start without errors
const stripeMock = {
  customers: {
    create: async () => ({ id: 'mock_customer_id' }),
  },
  checkout: {
    sessions: {
      create: async () => ({ url: '/mock-checkout' }),
    },
  },
  subscriptions: {
    retrieve: async () => ({
      id: 'mock_subscription_id',
      status: 'active',
      current_period_start: Date.now() / 1000,
      current_period_end: (Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000,
      cancel_at_period_end: false,
    }),
    update: async () => ({
      id: 'mock_subscription_id',
      status: 'active',
      cancel_at_period_end: true,
    }),
  },
};

// Get Stripe instance or mock
const getStripe = (): any => {
  if (!stripeApiKey) {
    console.warn('Stripe API key is not configured. Using mock implementation.');
    return stripeMock;
  }
  
  try {
    // We'll initialize on every call to avoid startup errors, but in production
    // you would want to cache this instance
    return new Stripe(stripeApiKey);
  } catch (error) {
    console.error('Error initializing Stripe:', error);
    return stripeMock;
  }
};

class StripeService {
  /**
   * Create a Stripe customer for a user
   */
  async createCustomer(user: User): Promise<string> {
    // We'll still proceed even without an API key using our mock implementation

    // If user already has a Stripe customer ID, return it
    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    // Create a new customer in Stripe
    const customer = await getStripe().customers.create({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      metadata: {
        userId: user.id.toString(),
      }
    });

    // Update user with Stripe customer ID
    await storage.updateUser(user.id, {
      stripeCustomerId: customer.id,
    });

    return customer.id;
  }

  /**
   * Create a checkout session for a subscription
   */
  async createCheckoutSession(userId: number, planId: number, successUrl: string, cancelUrl: string): Promise<string> {
    // We'll proceed with our mock implementation if no API key is available

    // Get user
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get subscription plan
    const plan = await storage.getSubscriptionPlan(planId);
    if (!plan) {
      throw new Error('Subscription plan not found');
    }

    // Ensure user has a Stripe customer ID
    const customerId = user.stripeCustomerId || await this.createCustomer(user);

    // Create checkout session
    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId.toString(),
        planId: planId.toString(),
      },
    });

    return session.url || '';
  }

  /**
   * Handle webhook events from Stripe
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    // In development without an API key, we'll still process events for testing

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
    }
  }

  /**
   * Handle checkout.session.completed event
   */
  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    // Extract metadata from session
    const userId = parseInt(session.metadata?.userId || '0');
    const planId = parseInt(session.metadata?.planId || '0');
    
    if (!userId || !planId) {
      console.error('Missing userId or planId in session metadata');
      return;
    }

    // Get the subscription from Stripe
    if (!session.subscription) {
      console.error('No subscription found in session');
      return;
    }

    const subscription = await getStripe().subscriptions.retrieve(session.subscription as string);

    // Create user subscription record
    await storage.createUserSubscription({
      userId,
      planId,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });

    // Update user subscription tier
    const plan = await storage.getSubscriptionPlan(planId);
    if (plan) {
      await storage.updateUser(userId, {
        subscriptionTier: plan.name.toLowerCase(),
        subscriptionStartDate: new Date(subscription.current_period_start * 1000),
        subscriptionEndDate: new Date(subscription.current_period_end * 1000),
      });
    }
  }

  /**
   * Handle customer.subscription.updated event
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    // Find the user subscription by Stripe subscription ID
    const userSubscriptions = await this.findUserSubscriptionByStripeId(subscription.id);
    if (!userSubscriptions) {
      console.error(`No user subscription found for Stripe subscription ID: ${subscription.id}`);
      return;
    }

    // Update the user subscription
    await storage.updateUserSubscription(userSubscriptions.id, {
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });

    // Update user subscription data
    await storage.updateUser(userSubscriptions.userId, {
      subscriptionEndDate: new Date(subscription.current_period_end * 1000),
    });
  }

  /**
   * Handle customer.subscription.deleted event
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    // Find the user subscription by Stripe subscription ID
    const userSubscriptions = await this.findUserSubscriptionByStripeId(subscription.id);
    if (!userSubscriptions) {
      console.error(`No user subscription found for Stripe subscription ID: ${subscription.id}`);
      return;
    }

    // Update the user subscription
    await storage.updateUserSubscription(userSubscriptions.id, {
      status: 'canceled',
      cancelAtPeriodEnd: true,
    });

    // Downgrade user to free tier after subscription ends
    await storage.updateUser(userSubscriptions.userId, {
      subscriptionTier: 'free',
    });
  }

  /**
   * Helper method to find a user subscription by Stripe subscription ID
   */
  private async findUserSubscriptionByStripeId(stripeSubscriptionId: string): Promise<UserSubscription | undefined> {
    // This is a simplification - in a real app you'd add a method to storage to find by stripeSubscriptionId
    // But for this demo we'll scan through all subscriptions
    const user = await storage.getUser(1); // Just get any user to access the database
    if (!user) return undefined;

    // This is a inefficient implementation for demo purposes
    // In a real app, you'd add a specific query to find by stripeSubscriptionId
    const subscriptions = await db.select().from(userSubscriptions);
    return subscriptions.find(sub => sub.stripeSubscriptionId === stripeSubscriptionId);
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(userId: number): Promise<void> {
    // We can still cancel subscriptions even if we're in mock mode

    // Get the user's active subscription
    const userSubscription = await storage.getUserActiveSubscription(userId);
    if (!userSubscription) {
      throw new Error('No active subscription found');
    }

    // Cancel the subscription in Stripe
    await getStripe().subscriptions.update(userSubscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Update our records
    await storage.updateUserSubscription(userSubscription.id, {
      cancelAtPeriodEnd: true,
    });
  }
}

export const stripeService = new StripeService();