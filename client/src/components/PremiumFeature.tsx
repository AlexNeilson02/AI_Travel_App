import { ReactNode } from 'react';
import { useSubscription } from '@/hooks/use-subscription';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, CreditCard } from 'lucide-react';
import { Link } from 'wouter';

interface PremiumFeatureProps {
  children: ReactNode;
  feature: 'maps' | 'unlimited-trips' | 'ai-chatbot' | 'adjustable-calendar';
  fallback?: ReactNode;
}

export function PremiumFeature({ children, feature, fallback }: PremiumFeatureProps) {
  const { hasMapsFeature, hasUnlimitedTrips, hasAiChatbot, hasAdjustableCalendar, getSubscriptionStatus } = useSubscription();
  
  // Check if user has access to this feature
  const hasAccess = () => {
    switch (feature) {
      case 'maps':
        return hasMapsFeature;
      case 'unlimited-trips':
        return hasUnlimitedTrips;
      case 'ai-chatbot':
        return hasAiChatbot;
      case 'adjustable-calendar':
        return hasAdjustableCalendar;
      default:
        return false;
    }
  };
  
  // If user has access, show the feature
  if (hasAccess()) {
    return <>{children}</>;
  }
  
  // If fallback is provided, show that instead
  if (fallback) {
    return <>{fallback}</>;
  }
  
  // Otherwise show the premium upgrade card
  return (
    <Card className="border-dashed border-primary/20">
      <CardHeader className="text-center">
        <div className="mx-auto bg-primary-foreground p-3 rounded-full w-12 h-12 flex items-center justify-center mb-2">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Premium Feature</CardTitle>
        <CardDescription>
          Upgrade to access {getFeatureName(feature)}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center text-sm">
        <p>
          This feature is available exclusively to Premium and Business tier subscribers.
        </p>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button asChild>
          <Link href="/subscription">
            <CreditCard className="h-4 w-4 mr-2" />
            Upgrade Now
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

// Helper function to get a human-readable name for the feature
function getFeatureName(feature: string): string {
  switch (feature) {
    case 'maps':
      return 'Interactive Maps';
    case 'unlimited-trips':
      return 'Unlimited Trips';
    case 'ai-chatbot':
      return 'AI Chatbot Planning';
    case 'adjustable-calendar':
      return 'Adjustable Calendar';
    default:
      return 'Premium Features';
  }
}