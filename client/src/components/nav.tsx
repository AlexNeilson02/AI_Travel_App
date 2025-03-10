
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { MobileNav } from "./mobile-nav";

const routes = [
  { path: "/", label: "Home" },
  { path: "/plan", label: "Plan Trip" },
  { path: "/itinerary", label: "Itinerary" },
  { path: "/destinations", label: "Destinations" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-sidebar">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="flex items-center mr-4">
            <span className="inline-block font-bold text-xl text-sidebar-foreground">
              AI Travel
            </span>
          </Link>
        </div>
        
        {/* Mobile Navigation */}
        <MobileNav routes={routes} />
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
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
