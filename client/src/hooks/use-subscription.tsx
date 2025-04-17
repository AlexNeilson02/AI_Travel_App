import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useAuth } from './use-auth';
import { apiRequest } from '@/lib/queryClient';

// Define the shape of our subscription context
interface SubscriptionContextType {
  isLoading: boolean;
  activeSubscription: UserSubscription | null;
  activePlan: SubscriptionPlan | null;
  // Feature checks
  canCreateTrips: boolean;
  maxTrips: number;
  hasUnlimitedTrips: boolean;
  hasPdfExport: boolean;
  hasAdvancedAi: boolean;
  hasMapsFeature: boolean;
  hasAdjustableCalendar: boolean;
  hasAiChatbot: boolean;
  // Gets the subscription status for UI display
  getSubscriptionStatus: () => 'free' | 'premium' | 'none';
  // Force refresh the subscription data
  refreshSubscription: () => Promise<void>;
}

// Define the shape of our subscription data
export interface UserSubscription {
  id: number;
  planId: number;
  userId: number;
  status: string;
  stripeSubscriptionId: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  stripePriceId: string;
  monthlyPrice: number;
  features: string[];
  maxTrips: number;
  isActive: boolean;
}

// Create context with a default value
const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubscription, setActiveSubscription] = useState<UserSubscription | null>(null);
  const [activePlan, setActivePlan] = useState<SubscriptionPlan | null>(null);
  const [allPlans, setAllPlans] = useState<SubscriptionPlan[]>([]);

  // Function to fetch subscription data
  const fetchSubscriptionData = async () => {
    setIsLoading(true);
    try {
      // Get all available plans first
      const plansRes = await apiRequest('GET', '/api/subscriptions/plans');
      if (!plansRes.ok) {
        throw new Error('Failed to fetch subscription plans');
      }
      const plans = await plansRes.json() as SubscriptionPlan[];
      setAllPlans(plans);

      // If user is logged in, try to fetch their subscription
      if (user) {
        try {
          const subscriptionRes = await apiRequest('GET', '/api/subscriptions/my-subscription');
          if (!subscriptionRes.ok) {
            throw new Error('Failed to fetch user subscription');
          }
          
          const subData = await subscriptionRes.json();
          console.log("Subscription data:", subData);
          
          // Check if we have a valid subscription
          if (subData?.subscription) {
            setActiveSubscription(subData.subscription);
            
            // Get the plan from the response or find it
            const userPlan = subData.plan || plans.find(p => p.id === subData.subscription.planId);
            setActivePlan(userPlan || null);
          } else {
            // No active subscription
            const freePlan = plans.find(p => p.name.toLowerCase() === 'free');
            setActivePlan(freePlan || null);
            setActiveSubscription(null);
          }
        } catch (error) {
          // User might not have a subscription - find the free plan instead
          const freePlan = plans.find(p => p.name.toLowerCase() === 'free');
          setActivePlan(freePlan || null);
          setActiveSubscription(null);
        }
      } else {
        // Not logged in - no subscription
        setActiveSubscription(null);
        setActivePlan(null);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch subscription data when the user changes
  useEffect(() => {
    fetchSubscriptionData();
  }, [user]);

  // Helper function to get subscription status
  const getSubscriptionStatus = (): 'free' | 'premium' | 'none' => {
    if (!activePlan) return 'none';
    
    // Check if we have an active subscription
    const isActive = activeSubscription?.status === 'active';
    if (!isActive && activePlan.name.toLowerCase() !== 'free') {
      return 'free'; // Default to free if subscription is not active
    }
    
    const planName = activePlan.name.toLowerCase();
    if (planName === 'free') return 'free';
    if (planName === 'premium') return 'premium';
    
    return 'none';
  };

  // Calculate feature availability based on the active plan
  const status = getSubscriptionStatus();
  
  // Everyone can create trips, but limits vary by tier
  const canCreateTrips = true;
  
  // Trip limits based on plan
  const maxTrips = activePlan?.maxTrips || 3; // Default to free plan limit if no plan
  const hasUnlimitedTrips = status !== 'free'; // Premium and above have unlimited trips
  
  // Premium features
  const hasPdfExport = status === 'premium';
  const hasAdvancedAi = false; // No longer available as Business tier is removed
  
  // New premium features
  const hasMapsFeature = status === 'premium';
  const hasAdjustableCalendar = status === 'premium';
  const hasAiChatbot = status === 'premium';

  // Provide the context value
  const contextValue: SubscriptionContextType = {
    isLoading,
    activeSubscription,
    activePlan,
    canCreateTrips,
    maxTrips,
    hasUnlimitedTrips,
    hasPdfExport,
    hasAdvancedAi,
    hasMapsFeature,
    hasAdjustableCalendar,
    hasAiChatbot,
    getSubscriptionStatus,
    refreshSubscription: fetchSubscriptionData,
  };

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
}

// Hook to use the subscription context
export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}