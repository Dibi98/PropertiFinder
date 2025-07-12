
'use client';

import { useState, useMemo, useCallback, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { type Property } from '@/lib/data';
import { PropertyMap } from '@/components/property-map';
import { Header } from './header';
import type { FilterState } from './property-search-filter';
import { ScrollArea } from './ui/scroll-area';
import { PropertyCard } from './property-card';
import { AddPropertyForm } from './add-property-form';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from './ui/drawer';
import { Button } from './ui/button';
import Draggable from 'react-draggable';

interface PropertyListingsProps {
  apiKey?: string;
  properties: Property[];
}

const parseAreaRange = (range: string): [number, number] => {
  if (range === 'Semua' || !range) return [0, Infinity];
  if (range.includes('+')) return [parseInt(range), Infinity];
  const [min, max] = range.split('-').map(Number);
  return [min, max];
};

function PropertyListingsComponent({ apiKey, properties: initialPropertiesData }: PropertyListingsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [properties, setProperties] = useState<Property[]>(initialPropertiesData);
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);

  const viewMode = searchParams.get('view') === 'list' ? 'list' : 'map';

  const setViewMode = (mode: 'list' | 'map') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', mode);
    router.push(`/properties?${params.toString()}`);
  };
  
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [selectedPropertyForCard, setSelectedPropertyForCard] = useState<Property | null>(null);
  const [newPropertyCoords, setNewPropertyCoords] = useState<{lat: number; lng: number} | null>(null);
  const [cardPosition, setCardPosition] = useState<{ x: number; y: number } | null>(null);

  const draggableRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    propertyType: 'Semua',
    priceSort: 'Default',
    buildingArea: 'Semua',
    landArea: 'Semua',
  });

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (selectedPropertyIds.length > 0 && viewMode === 'list') {
      const lastSelectedId = selectedPropertyIds[selectedPropertyIds.length - 1];
      if (cardRefs.current[lastSelectedId]) {
        cardRefs.current[lastSelectedId]?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [selectedPropertyIds, viewMode]);
  
  useEffect(() => {
    setSelectedPropertyIds([]);
    setSelectedPropertyForCard(null);
  }, [viewMode]);

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setSelectedPropertyForCard(null); 
  };
  
  const togglePropertySelection = useCallback((propertyId: string) => {
    setSelectedPropertyIds(prev =>
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  }, []);

  const filteredProperties = useMemo(() => {
    let sortedProperties = [...properties];

    if (filters.priceSort === 'Harga Terendah') {
      sortedProperties.sort((a, b) => a.price - b.price);
    } else if (filters.priceSort === 'Harga Tertinggi') {
      sortedProperties.sort((a, b) => b.price - a.price);
    }

    const [minBuildingArea, maxBuildingArea] = parseAreaRange(filters.buildingArea);
    const [minLandArea, maxLandArea] = parseAreaRange(filters.landArea);

    return sortedProperties.filter(property => {
      const searchTermMatch = filters.searchTerm === '' ||
        property.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        property.description.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        property.location.toLowerCase().includes(filters.searchTerm.toLowerCase());

      const propertyTypeMatch = filters.propertyType === 'Semua' || property.type === filters.propertyType;

      const buildingAreaMatch = property.buildingArea >= minBuildingArea && property.buildingArea <= maxBuildingArea;
      const landAreaMatch = property.landArea >= minLandArea && property.landArea <= maxLandArea;

      return searchTermMatch && propertyTypeMatch && buildingAreaMatch && landAreaMatch;
    });
  }, [properties, filters]);
  
  const handleCardClick = useCallback((property: Property) => {
     router.push(`/properties/${property.id}?from=${viewMode}`);
  }, [router, viewMode]);

  const handleCardHover = useCallback((propertyId: string | null) => {
    setHoveredPropertyId(propertyId);
  }, []);

  const handleMarkerClick = useCallback((property: Property, event: google.maps.MapMouseEvent) => {
    setSelectedPropertyForCard(property);
    
    if (event.domEvent instanceof MouseEvent) {
      const CARD_WIDTH = 384; 
      const CARD_HEIGHT = 300; 
      const PADDING = 16; 
      const headerHeight = headerRef.current?.offsetHeight || 0;

      const clickX = event.domEvent.clientX;
      const clickY = event.domEvent.clientY;
      
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let x = clickX + PADDING;
      let y = clickY + PADDING;
      
      if (x < PADDING) {
          x = PADDING;
      }
      
      if (x + CARD_WIDTH > windowWidth - PADDING) {
        x = windowWidth - CARD_WIDTH - PADDING;
      }
      
      if (y + CARD_HEIGHT > windowHeight - PADDING) {
        y = windowHeight - CARD_HEIGHT - PADDING;
      }
      
      if (y < headerHeight + PADDING) {
        y = headerHeight + PADDING;
      }

      setCardPosition({ x, y });
    } else {
      setCardPosition(null); 
    }
  }, []);


  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    setSelectedPropertyForCard(null);
    if (e.latLng) {
      const coords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setNewPropertyCoords(coords);
      setIsAddDrawerOpen(true);
    }
  }, []);
  
  const handleAddDrawerOpen = (open: boolean) => {
      setIsAddDrawerOpen(open);
      if (!open) {
          setNewPropertyCoords(null);
      }
  }
  
  const handleCompareClick = () => {
    if (selectedPropertyIds.length > 0) {
      router.push(`/compare?ids=${selectedPropertyIds.join(',')}`);
    }
  };

  const handleAddProperty = (newPropertyData: Omit<Property, 'id'>) => {
      const newProperty: Property = {
        id: (properties.length + 100).toString(),
        ...newPropertyData
      };
      setProperties(prev => [...prev, newProperty]);
      setIsAddDrawerOpen(false);
      setNewPropertyCoords(null);
  };
  
  return (
    <div className="relative w-full h-full flex flex-col">
       <div ref={headerRef} className="w-full">
         <Header 
            filters={filters} 
            onFilterChange={handleFilterChange} 
            showFilters={true} 
            viewMode={viewMode}
            onViewModeChange={(mode) => {
              setViewMode(mode);
              setSelectedPropertyForCard(null);
            }}
            onAddPropertyClick={() => handleAddDrawerOpen(true)}
          />
       </div>
      <main className="flex-grow flex flex-col">
        <div className="flex-grow relative">
          <div className={viewMode === 'list' ? 'block' : 'hidden'}>
             <ScrollArea className="h-full">
                <div className="container mx-auto px-4 py-4">
                  {filteredProperties.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {filteredProperties.map(property => (
                         <div key={property.id} ref={el => (cardRefs.current[property.id] = el)}>
                            <PropertyCard
                              property={property}
                              selected={selectedPropertyIds.includes(property.id)}
                              onSelectionChange={() => togglePropertySelection(property.id)}
                              showCheckbox
                              viewMode='list'
                              onMouseEnter={() => handleCardHover(property.id)}
                              onMouseLeave={() => handleCardHover(null)}
                              onClick={() => handleCardClick(property)}
                            />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[50vh]">
                      <p className="text-muted-foreground text-lg text-center">Tidak ada properti yang cocok dengan kriteria Anda.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
          </div>
          
          <div className={viewMode === 'map' ? 'block h-full w-full' : 'hidden'}>
            <PropertyMap
              properties={filteredProperties}
              apiKey={apiKey}
              onMarkerClick={handleMarkerClick}
              onMapClick={handleMapClick}
              hoveredPropertyId={hoveredPropertyId}
              selectedPropertyIds={selectedPropertyIds}
            />
             {selectedPropertyForCard && (
               <Draggable nodeRef={draggableRef} handle=".drag-handle" bounds="parent" position={cardPosition ? { x: 0, y: 0 } : undefined}>
                <div 
                  ref={draggableRef} 
                  className="fixed z-10 w-full max-w-sm cursor-grab"
                  style={cardPosition ? { top: cardPosition.y, left: cardPosition.x } : { bottom: '1rem', left: '1rem' }}
                >
                    <PropertyCard 
                    property={selectedPropertyForCard} 
                    isFloating 
                    onClose={() => setSelectedPropertyForCard(null)} 
                    onClick={() => handleCardClick(selectedPropertyForCard)}
                    isDraggable
                    viewMode='map'
                    />
                </div>
               </Draggable>
            )}
          </div>
        </div>
      </main>

       {selectedPropertyIds.length > 0 && viewMode === 'list' && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-md">
            <div className="bg-background rounded-lg shadow-2xl p-4 m-4 flex items-center justify-between">
                <p className="font-semibold">{selectedPropertyIds.length} properti dipilih</p>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setSelectedPropertyIds([])}>Bersihkan</Button>
                    <Button onClick={handleCompareClick}>Bandingkan</Button>
                </div>
            </div>
          </div>
       )}

       <Drawer open={isAddDrawerOpen} onOpenChange={handleAddDrawerOpen}>
        <DrawerContent>
           <DrawerHeader className="text-left">
              <DrawerTitle>Add New Property</DrawerTitle>
              <DrawerDescription>Fill in the details for the new property. The coordinates are set from the map. Click "Add Property" when you're done.</DrawerDescription>
            </DrawerHeader>
           <div className="p-4 pt-0">
             <AddPropertyForm 
                onSubmit={handleAddProperty} 
                onCancel={() => handleAddDrawerOpen(false)}
                initialCoordinates={newPropertyCoords}
             />
           </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

export function PropertyListings(props: PropertyListingsProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PropertyListingsComponent {...props} />
    </Suspense>
  )
}
