
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Map, List, Compass, User } from "lucide-react";

interface BottomNavProps {
  routes: { path: string; label: string }[];
}

export function BottomNav({ routes }: BottomNavProps) {
  const location = useLocation();
  
  // Map icons to routes
  const getIcon = (path: string) => {
    switch (path) {
      case "/":
        return <Home size={20} />;
      case "/plan":
        return <Map size={20} />;
      case "/itinerary":
        return <List size={20} />;
      case "/destinations":
        return <Compass size={20} />;
      case "/auth":
        return <User size={20} />;
      default:
        return <Home size={20} />;
    }
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50">
      <div className="flex justify-around items-center h-16">
        {routes.map((route) => {
          const isActive = location.pathname === route.path;
          return (
            <Link
              key={route.path}
              to={route.path}
              className={`flex flex-col items-center justify-center flex-1 py-1 ${
                isActive ? "text-primary font-medium" : "text-muted-foreground"
              }`}
            >
              {getIcon(route.path)}
              <span className="text-xs mt-1">{route.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
