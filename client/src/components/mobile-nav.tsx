
import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";

interface MobileNavProps {
  routes: { path: string; label: string }[];
}

export function MobileNav({ routes }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden flex-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-sidebar-foreground bg-sidebar-accent/10 rounded-md flex items-center justify-center"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
        <span className="ml-2">Menu</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start pt-16">
          <div className="bg-sidebar p-4 rounded-lg shadow-lg w-11/12 max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-sidebar-foreground">Navigation</h2>
              <button onClick={() => setIsOpen(false)} className="text-sidebar-foreground">
                <X size={24} />
              </button>
            </div>
            <nav className="flex flex-col space-y-2">
              {routes.map((route) => (
                <Link
                  key={route.path}
                  to={route.path}
                  className="text-sidebar-foreground hover:text-sidebar-primary py-3 px-4 rounded-md hover:bg-sidebar-accent/20 text-lg font-medium text-center"
                  onClick={() => setIsOpen(false)}
                >
                  {route.label}
                </Link>
              ))}
              <Link 
                to="/auth" 
                className="mt-2 w-full py-3 bg-primary text-primary-foreground rounded-md text-center font-medium"
                onClick={() => setIsOpen(false)}
              >
                Sign In
              </Link>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
