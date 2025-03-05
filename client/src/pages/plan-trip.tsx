import { Nav } from "@/components/ui/nav";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTripSchema } from "@shared/schema";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CalendarIcon, DollarSign } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function PlanTrip() {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<any>(null);

  const form = useForm({
    resolver: zodResolver(insertTripSchema),
    defaultValues: {
      title: "",
      destination: "",
      startDate: new Date(),
      endDate: new Date(),
      budget: 0,
      preferences: [],
      activities: [],
    },
  });

  const suggestMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/suggest-trip", data);
      return res.json();
    },
    onSuccess: (data) => {
      setSuggestions(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Error getting suggestions",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createTripMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/trips", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Trip created successfully!",
      });
      form.reset();
      setSuggestions(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating trip",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    suggestMutation.mutate({
      destination: data.destination,
      preferences: data.preferences,
      budget: data.budget,
      duration: Math.ceil(
        (data.endDate.getTime() - data.startDate.getTime()) / (1000 * 3600 * 24)
      ),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Plan Your Trip</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Trip Title
                        </label>
                        <Input {...form.register("title")} />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Destination
                        </label>
                        <Input {...form.register("destination")} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Start Date
                          </label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {form.watch("startDate")
                                  ? format(form.watch("startDate"), "PPP")
                                  : "Pick a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={form.watch("startDate")}
                                onSelect={(date) => form.setValue("startDate", date)}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            End Date
                          </label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {form.watch("endDate")
                                  ? format(form.watch("endDate"), "PPP")
                                  : "Pick a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={form.watch("endDate")}
                                onSelect={(date) => form.setValue("endDate", date)}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Budget
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                          <Input
                            type="number"
                            className="pl-10"
                            {...form.register("budget", { valueAsNumber: true })}
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={suggestMutation.isPending}
                    >
                      {suggestMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Get AI Suggestions"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          <div>
            {suggestMutation.isPending ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : suggestions ? (
              <Card>
                <CardHeader>
                  <CardTitle>AI Suggestions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {suggestions.days.map((day: any, index: number) => (
                      <div key={index}>
                        <h3 className="font-medium mb-2">Day {day.day}</h3>
                        <div className="space-y-2">
                          {day.activities.map((activity: any, actIndex: number) => (
                            <div key={actIndex} className="flex justify-between">
                              <span>{activity.name}</span>
                              <span>${activity.cost}</span>
                            </div>
                          ))}
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Accommodation: {day.accommodation.name}</span>
                          <span>${day.accommodation.cost}</span>
                        </div>
                      </div>
                    ))}
                    
                    <div className="mt-6">
                      <h3 className="font-medium mb-2">Tips</h3>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {suggestions.tips.map((tip: string, index: number) => (
                          <li key={index}>{tip}</li>
                        ))}
                      </ul>
                    </div>

                    <Button
                      className="w-full mt-4"
                      onClick={() => createTripMutation.mutate(form.getValues())}
                      disabled={createTripMutation.isPending}
                    >
                      Save Trip
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Fill out the form to get AI-powered trip suggestions
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
