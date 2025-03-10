import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Trip, TripDay } from "@shared/schema";
import { Nav } from "@/components/ui/nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, DollarSign, MapPin, ArrowLeft, ExternalLink, CloudRain, ThermometerSun, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useState } from 'react';
import { Dialog, DialogHeader, DialogFooter, DialogTitle, DialogContent } from "@/components/ui/dialog";
import { WalkAroundMap } from "@/components/WalkAroundMap";

interface ExtendedTrip extends Trip {
  tripDays?: TripDay[];
  locations?: any[]; // We'll type this properly once the backend is set up
}

export default function TripDetails() {
  const params = useParams();
  const tripId = params?.id;
  const [showWeatherDialog, setShowWeatherDialog] = useState(false);
  const [selectedDay, setSelectedDay] = useState<TripDay | null>(null);
  const [weatherImpact, setWeatherImpact] = useState<string>("");

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

  const showWeatherImpact = async (day: TripDay) => {
    setSelectedDay(day);

    if (day.aiSuggestions.weatherContext) {
      const weatherContext = day.aiSuggestions.weatherContext;
      const activities = day.activities.timeSlots.map(slot => slot.activity).join(", ");

      let impact = "";

      if (weatherContext.is_suitable_for_outdoor) {
        impact = `The forecast for ${format(new Date(day.date), "MMMM d")} looks favorable with ${weatherContext.description} and a temperature of ${Math.round(weatherContext.temperature)}°F. This weather is suitable for your planned activities: ${activities}.`;
      } else {
        impact = `The weather forecast for ${format(new Date(day.date), "MMMM d")} shows ${weatherContext.description} with a temperature of ${Math.round(weatherContext.temperature)}°F and ${Math.round(weatherContext.precipitation_probability)}% chance of precipitation. This might affect your outdoor plans.`;

        if (day.aiSuggestions.alternativeActivities && day.aiSuggestions.alternativeActivities.length > 0) {
          impact += ` Consider these indoor alternatives: ${day.aiSuggestions.alternativeActivities.join(", ")}.`;
        }
      }

      setWeatherImpact(impact);
    } else {
      setWeatherImpact("Weather data isn't available yet for this date. Check back closer to your trip date for a weather impact analysis.");
    }

    setShowWeatherDialog(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" className="mb-4" asChild>
          <Link href="/my-trips">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to My Trips
          </Link>
        </Button>

        {/* Trip Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">{trip.title}</CardTitle>
            <div className="flex items-center justify-between">
              <div className="flex items-center text-muted-foreground">
                <MapPin className="h-4 w-4 mr-2" />
                {trip.destination}
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/walk-around/${trip.id}`}>
                  Walk Around
                </Link>
              </Button>
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
            </div>
          </CardContent>
        </Card>

        {/* Walk Around Map */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Walk Around</CardTitle>
            <p className="text-sm text-muted-foreground">
              Explore nearby attractions and your trip locations
            </p>
          </CardHeader>
          <CardContent>
            {trip && (
              <WalkAroundMap
                tripId={tripId!}
                locations={trip.locations || []}
                onPlaceSelect={(place) => {
                  // Handle adding place to itinerary
                  console.log('Selected place:', place);
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Daily Itinerary */}
        {trip?.tripDays && trip.tripDays.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Daily Itinerary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trip.tripDays.map((day) => (
                  <Card key={day.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                        <div className="flex flex-col gap-2">
                          <h4 className="font-medium">
                            {format(new Date(day.date), "EEEE, MMMM d, yyyy")}
                          </h4>
                          {day.aiSuggestions.weatherContext ? (
                            <div className="flex items-center gap-2 text-sm">
                              <ThermometerSun className="h-4 w-4" />
                              <span>{Math.round(day.aiSuggestions.weatherContext.temperature)}°F</span>
                              <CloudRain className="h-4 w-4 ml-2" />
                              <span>{Math.round(day.aiSuggestions.weatherContext.precipitation_probability)}%</span>
                              <span className="text-muted-foreground">
                                {day.aiSuggestions.weatherContext.description}
                              </span>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              No weather data available yet
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => showWeatherImpact(day)}
                          className="whitespace-nowrap"
                        >
                          See how this affects my trip
                        </Button>
                      </div>

                      {/* Weather Warning */}
                      {day.aiSuggestions.weatherContext && !day.aiSuggestions.weatherContext.is_suitable_for_outdoor && (
                        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-900/50">
                          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="font-medium">Weather Advisory</span>
                          </div>
                          <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                            Weather conditions may not be suitable for outdoor activities.
                          </p>
                          {day.aiSuggestions.alternativeActivities.length > 0 && (
                            <div className="mt-2">
                              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                Suggested Alternatives:
                              </span>
                              <ul className="mt-1 list-disc list-inside text-sm text-yellow-700 dark:text-yellow-300">
                                {day.aiSuggestions.alternativeActivities.map((alt, index) => (
                                  <li key={index}>{alt}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

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
            </CardContent>
          </Card>
        )}

        {/* Weather Impact Dialog */}
        <Dialog open={showWeatherDialog} onOpenChange={setShowWeatherDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Weather Impact on {selectedDay?.date ? format(new Date(selectedDay.date), "MMMM d") : ""}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">{weatherImpact}</p>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowWeatherDialog(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}