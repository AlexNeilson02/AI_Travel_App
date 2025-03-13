// Removing this file as we're no longer using the walk around feature
import React, { useState, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';

interface WalkAroundMapProps {
  destination?: string;
  points?: { lat: number; lng: number; title: string; description: string }[];
  onMarkerClick?: (index: number) => void;
}

export function WalkAroundMap({ destination, points = [], onMarkerClick }: WalkAroundMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<number | null>(null);
  const [center, setCenter] = useState<google.maps.LatLngLiteral>({ lat: 51.509865, lng: -0.118092 }); // London default
  const mapRef = useRef<HTMLDivElement>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  });

  useEffect(() => {
    if (destination && isLoaded) {
      // Geocode the destination to get coordinates
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: destination }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          setCenter({ lat: location.lat(), lng: location.lng() });
        }
      });
    } else if (points.length > 0) {
      // Calculate center from points
      const lat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
      const lng = points.reduce((sum, point) => sum + point.lng, 0) / points.length;
      setCenter({ lat, lng });
    }
  }, [destination, points, isLoaded]);

  const handleMarkerClick = (index: number) => {
    setSelectedMarker(index);
    if (onMarkerClick) {
      onMarkerClick(index);
    }
  };

  if (!isLoaded) return <div>Loading maps...</div>;

  return (
    <div ref={mapRef} style={{ width: '100%', height: '400px' }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={12}
        onLoad={map => setMap(map)}
        onUnmount={() => setMap(null)}
      >
        {points.map((point, index) => (
          <Marker
            key={index}
            position={{ lat: point.lat, lng: point.lng }}
            onClick={() => handleMarkerClick(index)}
          >
            {selectedMarker === index && (
              <InfoWindow onCloseClick={() => setSelectedMarker(null)}>
                <div>
                  <h3>{point.title}</h3>
                  <p>{point.description}</p>
                </div>
              </InfoWindow>
            )}
          </Marker>
        ))}
      </GoogleMap>
    </div>
  );
}

export default WalkAroundMap;
