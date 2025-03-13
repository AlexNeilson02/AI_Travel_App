
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Menu, X, Map, Calendar, User } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Nav() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const closeSheet = () => setOpen(false);

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/plan", label: "Plan a Trip" },
    { href: "/my-trips", label: "My Trips" },
    { href: "/maps", label: "Maps", icon: Map },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="mr-4 hidden md:flex">
          <span className="font-bold">AI Travel Planner</span>
        </Link>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="mr-2">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pr-0">
            <div className="px-7">
              <Link href="/" onClick={closeSheet}>
                <span className="font-bold">AI Travel Planner</span>
              </Link>
            </div>
            <div className="mt-4 flex flex-col space-y-3 px-2">
              {navItems.map((item) => (
                <Button
                  key={item.href}
                  variant={location === item.href ? "secondary" : "ghost"}
                  className="justify-start"
                  asChild
                  onClick={closeSheet}
                >
                  <Link href={item.href}>
                    {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                    {item.label}
                  </Link>
                </Button>
              ))}
              <Button variant="ghost" className="justify-start" onClick={() => { logout(); closeSheet(); }}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <div className="hidden md:flex">
          {navItems.map((item) => (
            <Button
              key={item.href}
              variant={location === item.href ? "secondary" : "ghost"}
              asChild
              className="ml-2"
            >
              <Link href={item.href}>
                {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                {item.label}
              </Link>
            </Button>
          ))}
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          {user && (
            <div className="flex items-center">
              <span className="hidden md:inline text-sm mr-2 text-muted-foreground">
                {user.name}
              </span>
              <Button variant="ghost" size="icon" onClick={logout}>
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
