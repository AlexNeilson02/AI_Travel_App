
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { MobileNav } from "./mobile-nav";
import { useIsMobile } from "@/hooks/use-mobile";
import { Home, Map, Calendar, Globe } from "lucide-react";

const routes = [
  { path: "/", label: "Home", icon: Home },
  { path: "/plan", label: "Plan Trip", icon: Map },
  { path: "/itinerary", label: "Itinerary", icon: Calendar },
  { path: "/destinations", label: "Destinations", icon: Globe },
];

export function Nav() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <>
        <header className="w-full border-b bg-sidebar">
          <div className="container flex h-16 items-center justify-center">
            <div className="flex gap-6">
              <Link to="/" className="flex items-center space-x-2">
                <span className="inline-block font-bold text-xl text-sidebar-foreground">
                  AI Travel
                </span>
              </Link>
            </div>
          </div>
        </header>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-sidebar border-t flex justify-around items-center h-16">
          {routes.map((route) => (
            <Link
              key={route.path}
              to={route.path}
              className="flex flex-col items-center justify-center text-sidebar-foreground hover:text-sidebar-primary p-2"
            >
              <route.icon size={20} />
              <span className="text-xs mt-1">{route.label}</span>
            </Link>
          ))}
        </nav>
      </>
    );
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-sidebar">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex gap-6 md:gap-10">
          <Link to="/" className="flex items-center space-x-2">
            <span className="inline-block font-bold text-xl text-sidebar-foreground">
              AI Travel
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {routes.map((route) => (
              <Link
                key={route.path}
                to={route.path}
                className="transition-colors hover:text-sidebar-primary text-sidebar-foreground"
              >
                {route.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            <Link to="/auth">
              <Button variant="outline" className="hidden md:inline-flex">
                Sign In
              </Button>
              <Button variant="outline" className="md:hidden w-10 px-0">
                <span className="sr-only">Sign In</span>
                <span>In</span>
              </Button>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
