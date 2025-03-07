import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Trip, TripDay } from "@shared/schema";
import { Nav } from "@/components/ui/nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, DollarSign, MapPin, ArrowLeft, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";

interface ExtendedTrip extends Trip {
  tripDays?: TripDay[];
}

export default function TripDetails() {
  const params = useParams();
  const tripId = params?.id;

  const { data: trip, isLoading } = useQuery<ExtendedTrip>({
    queryKey: ["/api/trips", tripId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/trips/${tripId}`);
      const data = await response.json();
      console.log("Fetched trip data:", data);
      return data;
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

  const preferencesList = [
    { label: "Accommodation Types", value: trip.preferences.accommodationType },
    { label: "Activity Types", value: trip.preferences.activityTypes },
    { label: "Activity Frequency", value: [trip.preferences.activityFrequency] },
    { label: "Must-See Attractions", value: trip.preferences.mustSeeAttractions },
    { label: "Dietary Restrictions", value: trip.preferences.dietaryRestrictions },
    { label: "Transportation", value: trip.preferences.transportationPreferences },
  ];

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
                <div className="space-y-2">
                  {preferencesList.map((pref, index) => (
                    pref.value && pref.value.length > 0 && (
                      <div key={index}>
                        <span className="text-sm text-muted-foreground">{pref.label}:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {pref.value.map((item: string, i: number) => (
                            <span
                              key={i}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>

              {trip.tripDays && trip.tripDays.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Daily Itinerary</h3>
                  <div className="space-y-4">
                    {trip.tripDays.map((day) => (
                      <Card key={day.id}>
                        <CardContent className="p-4">
                          <h4 className="font-medium mb-2">
                            {format(new Date(day.date), "EEEE, MMMM d, yyyy")}
                          </h4>
                          <div className="space-y-2">
                            {day.activities.timeSlots.map((slot, index) => (
                              <div key={index} className="flex justify-between items-start border-b border-border pb-2 last:border-0 last:pb-0">
                                <div>
                                  <div className="font-medium flex items-center gap-2">
                                    {slot.activity}
                                    {slot.url && (
                                      <a
                                        href={slot.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center hover:text-primary"
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                      </a>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {slot.time} • {slot.duration}
                                  </div>
                                  {slot.location && (
                                    <div className="text-sm text-muted-foreground">
                                      Location: {slot.location}
                                    </div>
                                  )}
                                  {slot.notes && (
                                    <div className="text-sm mt-1">{slot.notes}</div>
                                  )}
                                </div>
                                {slot.isEdited && (
                                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                    Modified
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}