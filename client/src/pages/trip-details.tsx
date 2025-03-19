import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Trip } from "@shared/schema";
import Nav from "@/components/Nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  DollarSign,
  MapPin,
  ArrowLeft,
  ExternalLink,
  CloudRain,
  ThermometerSun,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import TripMap from "@/components/TripMap";

interface ExtendedTrip extends Trip {
  tripDays?: any[];
}

export default function TripDetails() {
  const params = useParams();
  const tripId = params?.id;

  const { data: trip, isLoading } = useQuery<ExtendedTrip>({
    queryKey: ["/api/trips", tripId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/trips/${tripId}`);
      const data = await response.json();
      console.log('Trip data:', data); // Debug log
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

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">{trip.title}</CardTitle>
            <div className="flex items-center text-muted-foreground">
              <MapPin className="h-4 w-4 mr-2" />
              {trip.destination}
            </div>
          </CardHeader>
          <CardContent>
            {trip.itinerary?.days && trip.itinerary.days.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium mb-2">Trip Map</h3>
                <TripMap
                  activities={trip.itinerary.days.flatMap(day =>
                    day.activities.timeSlots.map(slot => ({
                      activity: slot.activity,
                      location: slot.location
                    }))
                  )}
                  accommodation={trip.itinerary.days[0].accommodation}
                />
              </div>
            )}

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
                    {trip.tripDays.map((day: any) => (
                      <Card key={day.id}>
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                            <div className="flex flex-col gap-2 w-full">
                              <h4 className="font-medium">
                                {format(new Date(day.date), "EEEE, MMMM d, yyyy")}
                              </h4>
                              {day.aiSuggestions?.weatherContext && (
                                <div className="flex items-center gap-4 text-base bg-muted p-3 rounded-lg w-full">
                                  <div className="flex items-center gap-2">
                                    <ThermometerSun className="h-5 w-5 text-orange-500" />
                                    <span className="font-medium">
                                      {Math.round(day.aiSuggestions.weatherContext.temperature)}°F
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <CloudRain className="h-5 w-5 text-blue-500" />
                                    <span className="font-medium">
                                      {Math.round(day.aiSuggestions.weatherContext.precipitation_probability)}%
                                    </span>
                                  </div>
                                  <span className="text-muted-foreground">
                                    {day.aiSuggestions.weatherContext.description}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {day.aiSuggestions?.weatherContext && !day.aiSuggestions.weatherContext.is_suitable_for_outdoor && (
                            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-900/50">
                              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="font-medium">Weather Advisory</span>
                              </div>
                              <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                                Weather conditions may not be suitable for outdoor activities.
                                {day.aiSuggestions.alternativeActivities?.length > 0 && (
                                  <>
                                    <br />
                                    Consider these indoor alternatives: {day.aiSuggestions.alternativeActivities.join(", ")}.
                                  </>
                                )}
                              </p>
                            </div>
                          )}

                          <div className="space-y-2">
                            {day.activities.timeSlots.map((slot: any, index: number) => (
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