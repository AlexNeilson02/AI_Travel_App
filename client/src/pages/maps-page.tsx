
import { useEffect, useState } from 'react';
import { useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Nav from '@/components/Nav';
import WalkAroundMap from '@/components/WalkAroundMap';
import { apiRequest } from '@/lib/queryClient';
import { Location, TripLocation } from '@shared/schema';

export default function MapsPage() {
  const [, params] = useRoute('/maps');
  
  // Fetch all trips to show their locations on the map
  const { data: trips, isLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: () => apiRequest('/api/trips')
  });

  const [allLocations, setAllLocations] = useState<(Location & { tripLocation: TripLocation })[]>([]);
  
  useEffect(() => {
    // Collect all locations from all trips
    if (trips) {
      const fetchTripDetails = async () => {
        const locationsPromises = trips.map(async (trip: any) => {
          const tripDetails = await apiRequest(`/api/trips/${trip.id}`);
          return tripDetails.tripDays?.flatMap((day: any) => 
            day.locations?.map((loc: any) => ({
              ...loc,
              tripLocation: {
                ...loc.tripLocation,
                tripId: trip.id
              }
            }))
          ).filter(Boolean) || [];
        });
        
        const results = await Promise.all(locationsPromises);
        setAllLocations(results.flat());
      };
      
      fetchTripDetails();
    }
  }, [trips]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <main className="container max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-[500px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="container max-w-6xl mx-auto px-4 py-8">
        <Button variant="ghost" className="mb-4" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">All Trip Locations</CardTitle>
            <p className="text-muted-foreground">
              View all your planned trip locations on a single map. Explore nearby attractions and discover interesting places.
            </p>
          </CardHeader>
          <CardContent>
            <WalkAroundMap
              tripId="all"
              locations={allLocations}
              onPlaceSelect={(place) => {
                console.log('Selected place:', place);
              }}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
