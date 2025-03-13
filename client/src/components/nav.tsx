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
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex gap-6 md:gap-10">
          <Link to="/" className="flex items-center space-x-2">
            <span className="inline-block font-bold text-xl text-sidebar-foreground">
              AI Travel
            </span>
          </Link>

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