import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { Layout, ContentContainer } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, User, Home, Loader2 } from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

export default function SubscriptionSuccessPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { refreshSubscription, activeSubscription, activePlan } = useSubscription();
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);
  
  // Extract planId from URL query parameters
  const getSelectedPlanId = (): number | null => {
    const params = new URLSearchParams(window.location.search);
    const planId = params.get('planId');
    return planId ? parseInt(planId, 10) : null;
  };
  
  // Activate subscription directly since we can't rely on webhooks in development
  useEffect(() => {
    const activateSubscription = async () => {
      if (!user || activated || activating) return;
      
      const planId = getSelectedPlanId();
      if (!planId) {
        // Try to use Premium (2) as default if no plan ID is provided
        console.log('No plan ID found in URL, using premium as default');
      }
      
      setActivating(true);
      try {
        const response = await apiRequest('POST', '/api/subscriptions/demo-activate', {
          planId: planId || 2 // Default to Premium (plan ID 2) if no plan ID is provided
        });
        
        if (!response.ok) {
          throw new Error('Failed to activate subscription');
        }
        
        await refreshSubscription();
        setActivated(true);
        toast({
          title: 'Subscription Activated',
          description: 'Your subscription has been activated successfully!',
        });
      } catch (error) {
        console.error('Error activating subscription:', error);
        toast({
          title: 'Activation Failed',
          description: 'There was a problem activating your subscription.',
          variant: 'destructive',
        });
      } finally {
        setActivating(false);
      }
    };
    
    activateSubscription();
  }, [user, refreshSubscription, toast, activated, activating]);
  
  return (
    <Layout>
      <ContentContainer className="py-20 flex justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Check className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Subscription Successful!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {activating ? (
            <div className="py-4 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p>Activating your subscription...</p>
              <p className="text-sm text-muted-foreground mt-2">
                This will only take a moment.
              </p>
            </div>
          ) : (
            <>
              <p>
                Thank you for subscribing to the{' '}
                <span className="font-bold">{activePlan?.name || 'Premium'}</span> plan.
              </p>
              <p className="text-muted-foreground">
                Your subscription is now active, and you can start enjoying all the benefits of your plan.
              </p>
              
              {activePlan && (
                <div className="mt-6 bg-primary/5 p-4 rounded-md">
                  <h3 className="font-medium mb-2">Your plan includes:</h3>
                  <ul className="space-y-2">
                    {activePlan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <Check className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-center gap-4 flex-wrap">
          <Button asChild variant="outline">
            <Link href="/profile">
              <User className="h-4 w-4 mr-2" />
              View Profile
            </Link>
          </Button>
          <Button asChild>
            <Link href="/my-trips">
              <Check className="h-4 w-4 mr-2" />
              Plan Your Trip
            </Link>
          </Button>
        </CardFooter>
      </Card>
      </ContentContainer>
    </Layout>
  );
}