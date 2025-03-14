import Nav from "@/components/Nav";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CalendarIcon, DollarSign, Send, Edit2, Check, X, ExternalLink, ThermometerSun, CloudRain, AlertTriangle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function PlanTrip() {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [userResponse, setUserResponse] = useState<string>("");
  const [editingActivity, setEditingActivity] = useState<{ day: number; index: number } | null>(null);
  const [editedActivity, setEditedActivity] = useState<{ name: string; cost: number; duration: string; url?: string } | null>(null);
  const [showWeatherDialog, setShowWeatherDialog] = useState(false);
  const [selectedDay, setSelectedDay] = useState<any>(null);
  const [weatherImpact, setWeatherImpact] = useState<string>("");

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
      });
      return res.json();
    },
    onSuccess: (data) => {
      setCurrentQuestion(data.question);
    },
  });

  const suggestMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/suggest-trip", {
        ...data,
        chatHistory,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setSuggestions(data);
      if (!currentQuestion) {
        getQuestionMutation.mutate();
      }
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
      console.log('Creating trip with data:', data);
      const tripRes = await apiRequest("POST", "/api/trips", {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
      });
      const trip = await tripRes.json();

      if (suggestions?.days) {
        for (const day of suggestions.days) {
          await apiRequest("POST", `/api/trips/${trip.id}/days`, {
            tripId: trip.id,
            date: new Date(day.date).toISOString(),
            activities: {
              timeSlots: day.activities.map((activity: any) => ({
                time: activity.time || "00:00",
                activity: activity.name,
                location: activity.location || "TBD",
                duration: activity.duration || "2 hours",
                cost: activity.cost,
                url: activity.url,
                notes: "",
                isEdited: false,
              })),
            },
            aiSuggestions: {
              reasoning: "Initial AI suggestion",
              alternativeActivities: [],
            },
          });
        }
      }

      return trip;
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
    },
    onError: (error: Error) => {
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
    setEditedActivity({ ...activity });
  };

  const handleSaveActivity = (day: number, index: number) => {
    if (!editedActivity || !suggestions) return;

    const updatedSuggestions = { ...suggestions };
    updatedSuggestions.days[day - 1].activities.timeSlots[index] = editedActivity;
    setSuggestions(updatedSuggestions);
    setEditingActivity(null);
    setEditedActivity(null);
  };

  const showWeatherImpact = (day: any) => {
    setSelectedDay(day);

    if (day.weatherContext) {
      const weatherContext = day.weatherContext;
      const activities = day.activities.timeSlots.map((activity: any) => activity.activity).join(", ");

      let impact = "";

      if (weatherContext.is_suitable_for_outdoor) {
        impact = `The forecast for ${format(new Date(day.date), "MMMM d")} looks favorable with ${weatherContext.description} and a temperature of ${Math.round(weatherContext.temperature)}°F. This weather is suitable for your planned activities: ${activities}.`;
      } else {
        impact = `The weather forecast for ${format(new Date(day.date), "MMMM d")} shows ${weatherContext.description} with a temperature of ${Math.round(weatherContext.temperature)}°F and ${Math.round(weatherContext.precipitation_probability)}% chance of precipitation. This might affect your outdoor plans.`;

        if (day.alternativeActivities && day.alternativeActivities.length > 0) {
          impact += ` Consider these indoor alternatives: ${day.alternativeActivities.join(", ")}.`;
        }
      }

      setWeatherImpact(impact);
    } else {
      setWeatherImpact("Weather data isn't available yet for this date. Check back closer to your trip date for a weather impact analysis.");
    }

    setShowWeatherDialog(true);
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

  const handleAttractionAdd = (value: string) => {
    const current = form.getValues("preferences.mustSeeAttractions") as string[];
    if (!current.includes(value)) {
      form.setValue("preferences.mustSeeAttractions", [...current, value]);
    }
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
                              <Button variant="outline" className="w-full justify-start text-left px-3 h-9 sm:h-10">
                                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                <span className="truncate text-sm">
                                  {form.watch("startDate")
                                    ? format(form.watch("startDate"), "MM/dd/yy")
                                    : "Pick a date"}
                                </span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={form.watch("startDate")}
                                onSelect={(date) => form.setValue("startDate", date || new Date())}
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
                              <Button variant="outline" className="w-full justify-start text-left px-3 h-9 sm:h-10">
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
                                onSelect={(date) => form.setValue("endDate", date || new Date())}
                                initialFocus
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
                          {(form.watch("preferences.accommodationType") as string[]).map((type: string) => (
                            <Badge
                              key={type}
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => {
                                const current = form.getValues("preferences.accommodationType") as string[];
                                form.setValue(
                                  "preferences.accommodationType",
                                  current.filter((t: string) => t !== type)
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
                            <SelectItem value="relaxation">Relaxation</SelectItem>
                            <SelectItem value="adventure">Adventure</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(form.watch("preferences.activityTypes") as string[]).map((type: string) => (
                            <Badge
                              key={type}
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => {
                                const current = form.getValues("preferences.activityTypes") as string[];
                                form.setValue(
                                  "preferences.activityTypes",
                                  current.filter((t: string) => t !== type)
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
                          onValueChange={(value) => form.setValue("preferences.activityFrequency", value)}
                          defaultValue={form.getValues("preferences.activityFrequency")}
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

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Must-See Attractions
                        </label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter an attraction"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const value = e.currentTarget.value.trim();
                                if (value) {
                                  handleAttractionAdd(value);
                                  e.currentTarget.value = '';
                                }
                              }
                            }}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(form.watch("preferences.mustSeeAttractions") as string[]).map((attraction: string) => (
                            <Badge
                              key={attraction}
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => {
                                const current = form.getValues("preferences.mustSeeAttractions") as string[];
                                form.setValue(
                                  "preferences.mustSeeAttractions",
                                  current.filter((a: string) => a !== attraction)
                                );
                              }}
                            >
                              {attraction} <X className="h-3 w-3 ml-1" />
                            </Badge>
                          ))}
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
              <>
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Chat with AI Travel Advisor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {currentQuestion && (
                        <div className="bg-muted p-4 rounded-lg">
                          <p className="text-sm">{currentQuestion}</p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Textarea
                          value={userResponse}
                          onChange={(e) => setUserResponse(e.target.value)}
                          placeholder="Type your response..."
                          className="flex-1"
                        />
                        <Button
                          size="icon"
                          onClick={handleChatResponse}
                          disabled={!userResponse.trim()}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>AI Suggestions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {suggestions.days.map((day: any, index: number) => (
                        <div key={index}>
                          <h3 className="font-medium mb-2">
                            {day.dayOfWeek} - {format(new Date(day.date), "MMM d, yyyy")}
                          </h3>

                          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                            <div className="flex flex-col gap-2">
                              {day.aiSuggestions?.weatherContext ? (
                                <div className="flex items-center gap-2 text-sm">
                                  <ThermometerSun className="h-4 w-4" />
                                  <span>{Math.round(day.aiSuggestions.weatherContext.temperature)}°F</span>
                                  <CloudRain className="h-4 w-4 ml-2" />
                                  <span>{Math.round(day.aiSuggestions.weatherContext.precipitation_probability)}%</span>
                                  <span className="text-muted-foreground">
                                    {day.aiSuggestions.weatherContext.description}
                                  </span>
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">
                                  No weather data available yet
                                </div>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => showWeatherImpact(day)}
                              className="whitespace-nowrap"
                            >
                              See how this affects my trip
                            </Button>
                          </div>

                          {day.aiSuggestions?.weatherContext && !day.aiSuggestions.weatherContext.is_suitable_for_outdoor && (
                            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-900/50">
                              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="font-medium">Weather Advisory</span>
                              </div>
                              <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                                Weather conditions may not be suitable for outdoor activities.
                              </p>
                              {day.aiSuggestions.alternativeActivities && day.aiSuggestions.alternativeActivities.length > 0 && (
                                <div className="mt-2">
                                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                    Suggested Alternatives:
                                  </span>
                                  <ul className="mt-1 list-disc list-inside text-sm text-yellow-700 dark:text-yellow-300">
                                    {day.aiSuggestions.alternativeActivities.map((alt: string, index: number) => (
                                      <li key={index}>{alt}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="space-y-2">
                            {day.activities?.timeSlots?.map((activity: any, actIndex: number) => (
                              <div key={actIndex} className="flex items-center justify-between">
                                {editingActivity?.day === index + 1 && editingActivity?.index === actIndex ? (
                                  <div className="flex-1 flex gap-2">
                                    <Input
                                      value={editedActivity?.name}
                                      onChange={(e) => setEditedActivity({ ...editedActivity!, name: e.target.value })}
                                      className="flex-1"
                                    />
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleSaveActivity(index + 1, actIndex)}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => setEditingActivity(null)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <span>{activity.activity}</span>
                                      {activity.url && (
                                        <a
                                          href={activity.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary hover:text-primary/80"
                                        >
                                          <ExternalLink className="h-4 w-4" />
                                        </a>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">{activity.time}</span>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleEditActivity(index + 1, actIndex, activity)}
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                          <Separator className="my-2" />
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <span>Accommodation: {day.accommodation?.name || 'Not specified'}</span>
                              {day.accommodation?.url && (
                                <a
                                  href={day.accommodation.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:text-primary/80"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              )}
                            </div>
                            <span>${day.accommodation?.cost || 0}</span>
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
                      {createTripMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Save Trip
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Fill out the form to get AI-powered trip suggestions
            </div>
          )}
        </div>

        <Dialog open={showWeatherDialog} onOpenChange={setShowWeatherDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Weather Impact on {selectedDay?.date ? format(new Date(selectedDay.date), "MMMM d") : ""}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">{weatherImpact}</p>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowWeatherDialog(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}