import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Trip } from "@shared/schema";
import { Nav } from "@/components/ui/nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, DollarSign, MapPin, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

export default function TripDetails() {
  const params = useParams();
  const id = params?.id;

  const { data: trip, isLoading } = useQuery<Trip>({
    queryKey: [`/api/trips/${id}`],
    enabled: !!id,
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="flex-1 container max-w-screen-lg py-8">
        <Button variant="ghost" className="mb-4" asChild>
          <a href="/my-trips">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to My Trips
          </a>
        </Button>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : !trip ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <p className="text-muted-foreground">Trip not found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{trip.title}</CardTitle>
                <div className="flex items-center text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-2" />
                  {trip.destination}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-2">Trip Details</h3>
                    <div className="space-y-4">
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 mr-2" />
                        <div>
                          <div>Start: {format(new Date(trip.startDate), "MMM d, yyyy")}</div>
                          <div>End: {format(new Date(trip.endDate), "MMM d, yyyy")}</div>
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
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/80 text-secondary-foreground"
                        >
                          {preference}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="font-medium mb-2">Activities</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    {(trip.activities as any[]).map((activity, index) => (
                      <Card key={index} className="overflow-hidden">
                        <CardContent className="p-4">
                          <h4 className="font-medium">{activity.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}