import { Nav } from "@/components/ui/nav";
import { useQuery } from "@tanstack/react-query";
import { Trip } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, DollarSign, MapPin, Trash2, Download } from "lucide-react";
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
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import React from "react";
import { Link } from "wouter";

export default function MyTrips() {
  const { toast } = useToast();

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

      // Daily Itinerary
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

          // Weather information if available
          if (day.aiSuggestions.weatherContext) {
            const weather = day.aiSuggestions.weatherContext;
            pdf.text(`Weather: ${weather.description}, ${Math.round(weather.temperature)}°F, ${Math.round(weather.precipitation_probability)}% precipitation`, 30, yPos);
            yPos += lineHeight;
          }

          // Activities
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
            if (slot.duration) {
              pdf.text(`  Duration: ${slot.duration}`, 35, yPos);
              yPos += lineHeight;
            }
          });

          // Alternative activities if weather is not suitable
          if (day.aiSuggestions.weatherContext && !day.aiSuggestions.weatherContext.is_suitable_for_outdoor &&
              day.aiSuggestions.alternativeActivities.length > 0) {
            if (yPos > 270) {
              pdf.addPage();
              yPos = 20;
            }
            pdf.text("Alternative Indoor Activities:", 30, yPos);
            yPos += lineHeight;
            day.aiSuggestions.alternativeActivities.forEach((alt: string) => {
              pdf.text(`• ${alt}`, 35, yPos);
              yPos += lineHeight;
            });
          }

          yPos += lineHeight;
        });
      }

      // Download the PDF
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
                <div className="absolute top-4 right-4">
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
                  <CardTitle>
                    <button
                      onClick={() => generatePDF(trip.id)}
                      className="hover:underline text-left"
                    >
                      {trip.title}
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