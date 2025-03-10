import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { Location, TripLocation } from '@shared/schema';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Navigation, MapPin } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface NearbyPlace {
  id: string;
  name: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  vicinity: string;
  rating?: number;
  photos?: { photo_reference: string }[];
  types: string[];
}

interface WalkAroundMapProps {
  tripId: string;
  locations: (Location & { tripLocation: TripLocation })[];
  onPlaceSelect?: (place: NearbyPlace) => void;
}

const libraries: ("places")[] = ["places"];

export function WalkAroundMap({ tripId, locations, onPlaceSelect }: WalkAroundMapProps) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<NearbyPlace | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const fetchNearbyPlaces = useCallback(async (lat: number, lng: number) => {
    setIsLoadingPlaces(true);
    try {
      const response = await apiRequest(
        'GET',
        `/api/places/nearby?lat=${lat}&lng=${lng}&tripId=${tripId}`
      );
      const data = await response.json();
      setNearbyPlaces(data.places);
    } catch (error) {
      console.error('Error fetching nearby places:', error);
    } finally {
      setIsLoadingPlaces(false);
    }
  }, [tripId]);

  const trackLocation = useCallback(() => {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(newLocation);
        if (mapRef.current) {
          mapRef.current.panTo(newLocation);
        }
        fetchNearbyPlaces(newLocation.lat, newLocation.lng);
      },
      (error) => {
        console.error('Error getting location:', error);
      }
    );
  }, [fetchNearbyPlaces]);

  useEffect(() => {
    trackLocation();
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error('Error watching location:', error);
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [trackLocation]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-background border rounded-lg">
        <p className="text-destructive">Error loading map</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-background border rounded-lg">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const mapOptions: google.maps.MapOptions = {
    disableDefaultUI: false,
    clickableIcons: true,
    scrollwheel: true,
    zoomControl: true,
    styles: [
      {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "on" }],
      },
    ],
  };

  return (
    <div className="relative h-[500px] w-full">
      <GoogleMap
        options={mapOptions}
        zoom={15}
        center={userLocation || { lat: 0, lng: 0 }}
        mapContainerClassName="w-full h-full rounded-lg"
        onLoad={onMapLoad}
      >
        {/* User location marker */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: "#4F46E5",
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: "#FFFFFF",
            }}
          />
        )}

        {/* Trip locations markers */}
        {locations.map((location) => (
          <Marker
            key={location.tripLocation.id} //Corrected key
            position={{ lat: Number(location.tripLocation.latitude), lng: Number(location.tripLocation.longitude) }}
            icon={{
              url: '/map-pin.svg',
              scaledSize: new google.maps.Size(30, 30),
            }}
          />
        ))}

        {/* Nearby places markers */}
        {nearbyPlaces.map((place) => (
          <Marker
            key={place.id}
            position={place.geometry.location}
            onClick={() => setSelectedPlace(place)}
          />
        ))}

        {/* Info window for selected place */}
        {selectedPlace && (
          <InfoWindow
            position={selectedPlace.geometry.location}
            onCloseClick={() => setSelectedPlace(null)}
          >
            <Card className="p-2 min-w-[200px]">
              <h3 className="font-semibold">{selectedPlace.name}</h3>
              <p className="text-sm text-muted-foreground">{selectedPlace.vicinity}</p>
              {selectedPlace.rating && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-sm">Rating: {selectedPlace.rating}</span>
                  {'★'.repeat(Math.round(selectedPlace.rating))}
                </div>
              )}
              {onPlaceSelect && (
                <Button
                  className="mt-2 w-full"
                  size="sm"
                  onClick={() => onPlaceSelect(selectedPlace)}
                >
                  Add to Itinerary
                </Button>
              )}
            </Card>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Location tracking button */}
      <Button
        variant="secondary"
        size="icon"
        className="absolute bottom-4 right-4 h-10 w-10 rounded-full shadow-lg"
        onClick={trackLocation}
      >
        <Navigation className="h-4 w-4" />
      </Button>

      {/* Loading indicator for nearby places */}
      {isLoadingPlaces && (
        <div className="absolute top-4 right-4 bg-background/80 rounded-md p-2 shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}
    </div>
  );
}