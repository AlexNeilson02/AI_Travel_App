import { Nav } from "@/components/ui/nav";
import { useQuery } from "@tanstack/react-query";
import { Trip } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, DollarSign, MapPin, Trash2 } from "lucide-react";
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

  // Function to prefetch trip details
  const prefetchTripDetails = (tripId: number) => {
    queryClient.prefetchQuery({
      queryKey: ["/api/trips", tripId.toString()],
      queryFn: async () => {
        const response = await apiRequest("GET", `/api/trips/${tripId}`);
        return response.json();
      }
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
                    <Link 
                      href={`/trip/${trip.id}`}
                      onMouseEnter={() => prefetchTripDetails(trip.id)}
                    >
                      {trip.title}
                    </Link>
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
                        asChild
                        onMouseEnter={() => prefetchTripDetails(trip.id)}
                      >
                        <Link href={`/trip/${trip.id}`}>View Details</Link>
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