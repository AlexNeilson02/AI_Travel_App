import Nav from "@/components/Nav";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTripSchema } from "@shared/schema";
import { formatCurrency } from "@shared/currency";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { TravelLoadingAnimation } from "@/components/TravelLoadingAnimation";
import { PremiumFeature } from "@/components/PremiumFeature";
import { PremiumTripPlanner } from "@/components/PremiumTripPlanner";
import {
  CalendarIcon,
  DollarSign,
  Send,
  Edit2,
  Check,
  X,
  ExternalLink,
  ThermometerSun,
  CloudRain,
  AlertTriangle,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function PlanTrip() {
  const { toast } = useToast();
  const { hasUnlimitedTrips, maxTrips, hasAiChatbot } = useSubscription();
  const [tripCount, setTripCount] = useState<number>(0);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [userResponse, setUserResponse] = useState<string>("");
  const [editingActivity, setEditingActivity] = useState<{ day: number; index: number } | null>(null);
  const [editedActivity, setEditedActivity] = useState<{ name: string; cost: number; duration: string; url?: string } | null>(null);
  const [editingAccommodation, setEditingAccommodation] = useState<number | null>(null);
  const [numberOfPeople, setNumberPeople] = useState(1);
  
  // For navigation and user info
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  
  // Fetch user's trip count
  useEffect(() => {
    if (user && !hasUnlimitedTrips) {
      const fetchTrips = async () => {
        try {
          const response = await apiRequest("GET", "/api/trips");
          const trips = await response.json();
          setTripCount(trips.length);
          
          // If user is at or over their limit, show a warning
          if (trips.length >= maxTrips) {
            toast({
              title: "Trip Limit Reached",
              description: `You have reached your limit of ${maxTrips} trips. Upgrade to Premium for unlimited trips.`,
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error("Error fetching trips:", error);
        }
      };
      
      fetchTrips();
    }
  }, [user, hasUnlimitedTrips, maxTrips, toast]);

  // Check for saved trip data on component mount
  useEffect(() => {
    // Only attempt to restore data if the URL has a restore parameter and user is logged in
    if (location.includes('restore=true') && user) {
      const pendingTripData = localStorage.getItem("pendingTripData");
      if (pendingTripData) {
        try {
          const tripData = JSON.parse(pendingTripData);
          
          // Restore form data
          if (tripData.formData) {
            // Parse date strings back to Date objects
            const formData = {
              ...tripData.formData,
              startDate: tripData.formData.startDate ? new Date(tripData.formData.startDate) : new Date(),
              endDate: tripData.formData.endDate ? new Date(tripData.formData.endDate) : new Date()
            };
            
            // Reset form with saved values
            form.reset(formData);
            
            // Restore any other state
            if (tripData.suggestions) {
              setSuggestions(tripData.suggestions);
            }
            
            if (tripData.chatHistory) {
              setChatHistory(tripData.chatHistory);
            }
            
            // Notify user
            toast({
              title: "Trip Data Restored",
              description: "Your trip planning has been restored after login",
            });
          }
        } catch (error) {
          console.error("Error restoring trip data:", error);
          toast({
            title: "Error",
            description: "Could not restore your trip data",
            variant: "destructive",
          });
        }
        
        // Clear saved data
        localStorage.removeItem("pendingTripData");
      }
    }
  }, [location, user, toast]);

  const form = useForm({
    resolver: zodResolver(insertTripSchema),
    defaultValues: {
      title: "",
      destination: "",
      startDate: new Date(),
      endDate: new Date(),
      budget: 0,
      preferences: {
        accommodationType: [] as string[],
        activityTypes: [] as string[],
        activityFrequency: "moderate",
        mustSeeAttractions: [] as string[],
        dietaryRestrictions: [] as string[],
        transportationPreferences: [] as string[],
      },
    },
  });

  const getQuestionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/trip-questions", {
        preferences: form.getValues().preferences,
        destination: form.getValues().destination,
        chatHistory
      });
      return res.json();
    },
    onSuccess: (data) => {
      console.log("Received follow-up question:", data.question);
      setCurrentQuestion(data.question);
    },
    onError: (error) => {
      console.error("Error getting follow-up question:", error);
      setCurrentQuestion("What else would you like to know about your trip?");
    }
  });

  const suggestMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Sending suggestion request with data:", data);
      const res = await apiRequest("POST", "/api/suggest-trip", {
        ...data,
        numberOfPeople,
        chatHistory,
      });
      const responseData = await res.json();
      console.log("Raw API response:", responseData);
      return responseData;
    },
    onSuccess: (data) => {
      console.log("Received trip suggestions with weather:", data);
      console.log("Number of days received:", data.days?.length || 0);
      
      if (!data.days || data.days.length === 0) {
        console.error("No days received in the response", data);
        toast({
          title: "Error in Trip Generation",
          description: "The trip itinerary could not be generated. Please try again with different trip details.",
          variant: "destructive"
        });
        return;
      }
      
      console.log("Received days:", data.days.map((d: any) => d.date).join(", "));
      setSuggestions(data);
      if (!currentQuestion) {
        getQuestionMutation.mutate();
      }
      toast({
        title: "Trip Generated Successfully",
        description: `Total budget: $${form.getValues().budget} ($${(form.getValues().budget / numberOfPeople).toFixed(2)} per person × ${numberOfPeople} people)`,
      });
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
      console.log("Creating trip with data:", data);
      console.log("Using suggestions with days:", suggestions.days.length);
      
      // Ensure we're using all days that came from the server
      const formattedItinerary = {
        days: suggestions.days.map((day: any) => {
          // Parse the date properly without manipulating it
          const date = new Date(day.date);
          console.log(`Processing day: ${day.date} (${day.dayOfWeek})`);
          
          return {
            date: format(date, "yyyy-MM-dd"),
            activities: {
              timeSlots: day.activities.timeSlots.map((activity: any) => ({
                time: activity.time || "00:00",
                activity: activity.activity || activity.name,
                location: activity.location || "TBD",
                duration: activity.duration || "2 hours",
                notes: activity.notes || "",
                isEdited: false,
                url: activity.url,
              })),
            },
            aiSuggestions: {
              reasoning: "AI-generated suggestion",
              weatherContext: day.aiSuggestions?.weatherContext
                ? {
                    description: day.aiSuggestions.weatherContext.description,
                    temperature: day.aiSuggestions.weatherContext.temperature,
                    humidity: day.aiSuggestions.weatherContext.humidity || 0,
                    wind_speed: day.aiSuggestions.weatherContext.wind_speed || 0,
                    precipitation_probability:
                      day.aiSuggestions.weatherContext.precipitation_probability || 0,
                    is_suitable_for_outdoor:
                      day.aiSuggestions.weatherContext.is_suitable_for_outdoor || true,
                  }
                : undefined,
              alternativeActivities: day.aiSuggestions?.alternativeActivities || [],
            },
            userFeedback: "",
            isFinalized: false,
          };
        }),
      };

      const tripRes = await apiRequest("POST", "/api/trips", {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        itinerary: formattedItinerary,
      });

      return await tripRes.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Trip created successfully!",
      });
      form.reset();
      setSuggestions(null);
      setChatHistory([]);
      setCurrentQuestion("");
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
    },
    onError: (error: Error) => {
      // Handle 401 Unauthorized error (non-authenticated user) - redirect to login page
      if (error.message.includes("401") || error.message.includes("Unauthorized")) {
        toast({
          title: "Login Required",
          description: "Please log in or register to save your trip",
          variant: "default",
        });
        
        // Save trip info to localStorage so it can be retrieved after login
        const tripData = {
          formData: form.getValues(),
          suggestions: suggestions,
          chatHistory: chatHistory
        };
        localStorage.setItem("pendingTripData", JSON.stringify(tripData));
        
        // Redirect to auth page after a short delay
        setTimeout(() => {
          window.location.href = "/auth";
        }, 1500);
        return;
      }
      
      toast({
        title: "Error creating trip",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleChatResponse = () => {
    if (!userResponse.trim()) return;

    const updatedHistory = [
      ...chatHistory,
      { role: "user", content: userResponse.trim() },
    ];
    setChatHistory(updatedHistory);
    setUserResponse("");

    suggestMutation.mutate({
      destination: form.getValues().destination,
      preferences: form.getValues().preferences,
      budget: form.getValues().budget,
      startDate: form.getValues().startDate,
      endDate: form.getValues().endDate,
    });
  };

  const onSubmit = (data: any) => {
    suggestMutation.mutate({
      destination: data.destination,
      preferences: data.preferences,
      budget: data.budget,
      startDate: data.startDate,
      endDate: data.endDate,
    });
  };

  const handleEditActivity = (day: number, index: number, activity: any) => {
    setEditingActivity({ day, index });
    setEditedActivity({
      name: activity.activity,
      cost: activity.cost?.USD || 0,
      duration: activity.duration,
      url: activity.url,
    });
  };

  const handleSaveActivity = (day: number, index: number) => {
    if (!editedActivity || !suggestions) return;

    const updatedSuggestions = { ...suggestions };
    const activityUpdate = {
      ...updatedSuggestions.days[day - 1].activities.timeSlots[index],
      activity: editedActivity.name,
      cost: {
        USD: parseFloat(editedActivity.cost.toString()),
        MXN: parseFloat(editedActivity.cost.toString()) * 20 // Assuming 20 MXN per USD
      },
      duration: editedActivity.duration,
      url: editedActivity.url,
    };
    updatedSuggestions.days[day - 1].activities.timeSlots[index] = activityUpdate;
    setSuggestions(updatedSuggestions);
    setEditingActivity(null);
    setEditedActivity(null);
  };

  const handleEditAccommodation = (dayIndex: number) => {
    setEditingAccommodation(dayIndex);
  };

  const handleSaveAccommodation = (dayIndex: number, updatedAccommodation: any) => {
    if (!suggestions) return;

    const updatedSuggestions = { ...suggestions };
    updatedSuggestions.days[dayIndex].accommodation = updatedAccommodation;
    setSuggestions(updatedSuggestions);
    setEditingAccommodation(null);
  };

  const handleAccommodationTypeChange = (value: string) => {
    const current = form.getValues("preferences.accommodationType") as string[];
    if (!current.includes(value)) {
      form.setValue("preferences.accommodationType", [...current, value]);
    }
  };

  const handleActivityTypeChange = (value: string) => {
    const current = form.getValues("preferences.activityTypes") as string[];
    if (!current.includes(value)) {
      form.setValue("preferences.activityTypes", [...current, value]);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {hasAiChatbot ? (
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-4">Plan Your Trip with AI</h1>
            <p className="text-muted-foreground mb-6">
              Our AI-powered trip planner will help you create the perfect itinerary through a conversation.
              Just tell it where you want to go and answer its questions!
            </p>
            <div className="h-[75vh] min-h-[600px]">
              <PremiumTripPlanner />
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <Card className="mb-6">
                <CardHeader className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-950 dark:to-blue-950">
                  <div className="flex justify-between items-center">
                    <CardTitle>Premium Trip Planning</CardTitle>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Upgrade to Premium to access our AI chat-based trip planner.
                    Have a conversation with our AI to create your perfect itinerary!
                  </p>
                </CardHeader>
                <CardContent className="pt-6 pb-4">
                  <div className="flex justify-center">
                    <Button 
                      variant="default" 
                      onClick={() => navigate("/subscription")}
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                    >
                      <Lock className="mr-2 h-4 w-4" /> Upgrade to Premium
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Plan Your Trip</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-6"
                    >
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
                                <Button
                                  variant="outline"
                                  className="w-full justify-start text-left px-3 h-9 sm:h-10"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                  <span className="truncate text-sm">
                                    {form.watch("startDate")
                                      ? format(
                                          form.watch("startDate"),
                                          "MM/dd/yy",
                                        )
                                      : "Pick a date"}
                                  </span>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={form.watch("startDate")}
                                  onSelect={(date) =>
                                    form.setValue("startDate", date || new Date())
                                  }
                                  initialFocus
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
                                <Button
                                  variant="outline"
                                  className="w-full justify-start text-left px-3 h-9 sm:h-10"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                  <span className="truncate text-sm">
                                    {form.watch("endDate")
                                      ? format(form.watch("endDate"), "MM/dd/yy")
                                      : "Pick a date"}
                                  </span>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={form.watch("endDate")}
                                  onSelect={(date) =>
                                    form.setValue("endDate", date || new Date())
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Number of People
                          </label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="1"
                              value={numberOfPeople}
                              onChange={(e) =>
                                setNumberPeople(parseInt(e.target.value) || 1)
                              }
                              className="w-24"
                            />
                            <span className="text-sm text-muted-foreground">
                              This is the total budget for your trip
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Total Budget
                          </label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                            <Input
                              type="number"
                              className="pl-10"
                              {...form.register("budget", {
                                valueAsNumber: true,
                              })}
                            />
                          </div>
                          {numberOfPeople > 1 && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Per person: $
                              {((form.watch("budget") || 0) / numberOfPeople).toFixed(2)}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Accommodation Type
                          </label>
                          <Select onValueChange={handleAccommodationTypeChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select accommodation types" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hotel">Hotel</SelectItem>
                              <SelectItem value="hostel">Hostel</SelectItem>
                              <SelectItem value="apartment">Apartment</SelectItem>
                              <SelectItem value="resort">Resort</SelectItem>
                              <SelectItem value="camping">Camping</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {(
                              form.watch(
                                "preferences.accommodationType",
                              ) as string[]
                            ).map((type: string) => (
                              <Badge
                                key={type}
                                variant="secondary"
                                className="cursor-pointer"
                                onClick={() => {
                                  const current = form.getValues(
                                    "preferences.accommodationType",
                                  ) as string[];
                                  form.setValue(
                                    "preferences.accommodationType",
                                    current.filter((t: string) => t !== type),
                                  );
                                }}
                              >
                                {type} <X className="h-3 w-3 ml-1" />
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Activity Types
                          </label>
                          <Select onValueChange={handleActivityTypeChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select activity types" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="outdoor">Outdoor</SelectItem>
                              <SelectItem value="cultural">Cultural</SelectItem>
                              <SelectItem value="food">Food & Dining</SelectItem>
                              <SelectItem value="shopping">Shopping</SelectItem>
                              <SelectItem value="relaxation">
                                Relaxation
                              </SelectItem>
                              <SelectItem value="adventure">Adventure</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {(
                              form.watch("preferences.activityTypes") as string[]
                            ).map((type: string) => (
                              <Badge
                                key={type}
                                variant="secondary"
                                className="cursor-pointer"
                                onClick={() => {
                                  const current = form.getValues(
                                    "preferences.activityTypes",
                                  ) as string[];
                                  form.setValue(
                                    "preferences.activityTypes",
                                    current.filter((t: string) => t !== type),
                                  );
                                }}
                              >
                                {type} <X className="h-3 w-3 ml-1" />
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Activity Frequency
                          </label>
                          <Select
                            onValueChange={(value) =>
                              form.setValue(
                                "preferences.activityFrequency",
                                value,
                              )
                            }
                            defaultValue={form.getValues(
                              "preferences.activityFrequency",
                            )}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="relaxed">Relaxed</SelectItem>
                              <SelectItem value="moderate">Moderate</SelectItem>
                              <SelectItem value="intense">Intense</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full text-white"
                        disabled={suggestMutation.isPending}
                      >
                        {suggestMutation.isPending ? (
                          <div className="flex items-center justify-center">
                            <TravelLoadingAnimation size="small" />
                          </div>
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
                <div className="flex items-center justify-center h-full min-h-[200px]">
                  <div className="text-center">
                    <TravelLoadingAnimation size="large" />
                    <p className="mt-4 text-sm text-muted-foreground">Planning your perfect trip...</p>
                  </div>
                </div>
              ) : suggestions ? (
                <>
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Chat with AI Travel Advisor</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-4 max-h-[300px] overflow-y-auto">
                          {chatHistory.map((msg, index) => (
                            <div
                              key={index}
                              className={`p-4 rounded-lg ${
                                msg.role === "user"
                                  ? "bg-primary/10 ml-8"
                                  : "bg-muted mr-8"
                              }`}
                            >
                              <p className="text-sm">{msg.content}</p>
                            </div>
                          ))}
                        </div>

                        {currentQuestion && (
                          <div className="bg-muted p-4 rounded-lg">
                            <p className="text-sm font-medium">{currentQuestion}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Textarea
                            value={userResponse}
                            onChange={(e) => setUserResponse(e.target.value)}
                            placeholder="Ask a question or add more details..."
                            className="flex-1"
                          />
                          <Button
                            onClick={handleChatResponse}
                            disabled={!userResponse.trim()}
                            size="icon"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Your Trip Itinerary</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[600px] overflow-y-auto">
                      {suggestions.tips && suggestions.tips.length > 0 && (
                        <div className="bg-primary/5 p-4 rounded-lg mb-6">
                          <h3 className="font-semibold mb-2">Trip Tips</h3>
                          <ul className="space-y-2 text-sm list-disc pl-4">
                            {suggestions.tips.map((tip: string, index: number) => (
                              <li key={index}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Daily Itinerary Display */}
                      {suggestions.days && suggestions.days.length > 0 && (
                        <div className="space-y-5 mt-4">
                          <h3 className="font-semibold text-lg">Daily Itinerary</h3>
                          {suggestions.days.map((day: any, dayIndex: number) => (
                            <div key={dayIndex} className="border border-border rounded-md p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium text-base">
                                  Day {dayIndex + 1}: {day.date} {day.dayOfWeek ? `(${day.dayOfWeek})` : ''}
                                </h4>
                                {day.aiSuggestions?.weatherContext && (
                                  <Badge className={day.aiSuggestions.weatherContext.is_suitable_for_outdoor 
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100"}>
                                    {day.aiSuggestions.weatherContext.description}, {Math.round(day.aiSuggestions.weatherContext.temperature)}°F
                                  </Badge>
                                )}
                              </div>
                            
                              {/* Activities */}
                              <div className="space-y-3 ml-2">
                                {day.activities?.timeSlots && day.activities.timeSlots.map((activity: any, actIndex: number) => (
                                  <div key={actIndex} className="p-2 bg-muted/50 rounded-sm">
                                    <div className="flex flex-wrap gap-1 items-start">
                                      <div className="font-medium min-w-20 text-sm">{activity.time}</div>
                                      <div className="flex-1">
                                        <div className="font-medium">{activity.activity}</div>
                                        <div className="text-sm text-muted-foreground">{activity.location}</div>
                                        <div className="flex items-center gap-2 mt-1 text-xs">
                                          <span>{activity.duration}</span>
                                          {activity.cost?.USD && (
                                            <span className="text-muted-foreground">${activity.cost.USD}</span>
                                          )}
                                          {activity.url && (
                                            <a 
                                              href={activity.url} 
                                              target="_blank"
                                              rel="noopener noreferrer" 
                                              className="text-primary hover:underline flex items-center"
                                            >
                                              <ExternalLink className="h-3 w-3 mr-1" />
                                              Website
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              
                              {/* Accommodation */}
                              {day.accommodation && day.accommodation.name !== "TBD" && (
                                <div className="mt-4 p-3 border border-border rounded-sm">
                                  <h5 className="font-medium text-sm mb-1">Accommodation</h5>
                                  <div className="text-sm">{day.accommodation.name}</div>
                                  {day.accommodation.location && (
                                    <div className="text-xs text-muted-foreground">{day.accommodation.location}</div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {!hasUnlimitedTrips && tripCount >= maxTrips ? (
                        <div className="mt-4 p-4 bg-destructive/10 rounded-md text-center">
                          <p className="text-sm text-destructive font-medium mb-2">
                            Trip Limit Reached ({tripCount}/{maxTrips})
                          </p>
                          <p className="text-xs mb-3">
                            You've reached your free tier limit. Upgrade to Premium for unlimited trips.
                          </p>
                          <Button 
                            variant="outline"
                            className="w-full"
                            onClick={() => navigate("/subscription")}
                          >
                            Upgrade to Premium
                          </Button>
                        </div>
                      ) : (
                        <Button
                          className="w-full mt-4 text-white"
                          onClick={() =>
                            createTripMutation.mutate(form.getValues())
                          }
                          disabled={createTripMutation.isPending}
                        >
                          {createTripMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Save Trip
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Fill out the form to get AI-powered trip suggestions
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}