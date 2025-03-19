import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Home, Map, Calendar, Globe } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Nav() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const isMobile = useIsMobile();

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/plan", label: "Plan Trip", icon: Map },
    { href: "/my-trips", label: "My Trips", icon: Calendar },
    { href: "/maps", label: "Maps", icon: Globe },
  ];

  if (isMobile) {
    return (
      <>
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center justify-between">
            <div className="w-14"></div>
            <div className="flex items-center space-x-2">
              <span className="font-bold">Juno: AI Travel Planner</span>
            </div>
            {user && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="w-14"
              >
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Logout</span>
              </Button>
            )}
          </div>
        </header>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
          <div className="grid grid-cols-4 h-16">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-1"
              >
                <item.icon className={`h-5 w-5 ${location === item.href ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-xs ${location === item.href ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </nav>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <img src="/a340adbb-a64e-42f7-aa3a-6ce1afa0c057.png" alt="Juno" className="h-8 w-auto" />
        </Link>
        <div className="ml-4">
        <div className="flex">
          {navItems.map((item) => (
            <Button
              key={item.href}
              variant={location === item.href ? "secondary" : "ghost"}
              asChild
              className="ml-2"
            >
              <Link href={item.href}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          ))}
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          {user && (
            <div className="flex items-center">
              <span className="text-sm mr-2 text-muted-foreground">
                {user.username}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Logout</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}