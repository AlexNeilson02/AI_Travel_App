import { useState, useEffect } from 'react';
import { GoogleMap, useLoadScript, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Location {
  title: string;
  lat: number;
  lng: number;
  type: 'activity' | 'accommodation';
  address?: string;
}

interface TripMapProps {
  activities: Array<{
    activity: string;
    location: string;
  }>;
  accommodation?: {
    name: string;
    location: string;
  };
}

const mapContainerStyle = {
  width: '100%',
  height: '100%', 
  borderRadius: '0.5rem'
};

export default function TripMap({ activities, accommodation }: TripMapProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [center, setCenter] = useState({ lat: 0, lng: 0 });
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const { toast } = useToast();

  // Make sure we have a valid API key
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  if (!apiKey) {
    console.error('Google Maps API key is missing');
    return <div className="p-4 text-red-500">Error: Google Maps API key is not configured</div>;
  }

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
  });

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast({
      title: "Address copied",
      description: "The location address has been copied to your clipboard.",
    });
  };

  useEffect(() => {
    const geocodeLocation = async (address: string, title: string, type: 'activity' | 'accommodation') => {
      if (!address) return null;

      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
        );

        if (!response.ok) {
          console.error('Geocoding API error:', await response.text());
          return null;
        }

        const data = await response.json();
        if (data.results && data.results[0] && data.results[0].geometry) {
          return {
            title,
            ...data.results[0].geometry.location,
            type,
            address: data.results[0].formatted_address
          };
        } else {
          console.warn(`No location found for address: ${address}`);
          return null;
        }
      } catch (error) {
        console.error('Geocoding error:', error);
        return null;
      }
    };

    const fetchLocations = async () => {
      const validActivities = activities.filter(activity => activity.location);
      const locationPromises = validActivities.map(activity =>
        geocodeLocation(activity.location, activity.activity, 'activity')
      );

      if (accommodation?.location) {
        locationPromises.push(
          geocodeLocation(accommodation.location, accommodation.name, 'accommodation')
        );
      }

      const results = await Promise.all(locationPromises);
      const validLocations = results.filter((loc): loc is Location => loc !== null);

      if (validLocations.length > 0) {
        setLocations(validLocations);
        // Center the map on the first valid location
        setCenter({
          lat: validLocations[0].lat,
          lng: validLocations[0].lng
        });
      }
    };

    if (activities.length > 0 || accommodation?.location) {
      fetchLocations();
    }
  }, [activities, accommodation, apiKey]);

  if (loadError) {
    console.error('Error loading maps:', loadError);
    return <div className="p-4 text-red-500">Error loading Google Maps</div>;
  }

  if (!isLoaded) {
    return <div className="p-4">Loading maps...</div>;
  }

  return (
    <div className="relative">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={12}
        center={center}
        options={{
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        }}
        onClick={() => setSelectedLocation(null)}
      >
        {locations.map((location, index) => (
          <MarkerF
            key={index}
            position={{ lat: location.lat, lng: location.lng }}
            title={location.title}
            onClick={() => setSelectedLocation(location)}
            icon={{
              url: location.type === 'accommodation'
                ? 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                : 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
            }}
          />
        ))}

        {selectedLocation && (
          <InfoWindowF
            position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
            onCloseClick={() => setSelectedLocation(null)}
          >
            <div className="p-2 max-w-sm">
              <h3 className="font-medium text-lg mb-1">{selectedLocation.title}</h3>
              {selectedLocation.address && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex-1">{selectedLocation.address}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyAddress(selectedLocation.address!);
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              <div className="mt-2">
                <div className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary inline-block">
                  {selectedLocation.type === 'accommodation' ? 'Accommodation' : 'Activity'}
                </div>
              </div>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
      {locations.length === 0 &&
        <div className="absolute top-0 left-0 right-0 bg-yellow-100 p-2 text-sm text-yellow-800">
          No valid locations found to display on map
        </div>
      }
    </div>
  );
}