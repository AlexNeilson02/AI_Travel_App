import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Trip } from "@shared/schema";
import { Nav } from "@/components/ui/nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, DollarSign, MapPin, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

export default function TripDetails() {
  const params = useParams();
  const tripId = params?.id;

  const { data: trip, isLoading } = useQuery<Trip>({
    queryKey: ["/api/trips/:id", tripId],
    queryFn: async () => {
      const response = await fetch(`/api/trips/${tripId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch trip details');
      }
      return response.json();
    },
    enabled: !!tripId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <main className="container max-w-4xl mx-auto px-4 py-8">
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
        <main className="container max-w-4xl mx-auto px-4 py-8">
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
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" className="mb-4" asChild>
          <Link href="/my-trips">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to My Trips
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{trip.title}</CardTitle>
            <div className="flex items-center text-muted-foreground">
              <MapPin className="h-4 w-4 mr-2" />
              {trip.destination}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Trip Details</h3>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    <div>
                      <div>Start: {format(new Date(trip.startDate), "PPP")}</div>
                      <div>End: {format(new Date(trip.endDate), "PPP")}</div>
                    </div>
                  </div>
                  <div className="flex items-center text-sm">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Budget: ${trip.budget}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Preferences</h3>
                <div className="flex flex-wrap gap-2">
                  {(trip.preferences as string[]).map((preference, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                    >
                      {preference}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Activities</h3>
                <div className="grid gap-4">
                  {(trip.activities as any[]).map((activity, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{activity.name}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              Duration: {activity.duration}
                            </p>
                          </div>
                          <div className="text-sm font-medium">
                            ${activity.cost}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}