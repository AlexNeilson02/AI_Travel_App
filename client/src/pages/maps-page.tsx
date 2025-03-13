import React from 'react';
import { WalkAroundMap } from '@/components/WalkAroundMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MapsPage() {
  // Example data
  const markers = [
    { position: { lat: 40.7128, lng: -74.0060 }, title: 'New York City' },
    { position: { lat: 34.0522, lng: -118.2437 }, title: 'Los Angeles' },
    { position: { lat: 41.8781, lng: -87.6298 }, title: 'Chicago' }
  ];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Maps Explorer</h1>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Interactive Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] w-full">
            <WalkAroundMap markers={markers} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}