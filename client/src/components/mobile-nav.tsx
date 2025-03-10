import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";

interface MobileNavProps {
  routes: { path: string; label: string }[];
}

export function MobileNav({ routes }: MobileNavProps) {
  // We're using bottom nav instead, so this is a minimal component
  return (
    <div className="md:hidden flex items-center justify-end">
      <Link to="/auth" className="p-2">
        <span className="sr-only">Profile</span>
      </Link>
    </div>
  );
}