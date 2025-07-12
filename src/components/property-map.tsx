
'use client';

import { APIProvider, Map } from '@vis.gl/react-google-maps';
import { PropertyMarkers } from './property-markers';
import type { Property } from '@/lib/data';
import { cn } from '@/lib/utils';

interface PropertyMapProps {
  properties: Property[];
  apiKey?: string;
  onMarkerClick: (property: Property, event: google.maps.MapMouseEvent) => void;
  onMapClick: (e: google.maps.MapMouseEvent) => void;
  selectedPropertyIds?: string[];
  hoveredPropertyId?: string | null;
  className?: string;
}

export function PropertyMap({
  properties,
  apiKey,
  onMarkerClick,
  onMapClick,
  selectedPropertyIds = [],
  hoveredPropertyId,
  className,
}: PropertyMapProps) {
  const defaultCenter = { lat: 1.118, lng: 104.048 };

  if (!apiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <p className="text-center text-destructive p-4">
          Google Maps API key is missing.
          Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment variables to enable Google Maps.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("w-full h-full relative", className)}>
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={defaultCenter}
          defaultZoom={11}
          gestureHandling={'greedy'}
          disableDefaultUI={true}
          mapId="e8c2865d3c829e0"
          onClick={onMapClick}
        >
          <PropertyMarkers
            properties={properties}
            onMarkerClick={onMarkerClick}
            selectedPropertyIds={selectedPropertyIds}
            hoveredPropertyId={hoveredPropertyId}
          />
        </Map>
      </APIProvider>
    </div>
  );
}
