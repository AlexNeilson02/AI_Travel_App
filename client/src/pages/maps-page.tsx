import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Nav from '@/components/Nav';
import { useQuery } from '@tanstack/react-query';
import { Trip } from '@shared/schema';
import TripMap from '@/components/TripMap';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export default function MapsPage() {
  const [selectedTripId, setSelectedTripId] = useState<string>('all');

  const { data: trips, isLoading } = useQuery<Trip[]>({
    queryKey: ["/api/trips"],
  });

  const getMapData = () => {
    if (!trips) return { activities: [], accommodation: null };

    const relevantTrips = selectedTripId === 'all' 
      ? trips 
      : trips.filter(trip => trip.id.toString() === selectedTripId);

    const activities = relevantTrips.flatMap(trip => 
      trip.itinerary?.days.flatMap(day =>
        day.activities.timeSlots.map(slot => ({
          activity: `${trip.title} - ${slot.activity}`,
          location: slot.location
        }))
      ) || []
    );

    const accommodation = relevantTrips[0]?.itinerary?.days[0]?.accommodation || null;

    return { activities, accommodation };
  };

  return (
    <div className="min-h-screen h-screen bg-background flex flex-col">
      <Nav />
      <div className="flex-1 p-2 flex flex-col">
        <div className="max-w-[98%] mx-auto flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold mr-4">Trip Maps Explorer</h1>
            {trips && trips.length > 0 && (
              <Select
                value={selectedTripId}
                onValueChange={setSelectedTripId}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select a trip" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trips</SelectItem>
                  {trips.map(trip => (
                    <SelectItem key={trip.id} value={trip.id.toString()}>
                      {trip.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Card className="flex-1 flex flex-col">
            <CardHeader className="py-2 px-4">
              <CardTitle>Interactive Trip Map</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              {isLoading ? (
                <div className="h-full w-full bg-muted flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : !trips || trips.length === 0 ? (
                <div className="h-full w-full bg-muted flex items-center justify-center">
                  No trips found. Create a trip to see it on the map!
                </div>
              ) : (
                <div className="h-full w-full">
                  <TripMap {...getMapData()} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}