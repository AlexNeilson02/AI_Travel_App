import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { useIsMobile } from "./hooks/use-mobile";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import PlanTrip from "@/pages/plan-trip";
import MyTrips from "@/pages/my-trips";
import TripDetails from "@/pages/trip-details";
import MapsPage from "@/pages/maps-page";

function Router() {
  const isMobile = useIsMobile();

  return (
    <div className={`min-h-screen bg-background ${isMobile ? 'pb-16' : ''}`}>
      <main>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/plan" component={PlanTrip} />
          <ProtectedRoute path="/my-trips" component={MyTrips} />
          <ProtectedRoute path="/trip/:id" component={TripDetails} />
          <ProtectedRoute path="/maps" component={MapsPage} />
          <Route path="/auth" component={AuthPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;