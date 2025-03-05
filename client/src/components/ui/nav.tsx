import { Link } from "wouter";
import { Button } from "./button";
import { useAuth } from "@/hooks/use-auth";

export function Nav() {
  const { user, logoutMutation } = useAuth();

  return (
    <nav className="bg-white border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/">
              <Button variant="link" className="text-xl font-bold">
                Travel Planner
              </Button>
            </Link>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link href="/">
                <Button variant="ghost">Home</Button>
              </Link>
              <Link href="/plan">
                <Button variant="ghost">Plan Trip</Button>
              </Link>
              <Link href="/my-trips">
                <Button variant="ghost">My Trips</Button>
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            <span className="mr-4">Welcome, {user?.username}</span>
            <Button
              onClick={() => logoutMutation.mutate()}
              variant="outline"
              disabled={logoutMutation.isPending}
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
