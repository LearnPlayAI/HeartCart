import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Loader2, Info } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface PricingSetting {
  id: number;
  categoryId: number;
  markupPercentage: number;
  categoryName?: string; // For display purposes
}

export default function PricingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newMarkup, setNewMarkup] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [defaultMarkup, setDefaultMarkup] = useState<number>(50); // Default is 50%

  // Fetch all categories
  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Fetch all pricing settings
  const { data: pricingSettings, isLoading: pricingLoading } = useQuery<PricingSetting[]>({
    queryKey: ["/api/admin/pricing"],
  });

  // Fetch default markup percentage
  const { data: defaultMarkupData } = useQuery<{ markupPercentage: number }>({
    queryKey: ["/api/pricing/default-markup"]
  });
  
  // Update default markup when data is loaded
  useEffect(() => {
    if (defaultMarkupData && defaultMarkupData.markupPercentage) {
      setDefaultMarkup(defaultMarkupData.markupPercentage);
    }
  }, [defaultMarkupData]);

  // Create/update a pricing setting
  const createMutation = useMutation({
    mutationFn: async (data: { categoryId: number; markupPercentage: number }) => {
      const response = await apiRequest("POST", "/api/admin/pricing", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Markup percentage saved successfully",
      });
      setNewMarkup("");
      setSelectedCategory("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to save markup: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Delete a pricing setting
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/pricing/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Category markup removed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete markup: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Prepare pricing settings with category names
  const pricingWithNames = pricingSettings?.map(pricing => {
    const category = categories?.find(cat => cat.id === pricing.categoryId);
    return {
      ...pricing,
      categoryName: category?.name || `Category ID: ${pricing.categoryId}`
    };
  }) || [];

  // Filter out categories that already have pricing settings
  const availableCategories = categories?.filter(
    cat => !pricingSettings?.some(pricing => pricing.categoryId === cat.id)
  ) || [];

  const handleSubmit = () => {
    if (!selectedCategory || !newMarkup) {
      toast({
        title: "Validation Error",
        description: "Please select a category and enter a markup percentage",
        variant: "destructive",
      });
      return;
    }

    const markup = parseFloat(newMarkup);
    if (isNaN(markup) || markup < 0) {
      toast({
        title: "Validation Error",
        description: "Markup percentage must be a positive number",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      categoryId: parseInt(selectedCategory),
      markupPercentage: markup
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to remove this category markup? It will revert to using the default markup.")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Pricing Management</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Add New Markup Card */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="text-xl">Add Category Markup</CardTitle>
              <CardDescription>
                Set specific markup percentages for different product categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Category</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.length === 0 ? (
                        <SelectItem value="none" disabled>All categories have markup settings</SelectItem>
                      ) : (
                        availableCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Markup Percentage (%)</label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Enter markup percentage"
                      value={newMarkup}
                      onChange={(e) => setNewMarkup(e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    This is the percentage added to the cost price to determine the selling price
                  </p>
                </div>

                <Button
                  className="w-full bg-pink-600 hover:bg-pink-700"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || !selectedCategory || !newMarkup}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Save Markup
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Default Markup Info Card */}
          <Card className="col-span-1 md:col-span-2 bg-gradient-to-r from-pink-50 to-white dark:from-pink-950 dark:to-gray-900">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <Info className="mr-2 h-5 w-5 text-pink-600" />
                Default Product Markup
              </CardTitle>
              <CardDescription>
                Information about how product pricing works
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-md bg-white dark:bg-gray-800 shadow-sm">
                  <h3 className="text-lg font-medium mb-2">How pricing works:</h3>
                  <p className="text-sm mb-2">
                    When setting product prices, the system follows this hierarchy:
                  </p>
                  <ol className="list-decimal pl-5 space-y-1 text-sm mb-3">
                    <li>
                      <strong>Category-specific markup</strong>: If a category has a set markup percentage, all products in that category use this percentage
                    </li>
                    <li>
                      <strong>Default markup</strong>: If no category-specific markup exists, products use the default markup ({defaultMarkup}%)
                    </li>
                    <li>
                      <strong>Manual override</strong>: Any manually set selling price takes precedence
                    </li>
                  </ol>
                  <p className="text-sm">
                    <strong>Formula</strong>: Selling Price = Cost Price × (1 + Markup% ÷ 100)
                  </p>
                  <p className="text-sm mt-2">
                    Example: Cost Price R100 with 50% markup = R150 selling price
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Settings Table */}
        <Card>
          <CardHeader>
            <CardTitle>Category Markup Settings</CardTitle>
            <CardDescription>
              View and manage category-specific markup percentages
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pricingLoading || categoriesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
              </div>
            ) : pricingWithNames.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No category-specific markup settings defined yet.</p>
                <p className="text-sm mt-2">All products will use the default markup of {defaultMarkup}%</p>
              </div>
            ) : (
              <Table>
                <TableCaption>
                  Category markup settings override the default {defaultMarkup}% markup
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Markup Percentage</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pricingWithNames.map((pricing) => (
                    <TableRow key={pricing.id}>
                      <TableCell className="font-medium">
                        {pricing.categoryName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium">
                          {pricing.markupPercentage}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(pricing.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Remove this markup setting</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}