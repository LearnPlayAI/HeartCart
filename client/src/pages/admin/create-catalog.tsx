import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import { Link } from "wouter";
import AdminPageLayout from "@/components/admin/admin-page-layout";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function CreateCatalog() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    supplierId: "",
    isActive: true,
    defaultMarkupPercentage: 0,
    freeShipping: false,
    startDate: "",
    endDate: "",
  });

  // Fetch suppliers for dropdown
  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      const response = await fetch("/api/suppliers?activeOnly=false");
      if (!response.ok) throw new Error("Failed to fetch suppliers");
      const result = await response.json();
      return result.data || [];
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.description.trim() || !formData.supplierId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Name, Description, and Supplier)",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        supplierId: parseInt(formData.supplierId, 10),
        isActive: formData.isActive,
        defaultMarkupPercentage: formData.defaultMarkupPercentage,
        freeShipping: formData.freeShipping,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
      };

      const response = await fetch("/api/catalogs/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "Failed to create catalog");
      }

      const result = await response.json();
      
      toast({
        title: "Success!",
        description: `Catalog "${result.data.name}" has been created successfully.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/catalogs"] });
      setLocation("/admin/catalogs");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create catalog",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminPageLayout>
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/catalogs">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Create New Catalog</h1>
            <p className="text-gray-600">Add a new catalog to organize your products</p>
          </div>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Catalog Details</CardTitle>
            <CardDescription>
              Fill in the information below to create your new catalog
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Catalog Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Summer Collection 2024"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="supplier">Supplier *</Label>
                  <Select
                    value={formData.supplierId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, supplierId: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliersLoading ? (
                        <SelectItem value="loading" disabled>Loading suppliers...</SelectItem>
                      ) : suppliers.length === 0 ? (
                        <SelectItem value="none" disabled>No suppliers available</SelectItem>
                      ) : (
                        suppliers.map((supplier: any) => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()}>
                            {supplier.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe this catalog and what products it will contain..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1 min-h-[100px]"
                    required
                  />
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Settings</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="markup">Default Markup %</Label>
                    <Input
                      id="markup"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="0"
                      value={formData.defaultMarkupPercentage}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        defaultMarkupPercentage: parseFloat(e.target.value) || 0 
                      }))}
                      className="mt-1"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      id="freeShipping"
                      checked={formData.freeShipping}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, freeShipping: checked }))}
                    />
                    <Label htmlFor="freeShipping">Free Shipping</Label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date (Optional)</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="endDate">End Date (Optional)</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label htmlFor="isActive">Active (Catalog is currently visible)</Label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Catalog
                    </>
                  )}
                </Button>
                <Link href="/admin/catalogs">
                  <Button type="button" variant="outline" className="w-full sm:w-auto">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminPageLayout>
  );
}