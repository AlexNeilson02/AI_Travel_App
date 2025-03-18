import Nav from "@/components/Nav";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Trip } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, DollarSign, MapPin, Trash2, Download, ChevronDown, ChevronUp, Edit2 } from "lucide-react";
import { format } from "date-fns";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import React, { useState } from "react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TripDay {
  date: string;
  activities: {
    timeSlots: Array<{
      time: string;
      activity: string;
      location: string;
      duration: string;
      notes: string;
      isEdited: boolean;
      url?: string;
    }>;
  };
  aiSuggestions: {
    reasoning: string;
    weatherContext?: {
      description: string;
      temperature: number;
      precipitation_probability: number;
      is_suitable_for_outdoor: boolean;
    };
    alternativeActivities: string[];
  };
  userFeedback?: string;
  isFinalized: boolean;
}

export default function MyTrips() {
  const { toast } = useToast();
  const [expandedTrip, setExpandedTrip] = useState<number | null>(null);
  const [editingTrip, setEditingTrip] = useState<number | null>(null);
  const [editData, setEditData] = useState<{
    activity?: string;
    location?: string;
    time?: string;
    duration?: string;
  }>({});

  const { data: trips, isLoading } = useQuery<Trip[]>({
    queryKey: ["/api/trips"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (tripId: number) => {
      await apiRequest("DELETE", `/api/trips/${tripId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      toast({
        title: "Success",
        description: "Trip deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateActivityMutation = useMutation({
    mutationFn: async ({
      tripId,
      dayId,
      slotIndex,
      updates
    }: {
      tripId: number;
      dayId: number;
      slotIndex: number;
      updates: any;
    }) => {
      await apiRequest("PATCH", `/api/trips/${tripId}/days/${dayId}/activities/${slotIndex}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      setEditingTrip(null);
      toast({
        title: "Success",
        description: "Activity updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generatePDF = async (tripId: number) => {
    try {
      const response = await apiRequest("GET", `/api/trips/${tripId}`);
      const tripData = await response.json();

      const pdf = new jsPDF();
      let yPos = 20;
      const lineHeight = 10;

      // Title and Basic Info
      pdf.setFontSize(20);
      pdf.text(tripData.title, 20, yPos);
      yPos += lineHeight * 2;

      pdf.setFontSize(12);
      pdf.text(`Destination: ${tripData.destination}`, 20, yPos);
      yPos += lineHeight;
      pdf.text(`Dates: ${format(new Date(tripData.startDate), "MMM d")} - ${format(new Date(tripData.endDate), "MMM d, yyyy")}`, 20, yPos);
      yPos += lineHeight;
      pdf.text(`Budget: $${tripData.budget}`, 20, yPos);
      yPos += lineHeight * 2;

      // Preferences
      pdf.setFontSize(16);
      pdf.text("Trip Preferences", 20, yPos);
      yPos += lineHeight;
      pdf.setFontSize(12);

      if (tripData.preferences) {
        const preferences = [
          { label: "Accommodation", items: tripData.preferences.accommodationType },
          { label: "Activities", items: tripData.preferences.activityTypes },
          { label: "Activity Frequency", items: [tripData.preferences.activityFrequency] },
          { label: "Must-See Attractions", items: tripData.preferences.mustSeeAttractions },
        ];

        preferences.forEach(pref => {
          if (pref.items && pref.items.length > 0) {
            if (yPos > 270) {
              pdf.addPage();
              yPos = 20;
            }
            pdf.text(`${pref.label}: ${pref.items.join(", ")}`, 20, yPos);
            yPos += lineHeight;
          }
        });
      }
      yPos += lineHeight;

      // Itinerary
      if (tripData.tripDays && tripData.tripDays.length > 0) {
        pdf.setFontSize(16);
        pdf.text("Daily Itinerary", 20, yPos);
        yPos += lineHeight;
        pdf.setFontSize(12);

        tripData.tripDays.forEach((day: any) => {
          if (yPos > 270) {
            pdf.addPage();
            yPos = 20;
          }

          // Day header
          pdf.setFontSize(14);
          pdf.text(format(new Date(day.date), "EEEE, MMMM d, yyyy"), 20, yPos);
          yPos += lineHeight;
          pdf.setFontSize(12);

          day.activities.timeSlots.forEach((slot: any) => {
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

      pdf.save(`${tripData.title.replace(/\s+/g, '_')}_itinerary.pdf`);

      toast({
        title: "Success",
        description: "Trip details downloaded as PDF",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (tripId: number, dayId: number, slotIndex: number, currentData: any) => {
    setEditingTrip(tripId);
    setEditData({
      activity: currentData.activity,
      location: currentData.location,
      time: currentData.time,
      duration: currentData.duration,
    });
  };

  const handleSave = (tripId: number, dayId: number, slotIndex: number) => {
    updateActivityMutation.mutate({
      tripId,
      dayId,
      slotIndex,
      updates: editData,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Trips</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : !trips?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <p className="text-muted-foreground mb-4">No trips planned yet</p>
              <Button variant="outline" asChild>
                <Link href="/plan">Plan Your First Trip</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <Card key={trip.id} className="relative">
                <div className="absolute top-4 right-4 flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Trip</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this trip? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(trip.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <CardHeader>
                  <CardTitle className="flex items-center justify-between pr-12">
                    <span className="hover:underline cursor-pointer" onClick={() => setExpandedTrip(expandedTrip === trip.id ? null : trip.id)}>
                      {trip.title}
                    </span>
                    <button onClick={() => setExpandedTrip(expandedTrip === trip.id ? null : trip.id)}>
                      {expandedTrip === trip.id ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2" />
                      {trip.destination}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      {format(new Date(trip.startDate), "MMM d")} -{" "}
                      {format(new Date(trip.endDate), "MMM d, yyyy")}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Budget: ${trip.budget}
                    </div>

                    {expandedTrip === trip.id && trip.itinerary?.days && (
                      <div className="mt-4 space-y-4">
                        <h3 className="font-medium">Itinerary</h3>
                        {trip.itinerary.days.map((day: TripDay, dayIndex: number) => (
                          <div key={dayIndex} className="border rounded-lg p-4">
                            <h4 className="font-medium mb-2">
                              {format(new Date(day.date), "EEEE, MMMM d")}
                            </h4>
                            {day.activities.timeSlots.map((slot, slotIndex) => (
                              <div key={slotIndex} className="ml-4 mb-2">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-medium">{slot.time}</p>
                                    <p>{slot.activity}</p>
                                    {slot.location && (
                                      <p className="text-sm text-muted-foreground">
                                        Location: {slot.location}
                                      </p>
                                    )}
                                    {slot.duration && (
                                      <p className="text-sm text-muted-foreground">
                                        Duration: {slot.duration}
                                      </p>
                                    )}
                                    {slot.notes && (
                                      <p className="text-sm text-muted-foreground">
                                        Notes: {slot.notes}
                                      </p>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEdit(trip.id, dayIndex, slotIndex, slot)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => generatePDF(trip.id)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}