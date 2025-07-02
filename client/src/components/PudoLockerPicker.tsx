import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  MapPin, 
  Clock, 
  Search, 
  Package, 
  Star,
  Check,
  Loader2,
  AlertCircle,
  ExternalLink
} from "lucide-react";

interface PudoLocker {
  id: number;
  code: string;
  provider: string;
  name: string;
  latitude: string;
  longitude: string;
  openingHours: Array<{
    day: string;
    open_time: string;
    close_time: string;
    isStoreOpen: string;
  }>;
  address: string;
  detailedAddress: {
    country?: string;
    locality?: string;
    province?: string;
    postal_code?: string;
    street_name?: string;
    sublocality?: string;
    street_number?: string;
    formatted_address?: string;
  };
  lockerType: {
    id: number;
    name: string;
  };
  place: {
    placeNumber?: string;
    town?: string;
    postalCode?: string;
  };
  lstTypesBoxes: Array<{
    id: number;
    name: string;
    type: string;
    width: number;
    height: number;
    length: number;
    weight: number;
  }>;
  isActive: boolean;
}

interface PudoLockerPickerProps {
  selectedLockerId?: number;
  onLockerSelect: (locker?: PudoLocker) => void;
  customerProvince?: string;
  customerCity?: string;
  mode?: 'selection' | 'confirmation';
  onSavePreferred?: () => void; // Function to save current selection as preferred
  savePreferredTrigger?: boolean; // Trigger to save preferred locker
}

export default function PudoLockerPicker({ 
  selectedLockerId, 
  onLockerSelect, 
  customerProvince, 
  customerCity,
  mode = 'selection',
  onSavePreferred,
  savePreferredTrigger
}: PudoLockerPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's preferred locker
  const { data: preferredLockerResponse } = useQuery({
    queryKey: ["/api/user/preferred-locker"],
    enabled: !selectedLockerId
  });
  
  // Extract the actual locker data from the API response
  const preferredLocker = preferredLockerResponse?.data;

  // Smart locker fetching based on customer location - automatically loads user's area
  const { data: locationBasedLockers, isLoading: locationLoading } = useQuery({
    queryKey: [`/api/pudo-lockers/location?province=${customerProvince}&city=${customerCity}`],
    enabled: !!customerProvince && !searchQuery
  });

  // Search functionality  
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: [`/api/pudo-lockers/search?q=${searchQuery}&province=${customerProvince}&city=${customerCity}`],
    enabled: !!searchQuery && searchQuery.length >= 2
  });

  // Save preferred locker mutation
  const savePreferredMutation = useMutation({
    mutationFn: (locker: PudoLocker) =>
      apiRequest("/api/user/preferred-locker", {
        method: "POST",
        body: JSON.stringify({
          lockerId: locker.id,
          lockerCode: locker.code
        })
      }),
    onSuccess: () => {
      // Invalidate all relevant queries to ensure fresh data everywhere
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferred-locker"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    }
  });

  // Determine which lockers to display
  // If a locker is selected, show only that locker
  let displayLockers;
  if (selectedLockerId) {
    // Find the selected locker from any source
    const selectedLocker = 
      searchResults?.data?.find(l => l.id === selectedLockerId) ||
      locationBasedLockers?.data?.find(l => l.id === selectedLockerId) ||
      (preferredLocker && preferredLocker.id === selectedLockerId ? preferredLocker : null);
    
    displayLockers = selectedLocker ? [selectedLocker] : [];
  } else {
    // Show search results, location-based results, or include preferred locker if it's not in the local list
    if (searchQuery) {
      displayLockers = searchResults?.data || [];
    } else {
      displayLockers = locationBasedLockers?.data || [];
      
      // If user has a preferred locker that's not in the local area, add it to the list
      if (preferredLocker && !displayLockers.find(l => l.id === preferredLocker.id)) {
        displayLockers = [preferredLocker, ...displayLockers];
      }
    }
  }

  const isLoading = searchQuery ? searchLoading : locationLoading;

  // Debug logging
  console.log("PudoLockerPicker Debug:", {
    customerProvince,
    customerCity,
    searchQuery,
    locationBasedLockers: locationBasedLockers?.data?.length || 0,
    searchResults: searchResults?.data?.length || 0,
    displayLockers: displayLockers.length,
    isLoading,
    queryEnabled: !!customerProvince && !searchQuery,
    locationData: locationBasedLockers,
    searchData: searchResults
  });

  // Track if user has manually changed selection to prevent auto-override
  const [hasManuallyChanged, setHasManuallyChanged] = useState(false);
  // Track if we've done initial auto-selection to prevent repeated auto-selection
  const [hasInitialAutoSelection, setHasInitialAutoSelection] = useState(false);

  // Reset flags when component is cleared (Change Selection clicked)
  useEffect(() => {
    if (!selectedLockerId) {
      setHasManuallyChanged(false);
      // Don't reset hasInitialAutoSelection - we want to prevent auto-selection after manual changes
    }
  }, [selectedLockerId]);

  // Reset auto-selection flag when preferred locker changes (allows new preferred locker to auto-select)
  useEffect(() => {
    setHasInitialAutoSelection(false);
  }, [preferredLocker?.id]);

  // Function to save current selection as preferred (called during checkout)
  const saveCurrentSelectionAsPreferred = () => {
    if (selectedLockerId && displayLockers.length > 0) {
      const currentLocker = displayLockers.find(l => l.id === selectedLockerId);
      if (currentLocker) {
        console.log("Saving current selection as preferred during checkout:", currentLocker);
        savePreferredMutation.mutate(currentLocker);
        return true;
      }
    }
    return false;
  };

  // Trigger save when savePreferredTrigger changes
  useEffect(() => {
    if (savePreferredTrigger && selectedLockerId && displayLockers.length > 0) {
      const currentLocker = displayLockers.find(l => l.id === selectedLockerId);
      if (currentLocker) {
        console.log("Saving current selection as preferred during checkout:", currentLocker);
        savePreferredMutation.mutate(currentLocker);
        // Invalidate cache to ensure fresh preferred locker data
        queryClient.invalidateQueries({ queryKey: ["/api/user/preferred-locker"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        // Call parent callback if provided
        if (onSavePreferred) {
          onSavePreferred();
        }
      }
    }
  }, [savePreferredTrigger, selectedLockerId, displayLockers, onSavePreferred, queryClient]);

  // Auto-select preferred locker when it loads and lockers are available (only if no manual change)
  useEffect(() => {
    console.log("Auto-selection check:", {
      hasPreferredLocker: !!preferredLocker,
      preferredLockerId: preferredLocker?.id,
      selectedLockerId,
      displayLockersCount: displayLockers.length,
      isLocationLoading: locationLoading,
      hasManuallyChanged,
      hasInitialAutoSelection
    });
    
    if (preferredLocker && !selectedLockerId && displayLockers.length > 0 && !hasManuallyChanged && !hasInitialAutoSelection && !locationLoading) {
      // Add small delay to prevent flashing during cache refresh
      const timer = setTimeout(() => {
        // Find the preferred locker in the display list by ID
        const matchingLocker = displayLockers.find(locker => locker.id === preferredLocker.id);
        console.log("Looking for matching locker:", {
          preferredLocker: preferredLocker,
          preferredId: preferredLocker.id,
          preferredType: typeof preferredLocker.id,
          firstDisplayLockerId: displayLockers[0].id,
          firstDisplayLockerType: typeof displayLockers[0].id,
          found: !!matchingLocker,
          firstDisplayLocker: displayLockers[0]
        });
        
        if (matchingLocker) {
          console.log("Auto-selecting preferred locker:", matchingLocker);
          onLockerSelect(matchingLocker);
          setHasInitialAutoSelection(true); // Mark that we've done initial auto-selection
        }
      }, 100); // Small delay to smooth transition
      
      return () => clearTimeout(timer);
    }
  }, [preferredLocker, selectedLockerId, displayLockers, onLockerSelect, locationLoading, hasManuallyChanged, hasInitialAutoSelection]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setIsSearching(query.length >= 2);
  };

  const handleLockerSelection = (locker: PudoLocker) => {
    console.log("Locker manually selected:", locker);
    setHasManuallyChanged(true); // Mark that user has manually changed selection
    onLockerSelect(locker);
    
    // Save as preferred locker
    savePreferredMutation.mutate(locker);
  };

  const formatOpeningHours = (hours: PudoLocker['openingHours']) => {
    if (!hours || hours.length === 0) return "Hours not available";
    
    const today = new Date().toLocaleDateString();
    const todayHours = hours.find(h => h.day.toLowerCase().includes(today.slice(0, 3)));
    
    if (todayHours) {
      return `Today: ${todayHours.open_time} - ${todayHours.close_time}`;
    }
    
    return `${hours[0].open_time} - ${hours[0].close_time}`;
  };

  const getLockerDistance = (locker: PudoLocker) => {
    // Simple distance indication based on city match
    if (customerCity && locker.detailedAddress?.locality?.toLowerCase() === customerCity.toLowerCase()) {
      return "In your city";
    }
    if (customerProvince && locker.detailedAddress?.province?.toLowerCase() === customerProvince.toLowerCase()) {
      return "In your province";
    }
    return "";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          {mode === 'confirmation' ? 'Selected PUDO Locker' : 'Select PUDO Locker'}
        </CardTitle>
        <CardDescription>
          {mode === 'confirmation' 
            ? 'Your selected pickup location for this order'
            : 'Choose a convenient pickup location for your order'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        {!selectedLockerId && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by locker name, location, or code..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-xs text-gray-500">
              <span>Tip: Search for cities, areas, or locker names (e.g., "port elizabeth", "centurion golf", "randburg")</span>
            </div>
          </div>
        )}

        {/* Selected Locker Display */}
        {selectedLockerId && (() => {
          const selectedLocker = displayLockers.find(l => l.id === selectedLockerId) || 
                                 (preferredLocker?.id === selectedLockerId ? preferredLocker : null);
          
          if (!selectedLocker) {
            return (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-800">
                  <Check className="h-4 w-4" />
                  <span className="text-sm font-medium">Locker Selected</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery(""); // Clear search first
                    onLockerSelect(null as any); // Then clear selection
                  }}
                  className="text-xs"
                >
                  Change Selection
                </Button>
              </div>
            );
          }

          return (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-green-800">
                  <Check className="h-4 w-4" />
                  <span className="text-sm font-medium">Selected Locker</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery(""); // Clear search first
                    onLockerSelect(null as any); // Then clear selection
                  }}
                  className="text-xs"
                >
                  Change Selection
                </Button>
              </div>
              
              {/* Selected Locker Details */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{selectedLocker.name}</h4>
                  <div className="flex items-center gap-2">
                    {preferredLocker?.id === selectedLocker.id && (
                      <Badge variant="secondary" className="text-xs bg-pink-100 text-pink-800">
                        <Star className="h-3 w-3 mr-1" />
                        Preferred
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {selectedLocker.code}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{selectedLocker.address}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{formatOpeningHours(selectedLocker.openingHours)}</span>
                  </div>
                  
                  {getLockerDistance(selectedLocker) && (
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      <span>{getLockerDistance(selectedLocker)}</span>
                    </div>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 text-pink-600 border-pink-200 hover:bg-pink-50"
                  onClick={() => {
                    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedLocker.address)}`;
                    window.open(googleMapsUrl, '_blank');
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Location on Google Maps
                </Button>
              </div>
            </div>
          );
        })()}

        {/* Location Info Banner */}
        {!searchQuery && customerCity && customerProvince && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-blue-800">
              <MapPin className="h-4 w-4" />
              <span className="text-sm font-medium">
                Showing lockers in {customerCity}, {customerProvince}
              </span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Use the search bar above to find lockers in other areas
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Finding lockers...</span>
          </div>
        )}

        {/* No Results */}
        {!isLoading && displayLockers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>No PUDO lockers found</p>
            {searchQuery ? (
              <p className="text-sm">Try a different search term</p>
            ) : customerCity && customerProvince ? (
              <p className="text-sm">No lockers available in {customerCity}, {customerProvince}</p>
            ) : (
              <p className="text-sm">Try searching for a specific location</p>
            )}
          </div>
        )}

        {/* Locker List */}
        {!isLoading && displayLockers.length > 0 && (
          <RadioGroup 
            value={selectedLockerId?.toString() || ""} 
            onValueChange={(value) => {
              const locker = displayLockers.find(l => l.id.toString() === value);
              if (locker) handleLockerSelection(locker);
            }}
            className="space-y-3"
          >
            {displayLockers.map((locker) => (
              <div key={locker.id} className="relative">
                <RadioGroupItem
                  value={locker.id.toString()}
                  id={`locker-${locker.id}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`locker-${locker.id}`}
                  className="flex cursor-pointer"
                >
                  <Card className="w-full peer-checked:ring-2 peer-checked:ring-blue-500 peer-checked:border-blue-500 hover:border-gray-300 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm">{locker.name}</h4>
                            {preferredLocker?.id === locker.id && (
                              <Badge variant="secondary" className="text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                Preferred
                              </Badge>
                            )}
                            {selectedLockerId === locker.id && (
                              <Badge variant="default" className="text-xs">
                                <Check className="h-3 w-3 mr-1" />
                                Selected
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1 text-gray-600 text-xs mb-1">
                            <MapPin className="h-3 w-3" />
                            <span>{locker.address}</span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatOpeningHours(locker.openingHours)}</span>
                            </div>
                            
                            {getLockerDistance(locker) && (
                              <Badge variant="outline" className="text-xs">
                                {getLockerDistance(locker)}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <Badge variant="outline" className="text-xs mb-1">
                            {locker.code}
                          </Badge>
                          <div className="text-xs text-gray-500">
                            {locker.provider}
                          </div>
                        </div>
                      </div>

                      {/* Box Types Available */}
                      {locker.lstTypesBoxes && locker.lstTypesBoxes.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="text-xs text-gray-500 mb-1">Available box sizes:</div>
                          <div className="flex gap-1 flex-wrap">
                            {locker.lstTypesBoxes.slice(0, 3).map((boxType) => (
                              <Badge key={boxType.id} variant="secondary" className="text-xs">
                                {boxType.name}
                              </Badge>
                            ))}
                            {locker.lstTypesBoxes.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{locker.lstTypesBoxes.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Google Maps Link */}
                      <div className="mt-3 pt-2 border-t">
                        <a
                          href={`https://www.google.com/maps?q=${locker.latitude},${locker.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors bg-[#ff69b4]"
                        >
                          <MapPin className="h-4 w-4" />
                          <span>View Location on Google Maps</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {/* Location Hint */}
        {customerProvince && !searchQuery && (
          <div className="text-sm text-gray-500 mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>
                Showing lockers in {customerCity ? `${customerCity}, ` : ""}{customerProvince}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}