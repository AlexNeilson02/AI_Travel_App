
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

      // Title
      pdf.setFontSize(20);
      pdf.text(tripData.title, 20, yPos);
      yPos += lineHeight * 2;

      // Basic Info
      pdf.setFontSize(12);
      pdf.text(`Destination: ${tripData.destination}`, 20, yPos);
      yPos += lineHeight;
      pdf.text(`Dates: ${format(new Date(tripData.startDate), "MMM d")} - ${format(new Date(tripData.endDate), "MMM d, yyyy")}`, 20, yPos);
      yPos += lineHeight;
      pdf.text(`Budget: $${tripData.budget}`, 20, yPos);
      yPos += lineHeight * 2;

      // Preferences
      pdf.setFontSize(16);
      pdf.text("Preferences", 20, yPos);
      yPos += lineHeight;
      pdf.setFontSize(12);

      const preferences = [
        { label: "Accommodation Types", values: tripData.preferences.accommodationType },
        { label: "Activity Types", values: tripData.preferences.activityTypes },
        { label: "Activity Frequency", values: [tripData.preferences.activityFrequency] },
        { label: "Must-See Attractions", values: tripData.preferences.mustSeeAttractions },
        { label: "Transportation", values: tripData.preferences.transportationPreferences },
      ];

      preferences.forEach(pref => {
        if (pref.values && pref.values.length > 0) {
          if (yPos > 270) {
            pdf.addPage();
            yPos = 20;
          }
          pdf.text(`${pref.label}: ${pref.values.join(", ")}`, 20, yPos);
          yPos += lineHeight;
        }
      });
      yPos += lineHeight;

      // Daily Itinerary
      if (tripData.tripDays && tripData.tripDays.length > 0) {
        pdf.setFontSize(16);
        pdf.text("Daily Itinerary", 20, yPos);
        yPos += lineHeight * 1.5;
        pdf.setFontSize(12);

        tripData.tripDays.forEach((day: any) => {
          if (yPos > 270) {
            pdf.addPage();
            yPos = 20;
          }

          // Date header
          pdf.setFontSize(14);
          pdf.text(format(new Date(day.date), "EEEE, MMMM d, yyyy"), 20, yPos);
          yPos += lineHeight;
          pdf.setFontSize(12);

          // Activities
          day.activities.timeSlots.forEach((slot: any) => {
            if (yPos > 270) {
              pdf.addPage();
              yPos = 20;
            }
            
            pdf.text(`${slot.time} - ${slot.activity}`, 20, yPos);
            yPos += lineHeight;
            
            if (slot.location) {
              pdf.text(`Location: ${slot.location}`, 30, yPos);
              yPos += lineHeight;
            }
            
            if (slot.notes) {
              pdf.text(`Notes: ${slot.notes}`, 30, yPos);
              yPos += lineHeight;
            }
            
            yPos += lineHeight / 2;
          });
          
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
      console.error('PDF generation error:', error);
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
          <Button asChild>
            <Link href="/plan">Plan a New Trip</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : !trips || trips.length === 0 ? (
          <div className="text-center py-16">
            <h2 className="text-xl font-medium mb-4">No trips found</h2>
            <p className="text-muted-foreground mb-8">
              Start planning your next adventure!
            </p>
            <Button asChild>
              <Link href="/plan">Plan a Trip</Link>
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <Card key={trip.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="flex justify-between items-start">
                    <span>{trip.title}</span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Are you sure you want to delete this trip?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(trip.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardTitle>
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2" />
                    {trip.destination}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      <div>
                        <span className="font-medium">
                          {format(new Date(trip.startDate), "MMM d")} -{" "}
                          {format(new Date(trip.endDate), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center text-sm">
                      <DollarSign className="h-4 w-4 mr-2" />
                      <span className="font-medium">${trip.budget}</span>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        className="flex-1"
                        asChild
                      >
                        <Link href={`/trip/${trip.id}`}>View</Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1" 
                        onClick={() => generatePDF(trip.id)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        PDF
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
