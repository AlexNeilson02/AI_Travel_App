import Nav from "@/components/Nav";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTripSchema } from "@shared/schema";
import { formatCurrency } from "@shared/currency";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { useState } from "react";
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
  const [suggestions, setSuggestions] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [userResponse, setUserResponse] = useState<string>("");
  const [editingActivity, setEditingActivity] = useState<{
    day: number;
    index: number;
  } | null>(null);
  const [editedActivity, setEditedActivity] = useState<{
    name: string;
    cost: number;
    duration: string;
    url?: string;
  } | null>(null);
  const [editingAccommodation, setEditingAccommodation] = useState<
    number | null
  >(null);
  const [numberOfPeople, setNumberPeople] = useState(1);

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
      const res = await apiRequest("POST", "/api/suggest-trip", {
        ...data,
        numberOfPeople,
        chatHistory,
      });
      return res.json();
    },
    onSuccess: (data) => {
      console.log("Received trip suggestions with weather:", data);
      console.log("Number of days received:", data.days?.length || 0);
      console.log("Received days:", data.days?.map((d: any) => d.date).join(", "));
      setSuggestions(data);
      if (!currentQuestion) {
        getQuestionMutation.mutate();
      }
      toast({
        title: "Budget Calculation",
        description: `Total budget: $${data.totalCost} ($${form.getValues().budget} per person × ${numberOfPeople} people)`,
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
                    feels_like: day.aiSuggestions.weatherContext.feels_like || 0,
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
    updatedSuggestions.days[day - 1].activities.timeSlots[index] =
      activityUpdate;
    setSuggestions(updatedSuggestions);
    setEditingActivity(null);
    setEditedActivity(null);
  };

  const handleEditAccommodation = (dayIndex: number) => {
    setEditingAccommodation(dayIndex);
  };

  const handleSaveAccommodation = (
    dayIndex: number,
    updatedAccommodation: any,
  ) => {
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

  const handleAttractionAdd = (value: string) => {
    const current = form.getValues(
      "preferences.mustSeeAttractions",
    ) as string[];
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
                            Budget will be calculated per person
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Budget (per person)
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
                            Total budget: $
                            {(form.watch("budget") || 0) * numberOfPeople}
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

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Must-See Attractions
                        </label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter an attraction"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const value = e.currentTarget.value.trim();
                                if (value) {
                                  handleAttractionAdd(value);
                                  e.currentTarget.value = "";
                                }
                              }
                            }}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(
                            form.watch(
                              "preferences.mustSeeAttractions",
                            ) as string[]
                          ).map((attraction: string) => (
                            <Badge
                              key={attraction}
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => {
                                const current = form.getValues(
                                  "preferences.mustSeeAttractions",
                                ) as string[];
                                form.setValue(
                                  "preferences.mustSeeAttractions",
                                  current.filter(
                                    (a: string) => a !== attraction,
                                  ),
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
                      className="w-full text-white"
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

                      {suggestions.nextQuestion && (
                        <div className="bg-muted p-4 rounded-lg">
                          <p className="text-sm font-medium">
                            {suggestions.nextQuestion}
                          </p>
                        </div>
                      )}

                      {suggestions.personalizedSuggestions?.length > 0 && (
                        <div className="bg-primary/5 p-4 rounded-lg space-y-2">
                          <h4 className="font-medium">
                            Personalized Suggestions:
                          </h4>
                          <ul className="list-disc list-inside space-y-1">
                            {suggestions.personalizedSuggestions.map(
                              (suggestion: string, index: number) => (
                                <li
                                  key={index}
                                  className="text-sm text-muted-foreground"
                                >
                                  {suggestion}
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Textarea
                          value={userResponse}
                          onChange={(e) => setUserResponse(e.target.value)}
                          placeholder="Type your response or ask a question..."
                          className="flex-1"
                        />
                        <Button
                          size="icon"
                          onClick={handleChatResponse}
                          disabled={!userResponse.trim()}
                        >
                          <Send className="h-4 w-4 text-white" />
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
                      {suggestions.days?.map((day: any, index: number) => {
                        console.log(
                          "Rendering day with weather:",
                          day.weatherContext,
                        );
                        return (
                          <div key={index}>
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                              <div className="flex flex-col gap-2 w-full">
                                <h3 className="font-medium">
                                  {day.dayOfWeek} - {day.date}
                                </h3>
                                {day.aiSuggestions?.weatherContext && (
                                  <div className="flex items-center gap-4 text-base bg-muted p-3 rounded-lg w-full">
                                    <div className="flex items-center gap-2">
                                      <ThermometerSun className="h-5 w-5 text-orange-500" />
                                      <span className="font-medium">
                                        {Math.round(
                                          day.aiSuggestions.weatherContext
                                            .temperature,
                                        )}
                                        °F
                                      </span>
                                      <span className="text-sm text-muted-foreground">
                                        (Feels like{" "}
                                        {Math.round(
                                          day.aiSuggestions.weatherContext
                                            .feels_like,
                                        )}
                                        °F)
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <CloudRain className="h-5 w-5 text-blue-500" />
                                      <span className="font-medium">
                                        {Math.round(
                                          day.aiSuggestions.weatherContext
                                            .precipitation_probability,
                                        )}
                                        %
                                      </span>
                                    </div>
                                    <span className="text-muted-foreground">
                                      {
                                        day.aiSuggestions.weatherContext
                                          .description
                                      }
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {day.aiSuggestions?.weatherContext &&
                              !day.aiSuggestions.weatherContext
                                .is_suitable_for_outdoor && (
                                <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-900/50">
                                  <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span className="font-medium">
                                      Weather Advisory
                                    </span>
                                  </div>
                                  <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                                    Weather conditions may not be suitable for
                                    outdoor activities.
                                    {day.aiSuggestions.alternativeActivities
                                      ?.length > 0 && (
                                      <>
                                        <br />
                                        Consider these indoor alternatives:{" "}
                                        {day.aiSuggestions.alternativeActivities.join(
                                          ", ",
                                        )}
                                        .
                                      </>
                                    )}
                                  </p>
                                </div>
                              )}

                            <div className="space-y-2">
                              {day.activities?.timeSlots?.map(
                                (activity: any, actIndex: number) => (
                                  <div
                                    key={actIndex}
                                    className="flex items-center justify-between p-2 border rounded"
                                  >
                                    {editingActivity?.day === index + 1 &&
                                    editingActivity?.index === actIndex ? (
                                      <div className="flex-1 space-y-2">
                                        <Input
                                          value={editedActivity?.name}
                                          onChange={(e) =>
                                            setEditedActivity({
                                              ...editedActivity!,
                                              name: e.target.value,
                                            })
                                          }
                                          placeholder="Activity name"
                                        />
                                        <div className="flex gap-2">
                                          <Input
                                            type="number"
                                            value={editedActivity?.cost}
                                            onChange={(e) =>
                                              setEditedActivity({
                                                ...editedActivity!,
                                                cost: parseFloat(
                                                  e.target.value,
                                                ),
                                              })
                                            }
                                            placeholder="Cost per person"
                                            className="w-32"
                                          />
                                          <Input
                                            value={editedActivity?.duration}
                                            onChange={(e) =>
                                              setEditedActivity({
                                                ...editedActivity!,
                                                duration: e.target.value,
                                              })
                                            }
                                            placeholder="Duration"
                                          />
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                          Total for {numberOfPeople}{" "}
                                          {numberOfPeople === 1
                                            ? "person"
                                            : "people"}
                                          : $
                                          {(editedActivity?.cost || 0) *
                                            numberOfPeople}
                                        </div>
                                        <div className="flex justify-end gap-2">
                                          <Button
                                            size="sm"
                                            onClick={() =>
                                              handleSaveActivity(
                                                index + 1,
                                                actIndex,
                                              )
                                            }
                                          >
                                            <Check className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() =>
                                              setEditingActivity(null)
                                            }
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="flex-1">
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
                                          <div className="text-sm text-muted-foreground">
                                            {activity.duration} • 
                                            {formatCurrency(activity.cost?.USD || 0, 'USD')} per person
                                            {numberOfPeople > 1 &&
                                              ` (Total: ${formatCurrency((activity.cost?.USD || 0) * numberOfPeople, 'USD')})`}
                                          </div>
                                        </div>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          onClick={() =>
                                            handleEditActivity(
                                              index + 1,
                                              actIndex,
                                              activity,
                                            )
                                          }
                                        >
                                          <Edit2 className="h-4 w-4" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                ),
                              )}
                            </div>

                            <Separator className="my-2" />

                            <div className="space-y-4">
                              <div className="flex items-center justify-between p-2 border rounded">
                                {editingAccommodation === index ? (
                                  <div className="flex-1 space-y-2">
                                    <Input
                                      value={day.accommodation?.name}
                                      onChange={(e) => {
                                        const updated = {
                                          ...day.accommodation,
                                          name: e.target.value,
                                        };
                                        handleSaveAccommodation(index, updated);
                                      }}
                                      placeholder="Accommodation name"
                                    />
                                    <div className="flex gap-2">
                                      <Input
                                        type="number"
                                        value={day.accommodation?.cost?.USD || 0}
                                        onChange={(e) => {
                                          const updated = {
                                            ...day.accommodation,
                                            cost: {
                                              USD: parseFloat(e.target.value),
                                              MXN: parseFloat(e.target.value) * 20 // Assuming 20 MXN per USD for simplicity
                                            }
                                          };
                                          handleSaveAccommodation(
                                            index,
                                            updated,
                                          );
                                        }}
                                        placeholder="Cost per person (USD)"
                                        className="w-32"
                                      />
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      Total for {numberOfPeople}{" "}
                                      {numberOfPeople === 1
                                        ? "person"
                                        : "people"}
                                      : {formatCurrency((day.accommodation?.cost?.USD || 0) * numberOfPeople, 'USD')}
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span>
                                          Accommodation:{" "}
                                          {day.accommodation?.name ||
                                            "Not specified"}
                                        </span>
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
                                      <div className="text-sm text-muted-foreground">
                                        {formatCurrency(day.accommodation?.cost?.USD || 0, 'USD')} per person
                                        {numberOfPeople > 1 &&
                                          ` (Total: ${formatCurrency((day.accommodation?.cost?.USD || 0) * numberOfPeople, 'USD')})`}
                                      </div>
                                    </div>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() =>
                                        handleEditAccommodation(index)
                                      }
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>

                              <div className="p-2 border rounded">
                                <div className="flex items-center justify-between">
                                  <span>Daily Meal Budget</span>
                                  <div className="text-sm text-muted-foreground">
                                    {formatCurrency(day.meals?.budget?.USD || 0, 'USD')} per person
                                    {numberOfPeople > 1 &&
                                      ` (Total: ${formatCurrency((day.meals?.budget?.USD || 0) * numberOfPeople, 'USD')})`}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {suggestions.tips && suggestions.tips.length > 0 && (
                        <div className="mt-6">
                          <h3 className="font-medium mb-2">Tips</h3>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {suggestions.tips.map(
                              (tip: string, index: number) => (
                                <li key={index}>{tip}</li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}

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
        </div>
      </main>
    </div>
  );
}
