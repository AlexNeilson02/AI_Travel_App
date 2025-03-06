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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CalendarIcon, DollarSign, Send, Edit2, Check, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function PlanTrip() {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [userResponse, setUserResponse] = useState<string>("");
  const [editingActivity, setEditingActivity] = useState<{ day: number; index: number } | null>(null);
  const [editedActivity, setEditedActivity] = useState<{ name: string; cost: number; duration: string } | null>(null);

  const form = useForm({
    resolver: zodResolver(insertTripSchema),
    defaultValues: {
      title: "",
      destination: "",
      startDate: new Date(),
      endDate: new Date(),
      budget: 0,
      preferences: {
        accommodationType: [],
        activityTypes: [],
        activityFrequency: "moderate",
        mustSeeAttractions: [],
        dietaryRestrictions: [],
        transportationPreferences: [],
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
      // First create the trip
      const tripRes = await apiRequest("POST", "/api/trips", {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
      });
      const trip = await tripRes.json();

      // Then create trip days for each suggested day
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

    // Trigger new suggestions with updated chat history
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
    updatedSuggestions.days[day - 1].activities[index] = editedActivity;
    setSuggestions(updatedSuggestions);
    setEditingActivity(null);
    setEditedActivity(null);
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
                        <Select
                          onValueChange={(value) => {
                            const current = form.getValues("preferences.accommodationType");
                            if (!current.includes(value)) {
                              form.setValue("preferences.accommodationType", [...current, value]);
                            }
                          }}
                        >
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
                          {form.watch("preferences.accommodationType").map((type: string) => (
                            <Badge
                              key={type}
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => {
                                const current = form.getValues("preferences.accommodationType");
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
                        <Select
                          onValueChange={(value) => {
                            const current = form.getValues("preferences.activityTypes");
                            if (!current.includes(value)) {
                              form.setValue("preferences.activityTypes", [...current, value]);
                            }
                          }}
                        >
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
                          {form.watch("preferences.activityTypes").map((type: string) => (
                            <Badge
                              key={type}
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => {
                                const current = form.getValues("preferences.activityTypes");
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
                                  const current = form.getValues("preferences.mustSeeAttractions");
                                  if (!current.includes(value)) {
                                    form.setValue("preferences.mustSeeAttractions", [...current, value]);
                                  }
                                  e.currentTarget.value = '';
                                }
                              }
                            }}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {form.watch("preferences.mustSeeAttractions").map((attraction: string) => (
                            <Badge
                              key={attraction}
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => {
                                const current = form.getValues("preferences.mustSeeAttractions");
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
                          <div className="space-y-2">
                            {day.activities.map((activity: any, actIndex: number) => (
                              <div key={actIndex} className="flex items-center justify-between">
                                {editingActivity?.day === day.day && editingActivity?.index === actIndex ? (
                                  <div className="flex-1 flex gap-2">
                                    <Input
                                      value={editedActivity?.name}
                                      onChange={(e) => setEditedActivity({ ...editedActivity!, name: e.target.value })}
                                      className="flex-1"
                                    />
                                    <Input
                                      type="number"
                                      value={editedActivity?.cost}
                                      onChange={(e) => setEditedActivity({ ...editedActivity!, cost: Number(e.target.value) })}
                                      className="w-24"
                                    />
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleSaveActivity(day.day, actIndex)}
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
                                    <span>{activity.name}</span>
                                    <div className="flex items-center gap-2">
                                      <span>${activity.cost}</span>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleEditActivity(day.day, actIndex, activity)}
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