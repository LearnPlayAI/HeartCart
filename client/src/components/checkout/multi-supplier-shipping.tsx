import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Truck, Package, Clock } from "lucide-react";

export type SupplierGroup = {
  supplierId: number;
  supplierName: string;
  items: {
    productId: number;
    productName: string;
    quantity: number;
    price: number;
  }[];
  availableMethods: {
    id: number;
    name: string;
    code: string;
    customerPrice: number;
    estimatedDeliveryDays: number;
    isDefault: boolean;
    logisticsCompanyName: string;
  }[];
  defaultMethodId: number;
};

type ShippingSelection = {
  [supplierId: number]: number; // supplierId -> shippingMethodId
};

interface MultiSupplierShippingProps {
  supplierGroups: SupplierGroup[];
  onShippingChange: (selections: ShippingSelection, totalCost: number) => void;
}

export default function MultiSupplierShipping({
  supplierGroups,
  onShippingChange
}: MultiSupplierShippingProps) {
  // Initialize with default methods for each supplier
  const [shippingSelections, setShippingSelections] = useState<ShippingSelection>(() => {
    const initial: ShippingSelection = {};
    supplierGroups.forEach(group => {
      initial[group.supplierId] = group.defaultMethodId;
    });
    return initial;
  });

  // Fire onShippingChange with initial defaults on mount
  useEffect(() => {
    const initialTotalCost = supplierGroups.reduce((sum, group) => {
      const selectedMethodId = shippingSelections[group.supplierId];
      const method = group.availableMethods.find(m => m.id === selectedMethodId);
      return sum + (method?.customerPrice || 0);
    }, 0);

    onShippingChange(shippingSelections, initialTotalCost);
  }, []); // Only run once on mount

  const handleMethodChange = (supplierId: number, methodId: number) => {
    const newSelections = {
      ...shippingSelections,
      [supplierId]: methodId
    };
    setShippingSelections(newSelections);

    // Calculate total cost
    const totalCost = supplierGroups.reduce((sum, group) => {
      const selectedMethodId = newSelections[group.supplierId];
      const method = group.availableMethods.find(m => m.id === selectedMethodId);
      return sum + (method?.customerPrice || 0);
    }, 0);

    onShippingChange(newSelections, totalCost);
  };

  // Calculate total items and total shipping cost
  const totalItems = supplierGroups.reduce((sum, group) =>
    sum + group.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
  );

  const totalShippingCost = supplierGroups.reduce((sum, group) => {
    const selectedMethodId = shippingSelections[group.supplierId];
    const method = group.availableMethods.find(m => m.id === selectedMethodId);
    return sum + (method?.customerPrice || 0);
  }, 0);

  // For single supplier, show simplified UI
  if (supplierGroups.length === 1) {
    const group = supplierGroups[0];
    const selectedMethod = group.availableMethods.find(
      m => m.id === shippingSelections[group.supplierId]
    );

    return (
      <Card data-testid="multi-supplier-shipping">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Shipping Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={shippingSelections[group.supplierId]?.toString()}
            onValueChange={(value) => handleMethodChange(group.supplierId, parseInt(value))}
            data-testid={`shipping-methods-${group.supplierId}`}
          >
            {group.availableMethods.length === 0 ? (
              <div className="text-sm text-muted-foreground p-4 border rounded-lg">
                No shipping methods available
              </div>
            ) : (
              <div className="space-y-3">
                {group.availableMethods.map((method) => (
                  <div
                    key={method.id}
                    className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    data-testid={`method-${method.id}`}
                  >
                    <RadioGroupItem value={method.id.toString()} id={`method-${method.id}`} />
                    <Label
                      htmlFor={`method-${method.id}`}
                      className="flex-1 cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium">{method.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            {method.logisticsCompanyName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {method.estimatedDeliveryDays} {method.estimatedDeliveryDays === 1 ? "day" : "days"}
                          </span>
                        </div>
                      </div>
                      <div className="font-semibold">
                        R{method.customerPrice.toFixed(2)}
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </RadioGroup>
        </CardContent>
      </Card>
    );
  }

  // For multiple suppliers, show detailed breakdown
  return (
    <div className="space-y-6" data-testid="multi-supplier-shipping">
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Multi-Supplier Shipment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Your order contains items from {supplierGroups.length} suppliers
            </span>
            <div className="flex items-center gap-2">
              <span className="font-medium">Total Shipping:</span>
              <Badge variant="secondary" className="text-base">
                R{totalShippingCost.toFixed(2)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supplier Groups */}
      {supplierGroups.map((group, index) => {
        const selectedMethod = group.availableMethods.find(
          m => m.id === shippingSelections[group.supplierId]
        );

        return (
          <Card key={group.supplierId} data-testid={`supplier-group-${group.supplierId}`}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Shipment {index + 1}</Badge>
                </div>
                <span className="text-sm text-muted-foreground">
                  {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                </span>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Shipping method selection */}
              <div>
                <h4 className="text-sm font-medium mb-3">Select shipping method:</h4>
                <RadioGroup
                  value={shippingSelections[group.supplierId]?.toString()}
                  onValueChange={(value) => handleMethodChange(group.supplierId, parseInt(value))}
                  data-testid={`shipping-methods-${group.supplierId}`}
                >
                  {group.availableMethods.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-4 border rounded-lg">
                      No shipping methods configured for this supplier
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {group.availableMethods.map((method) => (
                        <div
                          key={method.id}
                          className="flex items-center space-x-2 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                          data-testid={`method-${method.id}`}
                        >
                          <RadioGroupItem value={method.id.toString()} id={`method-${group.supplierId}-${method.id}`} />
                          <Label
                            htmlFor={`method-${group.supplierId}-${method.id}`}
                            className="flex-1 cursor-pointer flex items-center justify-between"
                          >
                            <div>
                              <div className="font-medium">{method.name}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
                                <span className="flex items-center gap-1">
                                  <Truck className="h-3 w-3" />
                                  {method.logisticsCompanyName}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {method.estimatedDeliveryDays} {method.estimatedDeliveryDays === 1 ? "day" : "days"}
                                </span>
                              </div>
                            </div>
                            <div className="font-semibold">
                              R{method.customerPrice.toFixed(2)}
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </RadioGroup>
              </div>

            </CardContent>
          </Card>
        );
      })}

      {/* Total Summary */}
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Total Shipping Cost</p>
              <p className="text-sm text-muted-foreground">
                {totalItems} {totalItems === 1 ? 'item' : 'items'} from {supplierGroups.length} {supplierGroups.length === 1 ? 'supplier' : 'suppliers'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">R{totalShippingCost.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
