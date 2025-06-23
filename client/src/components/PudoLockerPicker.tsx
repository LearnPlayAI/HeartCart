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
  AlertCircle
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
  availableBoxTypes: Array<{
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
  onLockerSelect: (locker: PudoLocker) => void;
  customerProvince?: string;
  customerCity?: string;
}

export default function PudoLockerPicker({ 
  selectedLockerId, 
  onLockerSelect, 
  customerProvince, 
  customerCity 
}: PudoLockerPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's preferred locker
  const { data: preferredLocker } = useQuery({
    queryKey: ["/api/user/preferred-locker"],
    enabled: !selectedLockerId
  });

  // Smart locker fetching based on customer location
  const { data: locationBasedLockers, isLoading: locationLoading } = useQuery({
    queryKey: ["/api/pudo-lockers/location", customerProvince, customerCity],
    enabled: !!customerProvince && !searchQuery,
    queryFn: () => {
      const params = new URLSearchParams();
      if (customerProvince) params.append("province", customerProvince);
      if (customerCity) params.append("city", customerCity);
      return apiRequest(`/api/pudo-lockers/location?${params.toString()}`);
    }
  });

  // Search functionality
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["/api/pudo-lockers/search", searchQuery, customerProvince, customerCity],
    enabled: !!searchQuery && searchQuery.length >= 2,
    queryFn: () => {
      const params = new URLSearchParams();
      params.append("q", searchQuery);
      if (customerProvince) params.append("province", customerProvince);
      if (customerCity) params.append("city", customerCity);
      return apiRequest(`/api/pudo-lockers/search?${params.toString()}`);
    }
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
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferred-locker"] });
      toast({
        title: "Preference saved",
        description: "Your preferred PUDO locker has been saved for future orders."
      });
    }
  });

  // Determine which lockers to display
  const displayLockers = searchQuery 
    ? searchResults || []
    : locationBasedLockers || [];

  const isLoading = searchQuery ? searchLoading : locationLoading;

  // Auto-select preferred locker if available and no locker is selected
  useEffect(() => {
    if (preferredLocker && !selectedLockerId) {
      onLockerSelect(preferredLocker);
    }
  }, [preferredLocker, selectedLockerId, onLockerSelect]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setIsSearching(query.length >= 2);
  };

  const handleLockerSelection = (locker: PudoLocker) => {
    onLockerSelect(locker);
    
    // Save as preferred locker
    savePreferredMutation.mutate(locker);
  };

  const formatOpeningHours = (hours: PudoLocker['openingHours']) => {
    if (!hours || hours.length === 0) return "Hours not available";
    
    const today = new Date().toLocaleLowerCase();
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
          Select PUDO Locker
        </CardTitle>
        <CardDescription>
          Choose a convenient pickup location for your order
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by locker name, location, or code..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

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
                      {locker.availableBoxTypes && locker.availableBoxTypes.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="text-xs text-gray-500 mb-1">Available box sizes:</div>
                          <div className="flex gap-1 flex-wrap">
                            {locker.availableBoxTypes.slice(0, 3).map((boxType) => (
                              <Badge key={boxType.id} variant="secondary" className="text-xs">
                                {boxType.name}
                              </Badge>
                            ))}
                            {locker.availableBoxTypes.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{locker.availableBoxTypes.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
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