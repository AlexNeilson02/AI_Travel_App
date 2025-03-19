import { useState, useEffect } from 'react';
import { GoogleMap, useLoadScript, MarkerF } from '@react-google-maps/api';

interface Location {
  title: string;
  lat: number;
  lng: number;
  type: 'activity' | 'accommodation';
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
  height: '400px',
  borderRadius: '0.5rem'
};

export default function TripMap({ activities, accommodation }: TripMapProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [center, setCenter] = useState({ lat: 0, lng: 0 });

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.GOOGLE_MAPS_API_KEY || '',
  });

  useEffect(() => {
    const geocodeLocation = async (address: string, title: string, type: 'activity' | 'accommodation') => {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${import.meta.env.GOOGLE_MAPS_API_KEY}`
        );
        const data = await response.json();
        if (data.results && data.results[0]) {
          return {
            title,
            ...data.results[0].geometry.location,
            type
          };
        }
      } catch (error) {
        console.error('Geocoding error:', error);
      }
      return null;
    };

    const fetchLocations = async () => {
      const locationPromises = activities.map(activity =>
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
        // Center the map on the first location
        setCenter({
          lat: validLocations[0].lat,
          lng: validLocations[0].lng
        });
      }
    };

    if (activities.length > 0 || accommodation?.location) {
      fetchLocations();
    }
  }, [activities, accommodation]);

  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) return <div>Loading maps...</div>;

  return (
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
    >
      {locations.map((location, index) => (
        <MarkerF
          key={index}
          position={{ lat: location.lat, lng: location.lng }}
          title={location.title}
          icon={{
            url: location.type === 'accommodation' 
              ? 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
              : 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
          }}
        />
      ))}
    </GoogleMap>
  );
}