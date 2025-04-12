import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  monthlyPrice: number;
  features: string[];
  maxTrips: number;
  isActive: boolean;
}

interface UserSubscription {
  id: number;
  planId: number;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Fetch subscription plans and user subscription
  useEffect(() => {
    const fetchData = async () => {
      try {
        const plansRes = await apiRequest<SubscriptionPlan[]>('/api/subscriptions/plans');
        setPlans(plansRes);

        if (user) {
          try {
            const subRes = await apiRequest<UserSubscription>('/api/subscriptions/my-subscription');
            setUserSubscription(subRes);
          } catch (error) {
            // User might not have a subscription yet, which is fine
            console.log('No active subscription found');
          }
        }
      } catch (error) {
        console.error('Error fetching subscription data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load subscription information',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, toast]);

  // Start subscription checkout process
  const handleSubscribe = async (planId: number) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to subscribe to a plan',
        variant: 'destructive',
      });
      return;
    }

    setSubscribing(true);
    try {
      // Get checkout URL from server
      const response = await apiRequest('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      }) as { url: string };

      // Redirect to Stripe checkout
      if (response?.url) {
        window.location.href = response.url;
      }
    } catch (error) {
      console.error('Error starting checkout:', error);
      toast({
        title: 'Checkout Failed',
        description: 'Could not initiate the subscription process',
        variant: 'destructive',
      });
    } finally {
      setSubscribing(false);
    }
  };

  // Cancel subscription
  const handleCancel = async () => {
    if (!user || !userSubscription) {
      return;
    }

    setCancelling(true);
    try {
      await apiRequest('/api/subscriptions/cancel', {
        method: 'POST',
      });

      // Refresh subscription data
      const subRes = await apiRequest<UserSubscription>('/api/subscriptions/my-subscription');
      setUserSubscription(subRes);

      toast({
        title: 'Subscription Cancelled',
        description: 'Your subscription will end at the current billing period',
      });
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel subscription',
        variant: 'destructive',
      });
    } finally {
      setCancelling(false);
    }
  };

  // Format currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(price / 100);
  };

  // Check if user is subscribed to a plan
  const isSubscribedTo = (planName: string) => {
    if (!userSubscription) return false;
    
    const userPlan = plans.find(p => p.id === userSubscription.planId);
    return userPlan?.name.toLowerCase() === planName.toLowerCase();
  };

  // Get subscription end date in readable format
  const getSubscriptionEndDate = () => {
    if (!userSubscription?.currentPeriodEnd) return '';
    
    return new Date(userSubscription.currentPeriodEnd).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Check if subscription is active
  const hasActiveSubscription = () => {
    return userSubscription && userSubscription.status === 'active';
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10 text-center">
        <p>Loading subscription information...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Subscription Plans</h1>
        <p className="text-muted-foreground">
          Choose the plan that works best for your travel planning needs
        </p>

        {hasActiveSubscription() && (
          <div className="bg-primary/10 p-4 rounded-md mb-6">
            <h3 className="font-semibold">Current Subscription</h3>
            <p>
              You are currently subscribed to the{' '}
              <span className="font-bold">
                {plans.find(p => p.id === userSubscription?.planId)?.name || 'Unknown'}
              </span>{' '}
              plan.
            </p>
            {userSubscription?.cancelAtPeriodEnd ? (
              <p className="text-yellow-600 mt-2">
                Your subscription is set to cancel on {getSubscriptionEndDate()}.
              </p>
            ) : (
              <p className="mt-2">
                Next billing date: {getSubscriptionEndDate()}
              </p>
            )}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className={isSubscribedTo(plan.name) ? 'border-primary' : ''}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription className="mt-1">{plan.description}</CardDescription>
                  </div>
                  {isSubscribedTo(plan.name) && (
                    <Badge variant="default">Current Plan</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold">
                  {plan.monthlyPrice === 0 ? (
                    'Free'
                  ) : (
                    <>
                      {formatPrice(plan.monthlyPrice)}
                      <span className="text-sm font-normal text-muted-foreground"> /month</span>
                    </>
                  )}
                </div>
                
                <Separator />
                
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <Check className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {isSubscribedTo(plan.name) ? (
                  userSubscription?.cancelAtPeriodEnd ? (
                    <Button variant="outline" className="w-full" disabled>
                      Cancellation Scheduled
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={handleCancel}
                      disabled={cancelling}
                    >
                      {cancelling ? 'Processing...' : 'Cancel Subscription'}
                    </Button>
                  )
                ) : (
                  <Button 
                    variant={plan.name.toLowerCase() === 'free' ? 'outline' : 'default'} 
                    className="w-full"
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={subscribing || 
                      (hasActiveSubscription() && userSubscription?.cancelAtPeriodEnd === false)}
                  >
                    {subscribing ? 'Processing...' : 'Subscribe'}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}