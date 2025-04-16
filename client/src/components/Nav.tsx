import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Home, Map, Calendar, Globe, LogIn, CreditCard, User } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Nav() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const isMobile = useIsMobile();

  // Define nav items based on authentication status
  const commonNavItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/plan", label: "Plan Trip", icon: Map },
  ];
  
  const authenticatedNavItems = [
    { href: "/my-trips", label: "My Trips", icon: Calendar },
    { href: "/maps", label: "Maps", icon: Globe },
  ];
  
  const navItems = user 
    ? [...commonNavItems, ...authenticatedNavItems]
    : commonNavItems;

  if (isMobile) {
    return (
      <>
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center justify-between">
            {user ? (
              <Link href="/profile" className="flex w-10">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || ''} />
                  <AvatarFallback>{user.firstName?.charAt(0) || ''}{user.lastName?.charAt(0) || ''}</AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <div className="w-10"></div>
            )}
            <div className="flex items-center space-x-2">
              <span className="font-bold">Juno: AI Travel Planner</span>
            </div>
            {user ? (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="w-10"
              >
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Logout</span>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="w-10"
              >
                <Link href="/auth">
                  <LogIn className="h-5 w-5" />
                  <span className="sr-only">Login</span>
                </Link>
              </Button>
            )}
          </div>
        </header>

        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
          <div className={`grid ${navItems.length > 4 ? 'grid-cols-5' : 'grid-cols-4'} h-16`}>
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
      </>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <img src="/j2.webp" alt="Juno" className="h-8 w-auto" />
        </Link>
        <div className="flex flex-1 items-center">
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
            {user ? (
              <div className="flex items-center space-x-4">
                <Link href="/profile" className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || ''} />
                    <AvatarFallback>{user.firstName?.charAt(0) || ''}{user.lastName?.charAt(0) || ''}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {user.firstName} {user.lastName}
                  </span>
                </Link>
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
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="outline" asChild>
                  <Link href="/auth">
                    <LogIn className="mr-2 h-4 w-4" />
                    Login / Register
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}