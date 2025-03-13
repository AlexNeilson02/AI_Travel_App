
import { Routes, Route } from "react-router-dom";
import { Nav } from "./components/nav";
import { useIsMobile } from "./hooks/use-mobile";

export default function App() {
  const isMobile = useIsMobile();
  
  return (
    <div className={`min-h-screen bg-background ${isMobile ? 'pb-16' : ''}`}>
      <Nav />
      <main>
        <Routes>
          {/* Your routes here */}
          <Route path="/" element={<div className="p-4">Home Page</div>} />
          <Route path="/plan" element={<div className="p-4">Plan Trip Page</div>} />
          <Route path="/itinerary" element={<div className="p-4">Itinerary Page</div>} />
          <Route path="/destinations" element={<div className="p-4">Destinations Page</div>} />
        </Routes>
      </main>
    </div>
  );
}

import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import PlanTrip from "@/pages/plan-trip";
import MyTrips from "@/pages/my-trips";
import TripDetails from "@/pages/trip-details";
import MapsPage from "@/pages/maps-page";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/plan" component={PlanTrip} />
      <ProtectedRoute path="/my-trips" component={MyTrips} />
      <ProtectedRoute path="/trip/:id" component={TripDetails} />
      <ProtectedRoute path="/maps" component={MapsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
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