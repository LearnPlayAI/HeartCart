import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Save, Calendar, Target, Settings, Zap, Loader2 } from "lucide-react";
import { z } from "zod";

import { AdminLayout } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PromotionRuleBuilder } from "@/components/admin/PromotionRuleBuilder";

// Form validation schema
const promotionSchema = z.object({
  promotionName: z.string().min(1, "Promotion name is required"),
  description: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  isActive: z.boolean().default(true),
  promotionType: z.enum(["percentage", "fixed", "bogo"]),
  discountValue: z.string().optional(),
  minimumOrderValue: z.string().optional(),
  rules: z.any().optional(),
});

type PromotionFormData = z.infer<typeof promotionSchema>;

interface Promotion {
  id: number;
  promotionName: string;
  description?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  promotionType: 'percentage' | 'fixed' | 'bogo';
  discountValue?: number;
  minimumOrderValue?: number;
  rules?: any;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

export default function EditPromotionPage() {
  const params = useParams();
  const promotionId = params.id ? parseInt(params.id) : null;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PromotionFormData>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      promotionName: "",
      description: "",
      startDate: "",
      endDate: "",
      isActive: true,
      promotionType: "percentage",
      discountValue: "",
      minimumOrderValue: "",
      rules: null,
    },
  });

  // Fetch promotion data
  const { data: promotionResponse, isLoading: isLoadingPromotion, error } = useQuery({
    queryKey: ['/api/promotions', promotionId],
    enabled: !!promotionId,
  });

  // Update form when promotion data is loaded
  useEffect(() => {
    if (promotionResponse?.success && promotionResponse.data) {
      const promotionData = promotionResponse.data;
      form.reset({
        promotionName: promotionData.promotionName || "",
        description: promotionData.description || "",
        startDate: promotionData.startDate ? promotionData.startDate.split('T')[0] : "",
        endDate: promotionData.endDate ? promotionData.endDate.split('T')[0] : "",
        isActive: promotionData.isActive || false,
        promotionType: promotionData.promotionType || "",
        discountValue: promotionData.discountValue ? promotionData.discountValue.toString() : "",
        minimumOrderValue: promotionData.minimumOrderValue ? promotionData.minimumOrderValue.toString() : "",
        rules: promotionData.rules || null,
      });
    }
  }, [promotionResponse, form]);

  const updatePromotionMutation = useMutation({
    mutationFn: (data: PromotionFormData) => 
      apiRequest(`/api/promotions/${promotionId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...data,
          discountValue: data.discountValue ? parseFloat(data.discountValue) : undefined,
          minimumOrderValue: data.minimumOrderValue ? parseFloat(data.minimumOrderValue) : undefined,
        }),
      }),
    onSuccess: () => {
      // Invalidate all promotion-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/promotions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/promotions/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/promotions/active-with-products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/promotions', promotionId] });
      
      toast({
        title: "Success",
        description: "Promotion updated successfully",
      });
      
      setLocation('/admin/promotions');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update promotion",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PromotionFormData) => {
    updatePromotionMutation.mutate(data);
  };

  const handleCancel = () => {
    setLocation('/admin/promotions');
  };

  if (!promotionId) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="text-red-500 text-lg">Invalid promotion ID</div>
                <Button onClick={handleCancel} variant="outline">
                  Return to Promotions
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="text-red-500 text-lg">Error loading promotion</div>
                <div className="text-sm text-muted-foreground">
                  {error?.message || "Failed to load promotion data"}
                </div>
                <Button onClick={handleCancel} variant="outline">
                  Return to Promotions
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  if (isLoadingPromotion) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-pink-500" />
                <div className="text-lg">Loading promotion...</div>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCancel}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Promotions</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Edit Promotion</h1>
              <p className="text-muted-foreground">
                Update "{promotionResponse?.data?.promotionName}" promotion settings
              </p>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Basic Information Card */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-pink-500" />
                    <CardTitle>Basic Information</CardTitle>
                  </div>
                  <CardDescription>
                    Update the fundamental details for your promotion campaign
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="promotionName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Promotion Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Father's Day Sale" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="promotionType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select discount type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="percentage">Percentage Discount</SelectItem>
                              <SelectItem value="fixed">Fixed Amount Discount</SelectItem>
                              <SelectItem value="bogo">Buy One Get One</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Promotional campaign description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Schedule & Status Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-pink-500" />
                    <CardTitle>Schedule & Status</CardTitle>
                  </div>
                  <CardDescription>
                    Update the promotion timeline and activation status
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active Status</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Enable this promotion immediately
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Discount Configuration Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Settings className="h-5 w-5 text-pink-500" />
                    <CardTitle>Discount Configuration</CardTitle>
                  </div>
                  <CardDescription>
                    Configure discount values and minimum requirements
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="discountValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount Value</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="25" 
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="minimumOrderValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Order Value (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="100" 
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Advanced Rules Card */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Zap className="h-5 w-5 text-pink-500" />
                    <CardTitle>Advanced Rules</CardTitle>
                  </div>
                  <CardDescription>
                    Update complex promotional rules like "Any 2 for R99" or quantity-based pricing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="rules"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <PromotionRuleBuilder
                            value={field.value}
                            onChange={field.onChange}
                            disabled={updatePromotionMutation.isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCancel}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updatePromotionMutation.isPending}
                    className="w-full sm:w-auto bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700"
                  >
                    {updatePromotionMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Update Promotion
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </AdminLayout>
  );
}