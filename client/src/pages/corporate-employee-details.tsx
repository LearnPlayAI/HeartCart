import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Building2, User, Plus, Trash2, Package, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

interface EmployeeDetail {
  id?: number;
  employeeName: string;
  employeeEmail: string;
  employeePhone: string;
  employeeAddress: string;
  specialInstructions?: string;
}

interface CorporateOrder {
  id: number;
  orderNumber: string;
  companyName: string;
  contactPerson: string;
  contactEmail: string;
  paymentStatus: string;
  status: string;
  totalAmount: string;
  items: any[];
}

export default function CorporateEmployeeDetailsPage() {
  const [, navigate] = useLocation();
  const { orderNumber } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [employees, setEmployees] = useState<EmployeeDetail[]>([
    {
      employeeName: "",
      employeeEmail: "",
      employeePhone: "",
      employeeAddress: "",
      specialInstructions: ""
    }
  ]);

  // Fetch corporate order by order number
  const { data: orderData, isLoading } = useQuery({
    queryKey: [`/api/corporate-orders/public/${orderNumber}`],
    queryFn: () => apiRequest('GET', `/api/corporate-orders/public/${orderNumber}`),
    enabled: !!orderNumber
  });

  const order = orderData?.order;

  // Submit employee details mutation
  const submitEmployeeDetailsMutation = useMutation({
    mutationFn: async (employeeData: { employees: EmployeeDetail[] }) => {
      const response = await apiRequest('POST', `/api/corporate-orders/public/${orderNumber}/employee-details`, employeeData);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee delivery details submitted successfully. The admin will now process your shipments.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to submit employee details",
        variant: "destructive",
      });
    },
  });

  const addEmployee = () => {
    setEmployees([...employees, {
      employeeName: "",
      employeeEmail: "",
      employeePhone: "",
      employeeAddress: "",
      specialInstructions: ""
    }]);
  };

  const removeEmployee = (index: number) => {
    if (employees.length > 1) {
      setEmployees(employees.filter((_, i) => i !== index));
    }
  };

  const updateEmployee = (index: number, field: keyof EmployeeDetail, value: string) => {
    const updated = [...employees];
    updated[index] = { ...updated[index], [field]: value };
    setEmployees(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all employees have required fields
    const invalidEmployees = employees.filter(emp => 
      !emp.employeeName || !emp.employeeEmail || !emp.employeeAddress
    );

    if (invalidEmployees.length > 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields for all employees",
        variant: "destructive",
      });
      return;
    }

    submitEmployeeDetailsMutation.mutate({ employees });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
            <p className="text-gray-600">The order number you provided could not be found or may have expired.</p>
          </div>
        </div>
      </div>
    );
  }

  if (order.paymentStatus !== 'paid') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Payment Required</h1>
            <p className="text-gray-600">This order must be paid before you can submit employee delivery details.</p>
            <p className="text-sm text-gray-500 mt-2">Current status: {order.paymentStatus}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="h-8 w-8 text-pink-600" />
            <h1 className="text-3xl font-bold text-gray-900">Employee Delivery Details</h1>
          </div>
          <p className="text-gray-600">
            Please provide delivery details for each employee who should receive items from your corporate order
          </p>
        </div>

        {/* Order Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Order Number</p>
                <p className="font-medium">{order.orderNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Company</p>
                <p className="font-medium">{order.companyName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="font-medium">{formatCurrency(parseFloat(order.totalAmount))}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">Items ({order.items?.length || 0})</p>
              <div className="space-y-2">
                {order.items?.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">{item.productName}</span>
                      <span className="text-sm text-gray-600 ml-2">Qty: {item.quantity}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(parseFloat(item.totalPrice))}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Details Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {employees.map((employee, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Employee {index + 1}
                  </CardTitle>
                  {employees.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeEmployee(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`name-${index}`}>Employee Name *</Label>
                    <Input
                      id={`name-${index}`}
                      value={employee.employeeName}
                      onChange={(e) => updateEmployee(index, 'employeeName', e.target.value)}
                      placeholder="Full name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor={`email-${index}`}>Email Address *</Label>
                    <Input
                      id={`email-${index}`}
                      type="email"
                      value={employee.employeeEmail}
                      onChange={(e) => updateEmployee(index, 'employeeEmail', e.target.value)}
                      placeholder="employee@company.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor={`phone-${index}`}>Phone Number</Label>
                  <Input
                    id={`phone-${index}`}
                    value={employee.employeePhone}
                    onChange={(e) => updateEmployee(index, 'employeePhone', e.target.value)}
                    placeholder="+27 XX XXX XXXX"
                  />
                </div>

                <div>
                  <Label htmlFor={`address-${index}`}>Delivery Address *</Label>
                  <Textarea
                    id={`address-${index}`}
                    value={employee.employeeAddress}
                    onChange={(e) => updateEmployee(index, 'employeeAddress', e.target.value)}
                    placeholder="Complete delivery address including street, city, postal code"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor={`instructions-${index}`}>Special Instructions</Label>
                  <Textarea
                    id={`instructions-${index}`}
                    value={employee.specialInstructions || ""}
                    onChange={(e) => updateEmployee(index, 'specialInstructions', e.target.value)}
                    placeholder="Any special delivery instructions"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add Employee Button */}
          <div className="text-center">
            <Button
              type="button"
              variant="outline"
              onClick={addEmployee}
              className="border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Employee
            </Button>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <Button
              type="submit"
              disabled={submitEmployeeDetailsMutation.isPending}
              className="bg-pink-600 hover:bg-pink-700 px-8"
            >
              {submitEmployeeDetailsMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit Employee Details
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}