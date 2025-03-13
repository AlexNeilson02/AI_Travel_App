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
import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';

// You'll need to get a Mapbox token and set it in your environment variables
// This is a placeholder - you should replace it with your actual token
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN || '';

interface WalkAroundMapProps {
  center?: [number, number];
  zoom?: number;
  location?: string;
}

export function WalkAroundMap({ 
  center = [-74.006, 40.7128], // Default: New York City
  zoom = 13,
  location = "New York City"
}: WalkAroundMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;
    
    try {
      if (!MAPBOX_TOKEN) {
        setMapError('Mapbox token not configured. Please set up your environment variables.');
        setLoading(false);
        return;
      }

      mapboxgl.accessToken = MAPBOX_TOKEN;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: center,
        zoom: zoom
      });

      map.current.on('load', () => {
        setLoading(false);
        
        // Add navigation controls
        map.current?.addControl(new mapboxgl.NavigationControl(), 'top-right');
        
        // Add a marker at the center
        new mapboxgl.Marker()
          .setLngLat(center)
          .setPopup(new mapboxgl.Popup().setHTML(`<h3>${location}</h3>`))
          .addTo(map.current);
      });

      return () => {
        map.current?.remove();
      };
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError('Failed to initialize map. Check console for details.');
      setLoading(false);
    }
  }, [center, zoom, location]);

  if (mapError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-muted rounded-lg p-4">
        <p className="text-red-500">{mapError}</p>
        <p className="text-sm text-muted-foreground mt-2">
          Please make sure Mapbox is correctly configured.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-[500px] w-full rounded-lg overflow-hidden border">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <div ref={mapContainer} className="h-full w-full" />
    </div>
  );
}

export default WalkAroundMap;
