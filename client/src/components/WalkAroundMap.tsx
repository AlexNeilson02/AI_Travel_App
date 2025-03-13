import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { Button } from './ui/button';
import { Navigation, Loader2 } from 'lucide-react';

interface WalkAroundMapProps {
  destination: string;
  initialLat?: number;
  initialLng?: number;
}

export function WalkAroundMap({ destination, initialLat, initialLng }: WalkAroundMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [center, setCenter] = useState<google.maps.LatLngLiteral>({
    lat: initialLat || 40.7128, // Default to NYC
    lng: initialLng || -74.0060
  });
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || ''
  });

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    // Initialize with destination search
    if (destination) {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: destination }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          setCenter({
            lat: location.lat(),
            lng: location.lng()
          });
          map.setCenter(location);
        }
      });
    }
  }, [destination]);

  const trackLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          map?.panTo(location);
        },
        () => {
          console.error('Error getting location');
        }
      );
    }
  };

  useEffect(() => {
    if (map && userLocation) {
      setIsLoadingPlaces(true);
      const service = new google.maps.places.PlacesService(map);
      service.nearbySearch({
        location: userLocation,
        radius: 500,
        type: ['tourist_attraction']
      }, (results, status) => {
        setIsLoadingPlaces(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          setNearbyPlaces(results);
        }
      });
    }
  }, [map, userLocation]);

  if (!isLoaded) return <div className="h-full w-full bg-muted flex items-center justify-center">Loading map...</div>;

  return (
    <div className="h-full w-full relative">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={13}
        onLoad={onMapLoad}
      >
        {userLocation && <Marker position={userLocation} />}

        {nearbyPlaces.map((place) => (
          <Marker
            key={place.place_id}
            position={{
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            }}
            title={place.name}
          />
        ))}
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

const containerStyle = {
  width: '100%',
  height: '100%'
};

const center = {
  lat: 40.7128,
  lng: -74.0060
};

interface WalkAroundMapProps2 {
  mapCenter?: { lat: number; lng: number };
  markers?: Array<{ position: { lat: number; lng: number }; title?: string }>;
}

export function WalkAroundMap2({ 
  mapCenter = center, 
  markers = [] 
}: WalkAroundMapProps2) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

  const [map, setMap] = React.useState<google.maps.Map | null>(null);

  const onLoad = React.useCallback(function callback(map: google.maps.Map) {
    setMap(map);
  }, []);

  const onUnmount = React.useCallback(function callback() {
    setMap(null);
  }, []);

  return isLoaded ? (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={mapCenter}
      zoom={10}
      onLoad={onLoad}
      onUnmount={onUnmount}
    >
      {markers.map((marker, index) => (
        <Marker 
          key={index} 
          position={marker.position} 
          title={marker.title} 
        />
      ))}
    </GoogleMap>
  ) : <div>Loading...</div>;
}