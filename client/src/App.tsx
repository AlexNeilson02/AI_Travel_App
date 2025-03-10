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

// Placeholder for BottomNav component - needs actual implementation
const BottomNav = ({ routes }) => {
  return (
    <nav className="bg-gray-800 p-4 fixed bottom-0 w-full">
      <ul className="flex space-x-4 justify-center">
        {routes.map((route) => (
          <li key={route.path}>
            <a href={route.path}>{route.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

// Placeholder for Nav component - needs actual implementation
const Nav = () => {
  return (
    <nav className="bg-gray-800 p-4">
      {/* Navigation items here */}
    </nav>
  );
};


// Define app routes
const routes = [
  { path: "/", label: "Home" },
  { path: "/plan", label: "Plan Trip" },
  { path: "/my-trips", label: "My Trips" }, //Using existing paths
  { path: "/trip/:id", label: "Trip Details" }, //Using existing paths
];

function Router() {
  return (
    <div className="min-h-screen bg-background font-sans antialiased pb-16 md:pb-0">
      <Switch>
        <ProtectedRoute path="/" component={HomePage} />
        <ProtectedRoute path="/plan" component={PlanTrip} />
        <ProtectedRoute path="/my-trips" component={MyTrips} />
        <ProtectedRoute path="/trip/:id" component={TripDetails} />
        <Route path="/auth" component={AuthPage} />
        <Route component={NotFound} />
      </Switch>
      
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="flex flex-col min-h-screen">
          <Nav />
          <main className="flex-1 pb-16 md:pb-0">
            <Router/>
          </main>
          <BottomNav routes={routes} />
        </div>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;