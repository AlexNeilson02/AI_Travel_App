import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Trip, Location, TripLocation } from "@shared/schema";
import { Nav } from "@/components/ui/nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { WalkAroundMap } from "@/components/WalkAroundMap";

interface ExtendedTrip extends Trip {
  locations?: (Location & { tripLocation: TripLocation })[];
}

export default function WalkAround() {
  const params = useParams();
  const tripId = params?.id;

  const { data: trip, isLoading } = useQuery<ExtendedTrip>({
    queryKey: ["/api/trips", tripId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/trips/${tripId}`);
      const data = await response.json();
      return data;
    },
    enabled: !!tripId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <main className="container max-w-6xl mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <main className="container max-w-6xl mx-auto px-4 py-8">
          <Button variant="ghost" className="mb-4" asChild>
            <Link href="/my-trips">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to My Trips
            </Link>
          </Button>
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <p className="text-muted-foreground">Trip not found</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="container max-w-6xl mx-auto px-4 py-8">
        <Button variant="ghost" className="mb-4" asChild>
          <Link href={`/trip/${tripId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Trip Details
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Walk Around</CardTitle>
            <p className="text-muted-foreground">
              Explore nearby attractions and your trip locations. Use your current location to discover interesting places around you.
            </p>
          </CardHeader>
          <CardContent>
            <WalkAroundMap
              tripId={tripId!}
              locations={trip.locations || []}
              onPlaceSelect={(place) => {
                // Handle adding place to itinerary
                console.log('Selected place:', place);
              }}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}