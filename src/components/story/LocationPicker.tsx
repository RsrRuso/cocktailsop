import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Search, Navigation, Building2, Coffee, Utensils, Music } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Location {
  id: string;
  name: string;
  address: string;
  category: string;
  icon?: React.ReactNode;
}

interface LocationPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (location: Location) => void;
  currentLocation?: Location | null;
}

const mockLocations: Location[] = [
  { id: "1", name: "Attiko Bar", address: "Athens, Greece", category: "Bar", icon: <Music className="w-4 h-4" /> },
  { id: "2", name: "The Ritz-Carlton", address: "London, UK", category: "Hotel", icon: <Building2 className="w-4 h-4" /> },
  { id: "3", name: "Nobu Restaurant", address: "Dubai, UAE", category: "Restaurant", icon: <Utensils className="w-4 h-4" /> },
  { id: "4", name: "Starbucks Reserve", address: "Milan, Italy", category: "Cafe", icon: <Coffee className="w-4 h-4" /> },
  { id: "5", name: "Sky Bar Bangkok", address: "Bangkok, Thailand", category: "Bar", icon: <Music className="w-4 h-4" /> },
  { id: "6", name: "Central Park", address: "New York, USA", category: "Park", icon: <MapPin className="w-4 h-4" /> },
];

export function LocationPicker({ open, onOpenChange, onSelect, currentLocation }: LocationPickerProps) {
  const [search, setSearch] = useState("");
  const [filteredLocations, setFilteredLocations] = useState(mockLocations);
  const [isLoadingGPS, setIsLoadingGPS] = useState(false);

  useEffect(() => {
    if (search) {
      setFilteredLocations(
        mockLocations.filter(loc => 
          loc.name.toLowerCase().includes(search.toLowerCase()) ||
          loc.address.toLowerCase().includes(search.toLowerCase())
        )
      );
    } else {
      setFilteredLocations(mockLocations);
    }
  }, [search]);

  const handleUseCurrentLocation = () => {
    setIsLoadingGPS(true);
    navigator.geolocation?.getCurrentPosition(
      (position) => {
        // In production, reverse geocode to get actual address
        const currentLoc: Location = {
          id: "current",
          name: "Current Location",
          address: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
          category: "GPS",
          icon: <Navigation className="w-4 h-4" />
        };
        onSelect(currentLoc);
        setIsLoadingGPS(false);
        onOpenChange(false);
      },
      () => {
        setIsLoadingGPS(false);
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Add Location
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search locations..."
            className="pl-9"
          />
        </div>

        <Button
          variant="outline"
          onClick={handleUseCurrentLocation}
          disabled={isLoadingGPS}
          className="flex items-center gap-2"
        >
          <Navigation className={cn("w-4 h-4", isLoadingGPS && "animate-pulse")} />
          {isLoadingGPS ? "Getting location..." : "Use Current Location"}
        </Button>

        <div className="flex-1 overflow-y-auto space-y-1 -mx-2 px-2">
          {filteredLocations.map((location) => (
            <button
              key={location.id}
              onClick={() => {
                onSelect(location);
                onOpenChange(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors text-left",
                currentLocation?.id === location.id && "bg-primary/10 border border-primary/30"
              )}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                {location.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{location.name}</p>
                <p className="text-sm text-muted-foreground truncate">{location.address}</p>
              </div>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {location.category}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
