import { ReactNode } from "react";
import Nav from "@/components/Nav";

interface LayoutProps {
  children: ReactNode;
  className?: string;
}

export function Layout({ children, className = "" }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className={`max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
        {children}
      </div>
    </div>
  );
}

export function ContentContainer({ children, className = "" }: LayoutProps) {
  return (
    <div className={`max-w-6xl mx-auto ${className}`}>
      {children}
    </div>
  );
}