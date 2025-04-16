import { useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { Layout, ContentContainer } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, User, Home } from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';

export default function SubscriptionSuccessPage() {
  const [, navigate] = useLocation();
  const { refreshSubscription, activeSubscription, activePlan } = useSubscription();
  
  // Refresh subscription data when the page loads
  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);
  
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