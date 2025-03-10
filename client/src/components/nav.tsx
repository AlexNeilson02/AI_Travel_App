
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { MobileNav } from "./mobile-nav";

const routes = [
  { path: "/", label: "Home" },
  { path: "/plan", label: "Plan Trip" },
  { path: "/itinerary", label: "Itinerary" },
  { path: "/destinations", label: "Destinations" },
];

export function Nav() {
  const location = useLocation();
  
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="flex items-center mr-4">
            <span className="inline-block font-bold text-xl">
              AI Travel
            </span>
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {routes.map((route) => {
            const isActive = location.pathname === route.path;
            return (
              <Link
                key={route.path}
                to={route.path}
                className={`transition-colors ${
                  isActive ? "text-primary font-medium" : "text-muted-foreground hover:text-primary"
                }`}
              >
                {route.label}
              </Link>
            );
          })}
        </nav>
        
        <div className="hidden md:flex items-center justify-end">
          <Link to="/auth">
            <Button variant="outline">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
