import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Package, Truck, User, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import AdminLayout from "@/components/admin/layout";

interface CorporateOrderItem {
  id: number;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  employeeName?: string;
  employeeEmail?: string;
  employeePhone?: string;
  employeeAddress?: string;
  size?: string;
  color?: string;
  packageId?: string;
}

interface CorporateOrder {
  id: number;
  orderNumber: string;
  companyName: string;
  paymentStatus: string;
  status: string;
  supplierOrderPlaced: boolean;
  items: CorporateOrderItem[];
}

interface CreateShipmentData {
  packageId: string;
  employeeName: string;
  deliveryAddress: string;
  specialInstructions?: string;
  estimatedDeliveryDate?: string;
  itemIds: number[];
}

export default function CorporateOrderAddShipmentPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [shipmentData, setShipmentData] = useState<Partial<CreateShipmentData>>({
    packageId: "",
    employeeName: "",
    deliveryAddress: "",
    specialInstructions: "",
    itemIds: []
  });

  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  // Fetch corporate order details with items
  const { data: orderData, isLoading } = useQuery({
    queryKey: [`/api/admin/corporate-orders/${orderId}`],
    queryFn: () => apiRequest('GET', `/api/admin/corporate-orders/${orderId}`),
    enabled: !!orderId
  });

  // Create shipment mutation
  const createShipmentMutation = useMutation({
    mutationFn: async (shipmentData: CreateShipmentData) => {
      const response = await apiRequest('POST', `/api/admin/corporate-orders/${orderId}/shipments`, shipmentData);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee shipment created successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/corporate-orders/${orderId}`] });
      navigate(`/admin/corporate-orders/${orderId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create shipment",
        variant: "destructive",
      });
    },
  });

  const order = orderData?.order as CorporateOrder;
  const items = orderData?.items || [];

  // Filter items that haven't been assigned to shipments yet
  const availableItems = order?.items?.filter((item: CorporateOrderItem) => !item.packageId) || [];
  
  // Group available items by employee
  const itemsByEmployee = availableItems.reduce((acc: { [key: string]: CorporateOrderItem[] }, item: CorporateOrderItem) => {
    const key = `${item.employeeName}-${item.employeeEmail}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const handleItemSelection = (itemId: number, checked: boolean) => {
    const newSelectedItems = new Set(selectedItems);
    if (checked) {
      newSelectedItems.add(itemId);
    } else {
      newSelectedItems.delete(itemId);
    }
    setSelectedItems(newSelectedItems);
  };

  const handleEmployeeSelection = (employeeItems: CorporateOrderItem[], checked: boolean) => {
    const newSelectedItems = new Set(selectedItems);
    employeeItems.forEach(item => {
      if (checked) {
        newSelectedItems.add(item.id);
      } else {
        newSelectedItems.delete(item.id);
      }
    });
    setSelectedItems(newSelectedItems);

    // Auto-fill employee details if selecting all items for an employee
    if (checked && employeeItems.length > 0) {
      const firstItem = employeeItems[0];
      setShipmentData(prev => ({
        ...prev,
        employeeName: firstItem.employeeName,
        deliveryAddress: firstItem.employeeAddress || "",
        packageId: `PKG-${orderId}-${Date.now()}`
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shipmentData.packageId || !shipmentData.employeeName || !shipmentData.deliveryAddress) {
      toast({
        title: "Error",
        description: "Package ID, employee name, and delivery address are required",
        variant: "destructive",
      });
      return;
    }

    if (selectedItems.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one item for the shipment",
        variant: "destructive",
      });
      return;
    }

    createShipmentMutation.mutate({
      ...shipmentData,
      itemIds: Array.from(selectedItems)
    } as CreateShipmentData);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
            <Button onClick={() => navigate('/admin/corporate-orders')}>
              Back to Corporate Orders
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Check if order is paid before allowing shipment creation
  if (order.paymentStatus !== 'paid') {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/admin/corporate-orders/${orderId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Order
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Create Shipment</h1>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold">Payment Required</h3>
                  <p className="text-muted-foreground">
                    This corporate order must be paid before you can create shipments. 
                    Current payment status: <span className="font-medium">{order.paymentStatus}</span>
                  </p>
                </div>
                <Button onClick={() => navigate(`/admin/corporate-orders/${orderId}`)}>
                  Back to Order Details
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/admin/corporate-orders/${orderId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Order
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-pink-600">Create Employee Shipment</h1>
            <p className="text-muted-foreground">Split items from corporate order: {order.orderNumber}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Shipment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Employee Shipment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="packageId">Package ID *</Label>
                  <Input
                    id="packageId"
                    value={shipmentData.packageId || ""}
                    onChange={(e) => setShipmentData(prev => ({ ...prev, packageId: e.target.value }))}
                    placeholder="e.g., PKG-CORP-001"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="employeeName">Employee Name *</Label>
                  <Input
                    id="employeeName"
                    value={shipmentData.employeeName || ""}
                    onChange={(e) => setShipmentData(prev => ({ ...prev, employeeName: e.target.value }))}
                    placeholder="Employee receiving the shipment"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="deliveryAddress">Delivery Address *</Label>
                <Textarea
                  id="deliveryAddress"
                  value={shipmentData.deliveryAddress || ""}
                  onChange={(e) => setShipmentData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                  placeholder="Complete delivery address for this employee"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estimatedDeliveryDate">Estimated Delivery Date</Label>
                  <Input
                    id="estimatedDeliveryDate"
                    type="date"
                    value={shipmentData.estimatedDeliveryDate || ""}
                    onChange={(e) => setShipmentData(prev => ({ ...prev, estimatedDeliveryDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="specialInstructions">Special Instructions</Label>
                  <Textarea
                    id="specialInstructions"
                    value={shipmentData.specialInstructions || ""}
                    onChange={(e) => setShipmentData(prev => ({ ...prev, specialInstructions: e.target.value }))}
                    placeholder="Special delivery instructions"
                    rows={2}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Item Selection by Employee */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Select Items for Employee Shipment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(itemsByEmployee).length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(itemsByEmployee).map(([employeeKey, employeeItems]) => {
                    const employee = employeeItems[0];
                    const allEmployeeItemsSelected = employeeItems.every(item => selectedItems.has(item.id));
                    const someEmployeeItemsSelected = employeeItems.some(item => selectedItems.has(item.id));
                    
                    return (
                      <div key={employeeKey} className="border rounded-lg p-4 space-y-3">
                        {/* Employee Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={allEmployeeItemsSelected}
                              ref={(el) => {
                                if (el) el.indeterminate = someEmployeeItemsSelected && !allEmployeeItemsSelected;
                              }}
                              onCheckedChange={(checked) => 
                                handleEmployeeSelection(employeeItems, checked as boolean)
                              }
                            />
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <User className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">{employee.employeeName}</span>
                              </div>
                              <div className="text-sm text-gray-600 space-y-1">
                                <div>Email: {employee.employeeEmail}</div>
                                {employee.employeePhone && <div>Phone: {employee.employeePhone}</div>}
                                {employee.employeeAddress && <div>Address: {employee.employeeAddress}</div>}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">{employeeItems.length} item(s)</p>
                            <p className="font-medium">
                              {formatCurrency(employeeItems.reduce((total, item) => total + parseFloat(item.totalPrice), 0))}
                            </p>
                          </div>
                        </div>

                        {/* Employee Items */}
                        <div className="ml-6 space-y-2">
                          {employeeItems.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                              <Checkbox
                                checked={selectedItems.has(item.id)}
                                onCheckedChange={(checked) => 
                                  handleItemSelection(item.id, checked as boolean)
                                }
                              />
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-medium text-sm">{item.productName}</h4>
                                    <div className="text-xs text-gray-600">
                                      SKU: {item.productSku} | Qty: {item.quantity}
                                      {item.size && ` | Size: ${item.size}`}
                                      {item.color && ` | Color: ${item.color}`}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium text-sm">{formatCurrency(parseFloat(item.totalPrice))}</p>
                                    <p className="text-xs text-gray-600">{formatCurrency(parseFloat(item.unitPrice))} each</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-600">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No items found in this corporate order</p>
                </div>
              )}

              {selectedItems.size > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>{selectedItems.size}</strong> item(s) selected for shipment
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/admin/corporate-orders/${orderId}`)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createShipmentMutation.isPending || selectedItems.size === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createShipmentMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Truck className="h-4 w-4 mr-2" />
                  Create Employee Shipment
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}