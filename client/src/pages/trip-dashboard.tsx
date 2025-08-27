import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute, Link } from "wouter";
import { format, parseISO, isBefore, startOfDay, differenceInMinutes } from "date-fns";
import { PremiumFeature } from "@/components/PremiumFeature";
import { AIChatPlanner } from "@/components/AIChatPlanner";
import Nav from "@/components/Nav";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Cloud,
  CloudRain,
  Droplets,
  Edit,
  Link as LinkIcon,
  Loader2,
  MapPin,
  Plus,
  ThermometerSun,
  Trash2,
  Wind,
  CalendarIcon,
  MapIcon,
  HeadphonesIcon,
  CreditCard,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Archive
} from "lucide-react";
import { jsPDF } from "jspdf";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Trip } from "@shared/schema";
import TripMap from "@/components/TripMap";
import TripCalendar from "@/components/TripCalendar";
import { EventInput } from "@fullcalendar/core";

interface TimeSlot {
  time: string;
  activity: string;
  location: string;
  duration: string;
  notes: string;
  isEdited: boolean;
  url?: string;
}

interface TripDay {
  date: string;
  dayOfWeek?: string;
  activities: {
    timeSlots: TimeSlot[];
  };
  aiSuggestions?: {
    reasoning: string;
    weatherContext?: {
      description: string;
      temperature: number;
      humidity?: number;
      wind_speed?: number;
      precipitation_probability: number;
      is_suitable_for_outdoor: boolean;
      warning?: string;
    };
    alternativeActivities: string[];
  };
  userFeedback?: string;
  isFinalized: boolean;
}

interface WeatherForecast {
  date: string;
  dayOfWeek: string | undefined;
  high: number;
  low: number;
  description: string;
  precipitation: number;
  icon: JSX.Element;
  warning?: string;
}

export default function TripDashboard() {
  const { toast } = useToast();
  const [match, params] = useRoute<{ id?: string }>("/trip-dashboard/:id");
  const [, setLocation] = useLocation();
  
  const [editingActivity, setEditingActivity] = useState<{ tripId: number; dayIndex: number; slotIndex: number } | null>(null);
  const [editedActivity, setEditedActivity] = useState<Partial<TimeSlot> | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddActivityDialog, setShowAddActivityDialog] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("itinerary");
  const [newActivity, setNewActivity] = useState<Partial<TimeSlot>>({
    time: "",
    activity: "",
    location: "",
    duration: "",
    notes: "",
    url: ""
  });

  // Query all trips
  const { data: trips, isLoading } = useQuery<Trip[]>({
    queryKey: ["/api/trips"],
  });

  // Archive trip mutation
  const archiveMutation = useMutation({
    mutationFn: async (tripId: number) => {
      await apiRequest("POST", `/api/trips/${tripId}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips/archived"] });
      toast({
        title: "Success",
        description: "Trip archived successfully and moved to your profile.",
      });
      // If we archived the currently selected trip, select another one
      if (trips && trips.length > 1) {
        const remainingTrips = trips.filter(trip => trip.id !== selectedTripId);
        if (remainingTrips.length > 0) {
          setSelectedTripId(remainingTrips[0].id);
        }
      } else {
        setSelectedTripId(null);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to archive trip",
        variant: "destructive",
      });
    }
  });

  // Get current trip
  const currentTrip = trips?.find(trip => trip.id === selectedTripId);

  // Set the first trip as selected or use the route param if available
  useEffect(() => {
    if (trips && trips.length > 0) {
      if (params?.id) {
        const tripId = parseInt(params.id);
        setSelectedTripId(tripId);
      } else if (!selectedTripId) {
        setSelectedTripId(trips[0].id);
      }
    }
  }, [trips, params, selectedTripId]);

  // Update URL when selected trip changes
  useEffect(() => {
    if (selectedTripId) {
      setLocation(`/trip-dashboard/${selectedTripId}`);
    }
  }, [selectedTripId, setLocation]);

  // Handle trip selection
  const handleTripSelect = (tripId: string) => {
    setSelectedTripId(parseInt(tripId));
  };

  // Handle activity edit
  const handleEditActivity = (tripId: number, dayIndex: number, slotIndex: number, activity: TimeSlot) => {
    setEditingActivity({ tripId, dayIndex, slotIndex });
    setEditedActivity({ ...activity });
    setShowEditDialog(true);
  };

  // Handle save edited activity
  const handleSaveEditedActivity = async () => {
    if (!editingActivity || !editedActivity || !currentTrip || !currentTrip.itinerary) return;

    try {
      // Create a deep copy of the trip
      const updatedTrip = JSON.parse(JSON.stringify(currentTrip)) as Trip;
      const { dayIndex, slotIndex } = editingActivity;
      
      // Update the activity in the trip's itinerary
      if (updatedTrip.itinerary && updatedTrip.itinerary.days) {
        const timeSlot = updatedTrip.itinerary.days[dayIndex].activities.timeSlots[slotIndex];
        updatedTrip.itinerary.days[dayIndex].activities.timeSlots[slotIndex] = {
          ...timeSlot,
          ...editedActivity,
          isEdited: true
        };
      }

      // Update the trip on the server
      await apiRequest(`/api/trips/${currentTrip.id}`, 
        JSON.stringify({
          method: "PATCH",
          body: JSON.stringify(updatedTrip)
        })
      );

      // Invalidate cache to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      
      toast({
        title: "Activity Updated",
        description: "The activity has been updated successfully."
      });
      
      // Close the dialog
      setShowEditDialog(false);
      setEditingActivity(null);
      setEditedActivity(null);
    } catch (error) {
      console.error("Error updating activity:", error);
      toast({
        title: "Error",
        description: "Failed to update the activity. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle add activity
  const handleAddActivity = (tripId: number, dayIndex: number) => {
    setSelectedDayIndex(dayIndex);
    setSelectedTripId(tripId);
    setShowAddActivityDialog(true);
  };

  // Handle save new activity
  const handleSaveNewActivity = async () => {
    if (selectedDayIndex === null || !currentTrip || !currentTrip.itinerary || !newActivity.time || !newActivity.activity) return;

    try {
      // Create a deep copy of the trip
      const updatedTrip = JSON.parse(JSON.stringify(currentTrip)) as Trip;
      
      // Add the new activity to the trip's itinerary
      if (updatedTrip.itinerary && updatedTrip.itinerary.days) {
        updatedTrip.itinerary.days[selectedDayIndex].activities.timeSlots.push({
          ...newActivity as TimeSlot,
          isEdited: true
        });

        // Sort activities by time
        updatedTrip.itinerary.days[selectedDayIndex].activities.timeSlots.sort((a, b) => {
          return a.time.localeCompare(b.time);
        });
      }

      // Update the trip on the server
      await apiRequest(`/api/trips/${currentTrip.id}`, 
        JSON.stringify({
          method: "PATCH",
          body: JSON.stringify(updatedTrip)
        })
      );

      // Invalidate cache to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      
      toast({
        title: "Activity Added",
        description: "The new activity has been added successfully."
      });
      
      // Reset form and close dialog
      setNewActivity({
        time: "",
        activity: "",
        location: "",
        duration: "",
        notes: "",
        url: ""
      });
      setShowAddActivityDialog(false);
      setSelectedDayIndex(null);
    } catch (error) {
      console.error("Error adding activity:", error);
      toast({
        title: "Error",
        description: "Failed to add the activity. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Generate PDF from trip itinerary
  const generatePDF = async (trip: Trip) => {
    const pdf = new jsPDF();
    const lineHeight = 10;
    let yPos = 20;

    pdf.setFontSize(20);
    pdf.text(trip.title, 20, yPos);
    yPos += lineHeight * 1.5;

    pdf.setFontSize(14);
    pdf.text(`Destination: ${trip.destination}`, 20, yPos);
    yPos += lineHeight;
    pdf.text(`Budget: $${trip.budget}`, 20, yPos);
    yPos += lineHeight;
    
    // Calculate trip duration from start and end dates
    const tripDuration = trip.itinerary?.days?.length || 0;
    pdf.text(`Duration: ${tripDuration} days`, 20, yPos);
    yPos += lineHeight * 2;

    pdf.setFontSize(16);
    pdf.text("Itinerary", 20, yPos);
    yPos += lineHeight * 1.5;

    if (trip.itinerary && trip.itinerary.days) {
      trip.itinerary.days.forEach((day: TripDay) => {
        if (yPos > 270) {
          pdf.addPage();
          yPos = 20;
        }

        pdf.setFontSize(14);
        const dayDate = parseISO(day.date);
        pdf.text(format(dayDate, "EEEE, MMMM d, yyyy"), 20, yPos);
        yPos += lineHeight;
        pdf.setFontSize(12);

        day.activities.timeSlots.forEach((slot: TimeSlot) => {
          if (yPos > 270) {
            pdf.addPage();
            yPos = 20;
          }
          pdf.text(`• ${slot.time} - ${slot.activity}`, 30, yPos);
          yPos += lineHeight;
          if (slot.location) {
            pdf.text(`  Location: ${slot.location}`, 35, yPos);
            yPos += lineHeight;
          }
        });
        yPos += lineHeight;
      });
    }

    pdf.save(`${trip.title.replace(/\s+/g, '_')}_itinerary.pdf`);
    toast({
      title: "Success",
      description: "Trip details downloaded as PDF",
    });
  };

  // State for fetching weather data
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherForecasts, setWeatherForecasts] = useState<WeatherForecast[]>([]);
  const [weatherLastFetched, setWeatherLastFetched] = useState<Date | null>(null);
  
  // State for trip completion
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const [tripCompleted, setTripCompleted] = useState(false);
  
  // State for calendar events saving
  const [isSavingCalendarEvents, setIsSavingCalendarEvents] = useState(false);

  // Check if trip date has already passed
  const isTripInPast = useCallback((trip: Trip | undefined): boolean => {
    if (!trip || !trip.itinerary || !trip.itinerary.days || trip.itinerary.days.length === 0) return false;
    
    // Get the last day of the trip
    const lastDay = trip.itinerary.days[trip.itinerary.days.length - 1];
    const lastDayDate = parseISO(lastDay.date);
    
    // Compare with current date
    return isBefore(lastDayDate, startOfDay(new Date()));
  }, []);

  // Mark trip as complete
  const handleMarkTripComplete = async () => {
    if (!currentTrip) return;
    
    setIsMarkingComplete(true);
    
    try {
      // Create a deep copy of the trip
      const updatedTrip = JSON.parse(JSON.stringify(currentTrip)) as Trip;
      
      // Mark all days as finalized
      if (updatedTrip.itinerary && updatedTrip.itinerary.days) {
        updatedTrip.itinerary.days = updatedTrip.itinerary.days.map(day => ({
          ...day,
          isFinalized: true
        }));
      }
      
      // Update the trip on the server
      await apiRequest(`/api/trips/${currentTrip.id}`, 
        JSON.stringify({
          method: "PATCH",
          body: JSON.stringify(updatedTrip)
        })
      );

      // Invalidate cache to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      
      setTripCompleted(true);
      
      toast({
        title: "Trip Completed",
        description: "Your trip has been marked as complete."
      });
    } catch (error) {
      console.error("Error marking trip as complete:", error);
      toast({
        title: "Error",
        description: "Failed to mark trip as complete. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsMarkingComplete(false);
    }
  };
  
  // Save calendar events to trip
  const handleSaveCalendarEvents = async (events: EventInput[]) => {
    if (!currentTrip) return;
    
    setIsSavingCalendarEvents(true);
    
    try {
      // Create a deep copy of the trip
      const updatedTrip = JSON.parse(JSON.stringify(currentTrip)) as Trip;
      
      // Map of dates to day indices in trip itinerary
      const dateToIndexMap = new Map<string, number>();
      
      if (updatedTrip.itinerary && updatedTrip.itinerary.days) {
        // Build map of dates to indices for quick lookup
        updatedTrip.itinerary.days.forEach((day, index) => {
          const dateString = day.date.split('T')[0]; // Get only the date part
          dateToIndexMap.set(dateString, index);
        });
        
        // Process each calendar event and update the trip itinerary
        for (const event of events) {
          // Skip events without start time or title
          if (!event.start || !event.title) continue;
          
          // Get the date part of the event
          const eventDate = new Date(event.start as string | Date);
          const dateString = eventDate.toISOString().split('T')[0];
          
          // Find corresponding day in itinerary
          const dayIndex = dateToIndexMap.get(dateString);
          
          if (dayIndex !== undefined) {
            // Format time as HH:MM
            const hours = eventDate.getHours().toString().padStart(2, '0');
            const minutes = eventDate.getMinutes().toString().padStart(2, '0');
            const timeString = `${hours}:${minutes}`;
            
            // Calculate duration
            const endDate = event.end ? new Date(event.end as string | Date) : new Date(eventDate.getTime() + 60 * 60 * 1000);
            const durationInMinutes = Math.round((endDate.getTime() - eventDate.getTime()) / 60000);
            
            let durationString = '';
            if (durationInMinutes < 60) {
              durationString = `${durationInMinutes} minutes`;
            } else if (durationInMinutes % 60 === 0) {
              durationString = `${durationInMinutes / 60} hours`;
            } else {
              const hours = Math.floor(durationInMinutes / 60);
              const minutes = durationInMinutes % 60;
              durationString = `${hours} hours and ${minutes} minutes`;
            }
            
            // Create time slot from event
            const newTimeSlot: TimeSlot = {
              time: timeString,
              activity: event.title as string,
              location: event.extendedProps?.location || '',
              duration: event.extendedProps?.duration || durationString,
              notes: event.extendedProps?.notes || '',
              isEdited: true,
              url: event.extendedProps?.url || ''
            };
            
            // Check if this event already exists in time slots
            const existingSlotIndex = updatedTrip.itinerary.days[dayIndex].activities.timeSlots.findIndex(
              slot => slot.time === timeString && slot.activity === newTimeSlot.activity
            );
            
            // Update or add the time slot
            if (existingSlotIndex >= 0) {
              updatedTrip.itinerary.days[dayIndex].activities.timeSlots[existingSlotIndex] = newTimeSlot;
            } else {
              updatedTrip.itinerary.days[dayIndex].activities.timeSlots.push(newTimeSlot);
            }
            
            // Sort time slots by time
            updatedTrip.itinerary.days[dayIndex].activities.timeSlots.sort((a, b) => 
              a.time.localeCompare(b.time)
            );
          }
        }
        
        // Remove any time slots that are no longer in the calendar events
        updatedTrip.itinerary.days.forEach((day, dayIndex) => {
          // Get all events for this day
          const dateString = day.date.split('T')[0];
          const dayEvents = events.filter(event => {
            const eventDate = new Date(event.start as string | Date);
            return eventDate.toISOString().split('T')[0] === dateString;
          });
          
          // Create a set of event time-activity keys
          const eventKeys = new Set<string>();
          dayEvents.forEach(event => {
            if (!event.start || !event.title) return;
            
            const eventDate = new Date(event.start as string | Date);
            const hours = eventDate.getHours().toString().padStart(2, '0');
            const minutes = eventDate.getMinutes().toString().padStart(2, '0');
            const timeString = `${hours}:${minutes}`;
            
            eventKeys.add(`${timeString}-${event.title}`);
          });
          
          // Filter out time slots that don't have corresponding events
          updatedTrip.itinerary.days[dayIndex].activities.timeSlots = day.activities.timeSlots.filter(slot => {
            return eventKeys.has(`${slot.time}-${slot.activity}`);
          });
        });
      }
      
      // Update the trip on the server
      await apiRequest(`/api/trips/${currentTrip.id}`, 
        JSON.stringify({
          method: "PATCH",
          body: JSON.stringify(updatedTrip)
        })
      );

      // Invalidate cache to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      
      toast({
        title: "Calendar Saved",
        description: "Your calendar events have been saved to the trip itinerary."
      });
      
      return true;
    } catch (error) {
      console.error("Error saving calendar events:", error);
      toast({
        title: "Error",
        description: "Failed to save calendar events. Please try again.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsSavingCalendarEvents(false);
    }
  };

  // Function to fetch weather data from our API
  const fetchWeatherData = useCallback(async (trip: Trip) => {
    if (!trip || !trip.itinerary || !trip.itinerary.days || trip.itinerary.days.length === 0) return;
    
    setIsLoadingWeather(true);
    setWeatherError(null);
    
    try {
      const forecasts: WeatherForecast[] = [];
      
      // Fetch weather for each day
      for (const day of trip.itinerary.days) {
        try {
          const response = await fetch(`/api/weather?location=${encodeURIComponent(trip.destination)}&date=${encodeURIComponent(day.date)}`);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch weather: ${response.statusText}`);
          }
          
          const weatherData = await response.json();
          
          // Determine icon based on weather description
          const isRainy = weatherData.precipitation_probability > 30;
          const isCloudy = weatherData.description.toLowerCase().includes('cloud') || 
                          weatherData.description.toLowerCase().includes('overcast');
          
          let icon: JSX.Element;
          if (isRainy) {
            icon = <CloudRain className="h-8 w-8 text-blue-500" />;
          } else if (isCloudy) {
            icon = <Cloud className="h-8 w-8 text-slate-500" />;
          } else {
            icon = <ThermometerSun className="h-8 w-8 text-yellow-500" />;
          }
          
          forecasts.push({
            date: day.date,
            dayOfWeek: day.dayOfWeek,
            high: Math.round(weatherData.temperature + 5),
            low: Math.round(weatherData.temperature - 5),
            description: weatherData.description,
            precipitation: weatherData.precipitation_probability,
            icon,
            warning: weatherData.warning
          });
        } catch (error) {
          console.error(`Error fetching weather for ${day.date}:`, error);
          
          // Add a placeholder for this day
          forecasts.push({
            date: day.date,
            dayOfWeek: day.dayOfWeek,
            high: 0,
            low: 0,
            description: "Weather data not available",
            precipitation: 0,
            icon: <Cloud className="h-8 w-8 text-slate-300" />
          });
        }
      }
      
      setWeatherForecasts(forecasts);
      setWeatherLastFetched(new Date());
    } catch (error) {
      console.error("Error fetching weather data:", error);
      setWeatherError("Failed to fetch weather data. Please try again later.");
    } finally {
      setIsLoadingWeather(false);
    }
  }, []);

  // Helper function to get weather forecasts
  const getWeatherForecasts = (trip: Trip | undefined): WeatherForecast[] => {
    // If we have fresh weather data (fetched in the last hour), use it
    if (weatherLastFetched && weatherForecasts.length > 0 && 
        differenceInMinutes(new Date(), weatherLastFetched) < 60) {
      return weatherForecasts;
    }
    
    if (!trip || !trip.itinerary || !trip.itinerary.days) return [];
    
    // Otherwise use the existing data from aiSuggestions as a fallback
    return trip.itinerary.days.map(day => {
      const weatherContext = day.aiSuggestions?.weatherContext;
      
      // If we have weather data from AI suggestions, use it
      if (weatherContext) {
        const isRainy = weatherContext.precipitation_probability > 30;
        const isCloudy = weatherContext.description.toLowerCase().includes('cloud') || 
                         weatherContext.description.toLowerCase().includes('overcast');
        
        let icon: JSX.Element;
        if (isRainy) {
          icon = <CloudRain className="h-8 w-8 text-blue-500" />;
        } else if (isCloudy) {
          icon = <Cloud className="h-8 w-8 text-slate-500" />;
        } else {
          icon = <ThermometerSun className="h-8 w-8 text-yellow-500" />;
        }
        
        return {
          date: day.date,
          dayOfWeek: day.dayOfWeek,
          high: Math.round(weatherContext.temperature + 5),
          low: Math.round(weatherContext.temperature - 5),
          description: weatherContext.description,
          precipitation: weatherContext.precipitation_probability,
          icon
        };
      }
      
      // Fallback with placeholder
      return {
        date: day.date,
        dayOfWeek: day.dayOfWeek,
        high: 0,
        low: 0,
        description: "Weather data not available",
        precipitation: 0,
        icon: <Cloud className="h-8 w-8 text-slate-300" />
      };
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  if (!trips || trips.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <p className="text-muted-foreground mb-4">No trips planned yet</p>
              <Button variant="outline" asChild>
                <Link href="/plan-trip">Plan Your First Trip</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center mb-8 space-x-4">
          <h1 className="text-3xl font-bold flex-grow">
            {currentTrip ? currentTrip.title : "My Trips"}
          </h1>
          <Select value={selectedTripId?.toString()} onValueChange={handleTripSelect}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select a trip" />
            </SelectTrigger>
            <SelectContent>
              {trips.map((trip) => (
                <SelectItem key={trip.id} value={trip.id.toString()}>
                  {trip.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {currentTrip && (
            <Button
              variant="outline"
              onClick={() => archiveMutation.mutate(currentTrip.id)}
              disabled={archiveMutation.isPending}
              title="Archive this trip"
            >
              {archiveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Archive className="h-4 w-4 mr-2" />
              )}
              Archive Trip
            </Button>
          )}
        </div>
        
        {currentTrip && (
          <div className="grid grid-cols-12 gap-6">
            {/* Left Sidebar */}
            <div className="col-span-12 md:col-span-3">
              <Card>
                <CardContent className="p-0">
                  <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    orientation="vertical"
                    className="w-full"
                  >
                    <TabsList className="flex flex-col items-stretch h-auto w-full space-y-1 rounded-none p-0">
                      <TabsTrigger value="itinerary" className="justify-start px-5 py-3 text-left">
                        <CalendarIcon className="h-5 w-5 mr-2" />
                        Itinerary
                      </TabsTrigger>
                      <TabsTrigger value="weather" className="justify-start px-5 py-3 text-left">
                        <ThermometerSun className="h-5 w-5 mr-2" />
                        Weather
                      </TabsTrigger>
                      <TabsTrigger value="calendar" className="justify-start px-5 py-3 text-left">
                        <CalendarIcon className="h-5 w-5 mr-2" />
                        Calendar
                      </TabsTrigger>
                      <TabsTrigger value="maps" className="justify-start px-5 py-3 text-left">
                        <MapIcon className="h-5 w-5 mr-2" />
                        Maps
                      </TabsTrigger>
                      <TabsTrigger value="advisor" className="justify-start px-5 py-3 text-left">
                        <HeadphonesIcon className="h-5 w-5 mr-2" />
                        Travel Advisor
                      </TabsTrigger>
                      <TabsTrigger value="booking" className="justify-start px-5 py-3 text-left">
                        <CreditCard className="h-5 w-5 mr-2" />
                        Book Now
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
            
            {/* Main Content */}
            <div className="col-span-12 md:col-span-9">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="hidden">
                  <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
                  <TabsTrigger value="weather">Weather</TabsTrigger>
                  <TabsTrigger value="calendar">Calendar</TabsTrigger>
                  <TabsTrigger value="maps">Maps</TabsTrigger>
                  <TabsTrigger value="advisor">Advisor</TabsTrigger>
                  <TabsTrigger value="booking">Booking</TabsTrigger>
                </TabsList>
                <TabsContent value="itinerary" className="mt-0">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Trip Itinerary</CardTitle>
                        <CardDescription>
                          {currentTrip.destination} - {currentTrip.itinerary?.days?.length || 0} days
                        </CardDescription>
                      </div>
                      <Button variant="outline" onClick={() => generatePDF(currentTrip)}>
                        Download PDF
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {currentTrip.itinerary?.days && (
                        <div className="space-y-6">
                          {currentTrip.itinerary.days.map((day, dayIndex) => (
                            <div key={dayIndex} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">
                                  {day.dayOfWeek} - {format(parseISO(day.date), "MMM d, yyyy")}
                                </h3>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAddActivity(currentTrip.id, dayIndex)}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add Activity
                                </Button>
                              </div>
                              
                              {/* Weather context if available */}
                              {day.aiSuggestions?.weatherContext && (
                                <div className="flex items-center gap-2 mb-4 text-sm bg-muted/50 p-2 rounded">
                                  <ThermometerSun className="h-4 w-4 text-orange-500" />
                                  <span>{Math.round(day.aiSuggestions.weatherContext.temperature)}°F</span>
                                  <CloudRain className="h-4 w-4 text-blue-500 ml-2" />
                                  <span>{Math.round(day.aiSuggestions.weatherContext.precipitation_probability)}%</span>
                                  <span className="ml-2">{day.aiSuggestions.weatherContext.description}</span>
                                </div>
                              )}
                              
                              {/* Activities */}
                              <div className="space-y-3">
                                {day.activities.timeSlots.length === 0 ? (
                                  <p className="text-muted-foreground text-sm italic">No activities planned yet</p>
                                ) : (
                                  day.activities.timeSlots.map((slot, slotIndex) => (
                                    <div key={slotIndex} className="flex items-start justify-between p-3 bg-background rounded border">
                                      <div className="flex items-start space-x-4">
                                        <div className="min-w-[60px] text-sm font-medium">
                                          {slot.time}
                                        </div>
                                        <div>
                                          <h4 className="font-medium">{slot.activity}</h4>
                                          {slot.location && (
                                            <div className="flex items-center text-sm text-muted-foreground mt-1">
                                              <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                                              {slot.location}
                                            </div>
                                          )}
                                          {slot.notes && (
                                            <p className="text-sm mt-1 text-muted-foreground">{slot.notes}</p>
                                          )}
                                          {slot.url && (
                                            <a 
                                              href={slot.url} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="flex items-center text-sm text-blue-500 mt-1"
                                            >
                                              <LinkIcon className="h-3 w-3 mr-1" /> 
                                              More info
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditActivity(currentTrip.id, dayIndex, slotIndex, slot)}
                                      >
                                        <Edit className="h-4 w-4" />
                                        <span className="sr-only">Edit</span>
                                      </Button>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="weather" className="mt-0">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Weather Forecast</CardTitle>
                        <CardDescription>
                          {currentTrip.destination} - {format(parseISO(currentTrip.itinerary?.days?.[0]?.date || new Date().toISOString()), "MMM yyyy")}
                        </CardDescription>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => fetchWeatherData(currentTrip)}
                        disabled={isLoadingWeather}
                      >
                        {isLoadingWeather ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Cloud className="h-4 w-4 mr-2" />
                            Update Forecast
                          </>
                        )}
                      </Button>
                    </CardHeader>
                    
                    {/* Trip Status Alert - If trip is in the past */}
                    {isTripInPast(currentTrip) && !tripCompleted && (
                      <Alert className="mx-6 mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Trip Dates Have Passed</AlertTitle>
                        <AlertDescription>
                          This trip's dates are in the past. Would you like to update the dates or mark it as complete?
                        </AlertDescription>
                        <div className="flex gap-2 mt-3">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setActiveTab("itinerary");
                              // Future implementation: Will add date edit functionality
                            }}
                          >
                            <Calendar className="h-4 w-4 mr-2" />
                            Change Dates
                          </Button>
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={handleMarkTripComplete}
                            disabled={isMarkingComplete}
                          >
                            {isMarkingComplete ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                            )}
                            Mark as Complete
                          </Button>
                        </div>
                      </Alert>
                    )}
                    
                    {/* Trip Completed Status */}
                    {tripCompleted && (
                      <Alert className="mx-6 mt-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <AlertTitle>Trip Completed</AlertTitle>
                        <AlertDescription>
                          This trip has been marked as complete. We hope you had a great time!
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <CardContent className="pt-6">
                      {weatherError && (
                        <Alert variant="destructive" className="mb-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Error</AlertTitle>
                          <AlertDescription>{weatherError}</AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {getWeatherForecasts(currentTrip).map((forecast, index) => (
                          <Card key={index} className="overflow-hidden">
                            <CardHeader className="p-4 pb-2">
                              <div className="flex justify-between items-center">
                                <div>
                                  <CardTitle className="text-base">
                                    {forecast.dayOfWeek || format(parseISO(forecast.date), "EEEE")}
                                  </CardTitle>
                                  <CardDescription>
                                    {format(parseISO(forecast.date), "MMMM d, yyyy")}
                                  </CardDescription>
                                </div>
                                <div className="text-right">
                                  {forecast.icon}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                              <div className="flex flex-col space-y-1 mt-2">
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Temperature</span>
                                  <span className="text-sm font-medium">
                                    {forecast.high}°F / {forecast.low}°F
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Precipitation</span>
                                  <span className="text-sm font-medium">{forecast.precipitation}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Conditions</span>
                                  <span className="text-sm font-medium">{forecast.description}</span>
                                </div>
                              </div>
                              
                              {forecast.warning && (
                                <Alert variant="destructive" className="mt-3 py-2 px-3">
                                  <AlertCircle className="h-3 w-3" />
                                  <AlertDescription className="text-xs">
                                    {forecast.warning}
                                  </AlertDescription>
                                </Alert>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="calendar" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Calendar</CardTitle>
                      <CardDescription>
                        View and edit your trip events in calendar format. Drag & drop to rearrange activities.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {currentTrip && currentTrip.itinerary?.days ? (
                        <PremiumFeature feature="adjustable-calendar" fallback={
                          <div className="space-y-4">
                            <div className="relative bg-muted/30 p-4 rounded-lg opacity-50 pointer-events-none">
                              <TripCalendar 
                                tripDays={currentTrip.itinerary.days}
                                onSaveEvents={handleSaveCalendarEvents}
                                tripStartDate={currentTrip.startDate || currentTrip.itinerary.days[0].date}
                                tripEndDate={currentTrip.endDate || currentTrip.itinerary.days[currentTrip.itinerary.days.length-1].date}
                              />
                            </div>
                          </div>
                        }>
                          <TripCalendar 
                            tripDays={currentTrip.itinerary.days}
                            onSaveEvents={handleSaveCalendarEvents}
                            tripStartDate={currentTrip.startDate || currentTrip.itinerary.days[0].date}
                            tripEndDate={currentTrip.endDate || currentTrip.itinerary.days[currentTrip.itinerary.days.length-1].date}
                          />
                        </PremiumFeature>
                      ) : (
                        <div className="flex items-center justify-center h-64">
                          <p className="text-muted-foreground">No trip details available</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="maps" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Trip Map</CardTitle>
                      <CardDescription>Interactive map of your trip locations</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[500px]">
                        {currentTrip.itinerary?.days && (
                          <PremiumFeature feature="maps">
                            <TripMap
                              activities={currentTrip.itinerary.days.flatMap(day =>
                                day.activities.timeSlots.map(slot => ({
                                  activity: slot.activity,
                                  location: slot.location
                                }))
                              )}
                              accommodation={currentTrip.itinerary.days[0].accommodation}
                            />
                          </PremiumFeature>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="advisor" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Travel Advisor</CardTitle>
                      <CardDescription>Get personalized travel recommendations from our AI assistant</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {currentTrip ? (
                        <PremiumFeature feature="ai-chatbot">
                          {/* Import AIChatPlanner at the top of the file */}
                          <div className="h-[500px]">
                            <AIChatPlanner 
                              tripId={currentTrip.id} 
                              destination={currentTrip.destination}
                              onPlanCreated={(plan) => {
                                // Handle plan created by AI
                                toast({
                                  title: "Plan Created",
                                  description: "AI has created a travel plan for you!"
                                });
                                // We would update the trip with the plan here
                                queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
                              }}
                            />
                          </div>
                        </PremiumFeature>
                      ) : (
                        <div className="flex items-center justify-center p-12">
                          <p className="text-muted-foreground">Select a trip to use the AI Travel Advisor</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="booking" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Book Your Trip</CardTitle>
                      <CardDescription>Find and book flights, hotels, and activities</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-center p-12">
                        <p className="text-muted-foreground">Booking functionality will be coming soon</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </main>
      
      {/* Edit Activity Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
            <DialogDescription>
              Make changes to the activity details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="time" className="text-right">
                Time
              </Label>
              <Input
                id="time"
                type="time"
                value={editedActivity?.time ?? ""}
                onChange={(e) => setEditedActivity({ ...editedActivity, time: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="activity" className="text-right">
                Activity
              </Label>
              <Input
                id="activity"
                value={editedActivity?.activity ?? ""}
                onChange={(e) => setEditedActivity({ ...editedActivity, activity: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="location" className="text-right">
                Location
              </Label>
              <Input
                id="location"
                value={editedActivity?.location ?? ""}
                onChange={(e) => setEditedActivity({ ...editedActivity, location: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="duration" className="text-right">
                Duration
              </Label>
              <Input
                id="duration"
                value={editedActivity?.duration ?? ""}
                onChange={(e) => setEditedActivity({ ...editedActivity, duration: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="url" className="text-right">
                URL
              </Label>
              <Input
                id="url"
                value={editedActivity?.url ?? ""}
                onChange={(e) => setEditedActivity({ ...editedActivity, url: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={editedActivity?.notes ?? ""}
                onChange={(e) => setEditedActivity({ ...editedActivity, notes: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditedActivity}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add New Activity Dialog */}
      <Dialog open={showAddActivityDialog} onOpenChange={setShowAddActivityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Activity</DialogTitle>
            <DialogDescription>
              Enter details for a new activity.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-time" className="text-right">
                Time
              </Label>
              <Input
                id="new-time"
                type="time"
                value={newActivity.time}
                onChange={(e) => setNewActivity({ ...newActivity, time: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-activity" className="text-right">
                Activity
              </Label>
              <Input
                id="new-activity"
                value={newActivity.activity}
                onChange={(e) => setNewActivity({ ...newActivity, activity: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-location" className="text-right">
                Location
              </Label>
              <Input
                id="new-location"
                value={newActivity.location}
                onChange={(e) => setNewActivity({ ...newActivity, location: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-duration" className="text-right">
                Duration
              </Label>
              <Input
                id="new-duration"
                value={newActivity.duration}
                onChange={(e) => setNewActivity({ ...newActivity, duration: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-url" className="text-right">
                URL
              </Label>
              <Input
                id="new-url"
                value={newActivity.url}
                onChange={(e) => setNewActivity({ ...newActivity, url: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-notes" className="text-right">
                Notes
              </Label>
              <Textarea
                id="new-notes"
                value={newActivity.notes}
                onChange={(e) => setNewActivity({ ...newActivity, notes: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddActivityDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNewActivity}>Add Activity</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}