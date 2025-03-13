import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MapsPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Maps Explorer</h1>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Interactive Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] w-full bg-muted flex items-center justify-center">
            Map feature coming soon
          </div>
        </CardContent>
      </Card>
    </div>
  );
}