import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";

// Define specific schemas for login and registration
const loginSchema = insertUserSchema.pick({ 
  username: true, 
  password: true 
});

const registerSchema = insertUserSchema;

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-[1200px] grid md:grid-cols-2 gap-4">
        <div className="flex flex-col justify-center">
          <div className="mb-8 flex justify-center">
            <img src="/a340adbb-a64e-42f7-aa3a-6ce1afa0c057.png" alt="Juno" className="h-48 w-auto" />
          </div>
          <div className="md:hidden">
            <h1 className="text-4xl font-bold mb-4 text-center">AI Travel Planner</h1>
            <p className="text-muted-foreground mb-8 text-center">
              Plan your perfect trip with AI-powered suggestions, manage your
              itinerary, and track your budget - all in one place.
            </p>
          </div>
          <Card className="p-4">
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form
                  onSubmit={loginForm.handleSubmit((data) =>
                    loginMutation.mutate(data)
                  )}
                  className="space-y-4"
                >
                  <div>
                    <Label htmlFor="login-username">Username</Label>
                    <Input
                      id="login-username"
                      {...loginForm.register("username")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      {...loginForm.register("password")}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full text-white"
                    disabled={loginMutation.isPending}
                  >
                    Login
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form
                  onSubmit={registerForm.handleSubmit((data) =>
                    registerMutation.mutate(data)
                  )}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="register-firstName">First Name</Label>
                      <Input
                        id="register-firstName"
                        {...registerForm.register("firstName")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="register-lastName">Last Name</Label>
                      <Input
                        id="register-lastName"
                        {...registerForm.register("lastName")}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      {...registerForm.register("email")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="register-username">Username</Label>
                    <Input
                      id="register-username"
                      {...registerForm.register("username")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      {...registerForm.register("password")}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending}
                  >
                    Register
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        <div className="flex flex-col justify-center md:mt-0 mt-8">
          <div className="hidden md:block mb-8">
            <h1 className="text-4xl font-bold mb-4">AI Travel Planner</h1>
            <p className="text-muted-foreground">
              Plan your perfect trip with AI-powered suggestions, manage your
              itinerary, and track your budget - all in one place.
            </p>
          </div>
          <div className="relative h-[300px] rounded-lg overflow-hidden hidden md:block">
            <img
              src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1"
              alt="Travel"
              className="object-cover w-full h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}