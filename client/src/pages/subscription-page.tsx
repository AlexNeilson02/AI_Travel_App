import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation, Link } from 'wouter';
import { useSubscription, SubscriptionPlan, UserSubscription } from '@/hooks/use-subscription';
import { Layout, ContentContainer } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, CreditCard, Calendar, Shield, ChevronLeft, User } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    isLoading: subscriptionLoading, 
    activeSubscription, 
    activePlan,
    refreshSubscription 
  } = useSubscription();
  const [location, navigate] = useLocation();
  
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscribing, setSubscribing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  
  // Fetch all subscription plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const plansRes = await apiRequest('GET', '/api/subscriptions/plans');
        if (!plansRes.ok) {
          throw new Error('Failed to fetch subscription plans');
        }
        const data = await plansRes.json() as SubscriptionPlan[];
        setPlans(data);
      } catch (error) {
        console.error('Error fetching subscription plans:', error);
        toast({
          title: 'Error',
          description: 'Failed to load subscription plans',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [toast]);

  // Open the checkout modal
  const openCheckoutModal = (plan: SubscriptionPlan) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to subscribe to a plan',
        variant: 'destructive',
      });
      return;
    }
    
    setSelectedPlan(plan);
    setCheckoutOpen(true);
  };
  
  // Demo activate subscription (without Stripe)
  const activateDemoSubscription = async (planId: number) => {
    try {
      const response = await apiRequest('POST', '/api/subscriptions/demo-activate', {
        planId: planId
      });
      
      if (!response.ok) {
        throw new Error('Failed to activate subscription');
      }
      
      // Refresh subscription data
      await refreshSubscription();
      
      toast({
        title: 'Subscription Activated',
        description: 'Your subscription has been activated successfully!',
      });
      
      // Close dialog
      setCheckoutOpen(false);
    } catch (error) {
      console.error('Error activating subscription:', error);
      toast({
        title: 'Activation Failed',
        description: 'Could not activate the subscription',
        variant: 'destructive',
      });
    }
  };

  // Process the actual subscription checkout
  const processCheckout = async () => {
    if (!selectedPlan || !user) return;
    
    setSubscribing(true);
    try {
      // USE DEMO MODE (for testing)
      const useDemoMode = true;
      
      if (useDemoMode) {
        await activateDemoSubscription(selectedPlan.id);
        setSubscribing(false);
        return;
      }
      
      // Regular Stripe checkout flow
      const response = await apiRequest('POST', '/api/subscriptions/checkout', { 
        planId: selectedPlan.id,
        successUrl: `${window.location.origin}/subscription-success?planId=${selectedPlan.id}`,
        cancelUrl: window.location.origin + '/subscription'
      });
      
      if (!response.ok) {
        throw new Error('Failed to initiate checkout');
      }
      
      const data = await response.json() as { url: string };
      
      // Redirect to Stripe checkout
      if (data?.url) {
        window.location.href = data.url;
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
      setCheckoutOpen(false);
    }
  };

  // Cancel subscription
  const handleCancel = async () => {
    if (!user || !activeSubscription) {
      return;
    }

    setCancelling(true);
    try {
      const response = await apiRequest('POST', '/api/subscriptions/cancel');
      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      // Refresh subscription data
      await refreshSubscription();

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
    if (!activeSubscription) return false;
    
    return activePlan?.name.toLowerCase() === planName.toLowerCase();
  };

  // Get subscription end date in readable format
  const getSubscriptionEndDate = () => {
    if (!activeSubscription?.currentPeriodEnd) return '';
    
    return new Date(activeSubscription.currentPeriodEnd).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Check if subscription is active
  const hasActiveSubscription = (): boolean => {
    return Boolean(activeSubscription && activeSubscription.status === 'active');
  };

  if (loading || subscriptionLoading) {
    return (
      <div className="container mx-auto py-10 text-center">
        <p>Loading subscription information...</p>
      </div>
    );
  }

  return (
    <Layout>
      <ContentContainer className="py-10">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Subscription Plans</h1>
        <div className="flex space-x-3">
          <Button variant="outline" asChild>
            <Link href="/profile">
              <User className="h-4 w-4 mr-2" />
              Back to Profile
            </Link>
          </Button>
        </div>
      </div>
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Choose the plan that works best for your travel planning needs
        </p>

        {hasActiveSubscription() && (
          <div className="bg-primary/10 p-4 rounded-md mb-6">
            <h3 className="font-semibold">Current Subscription</h3>
            <p>
              You are currently subscribed to the{' '}
              <span className="font-bold">
                {activePlan?.name || 'Unknown'}
              </span>{' '}
              plan.
            </p>
            {activeSubscription?.cancelAtPeriodEnd ? (
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
                  activeSubscription?.cancelAtPeriodEnd ? (
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
                    onClick={() => openCheckoutModal(plan)}
                    disabled={subscribing || 
                      (hasActiveSubscription() && 
                       activeSubscription ? 
                       activeSubscription.cancelAtPeriodEnd === false : 
                       false)}
                  >
                    {subscribing ? 'Processing...' : 'Subscribe'}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
      
      {/* Subscription Checkout Modal */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Subscription</DialogTitle>
            <DialogDescription>
              Review your subscription details before proceeding to payment.
            </DialogDescription>
          </DialogHeader>
          
          {selectedPlan && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">{selectedPlan.name} Plan</div>
                <div className="font-bold">
                  {selectedPlan.monthlyPrice === 0 
                    ? 'Free' 
                    : formatPrice(selectedPlan.monthlyPrice) + '/month'
                  }
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CreditCard className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">Secure Payment</h4>
                    <p className="text-sm text-muted-foreground">
                      Your payment information is processed securely by Stripe.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">Subscription Period</h4>
                    <p className="text-sm text-muted-foreground">
                      Monthly billing with automatic renewal. Cancel anytime.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">Features Included</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 mt-1">
                      {selectedPlan.features.slice(0, 3).map((feature, i) => (
                        <li key={i} className="flex items-center">
                          <Check className="h-3.5 w-3.5 text-primary mr-1.5" />
                          {feature}
                        </li>
                      ))}
                      {selectedPlan.features.length > 3 && (
                        <li className="italic">...and more</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
            <Button
              variant="outline"
              onClick={() => setCheckoutOpen(false)}
              disabled={subscribing}
            >
              Cancel
            </Button>
            <Button 
              onClick={processCheckout}
              disabled={subscribing}
              className="sm:w-32"
            >
              {subscribing ? 'Processing...' : 'Continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </ContentContainer>
    </Layout>
  );
}