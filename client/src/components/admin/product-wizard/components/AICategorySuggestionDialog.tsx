import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, Sparkles, CheckCircle, Plus, Brain } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import slugify from 'slugify';

interface CategorySuggestion {
  parentCategory: { id: number; name: string } | null;
  childCategory: { id: number; name: string } | null;
  confidence: number;
  reasoning: string;
}

interface NewCategorySuggestion {
  parentName: string;
  childName: string;
  reasoning: string;
}

interface AICategorySuggestionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  productDescription: string;
  onCategorySelected: (parentId: number, childId: number | null) => void;
}

export function AICategorySuggestionDialog({
  isOpen,
  onOpenChange,
  productName,
  productDescription,
  onCategorySelected,
}: AICategorySuggestionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSuggestion, setSelectedSuggestion] = useState<CategorySuggestion | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState<{
    parentName: string;
    childName: string;
    reasoning: string;
  } | null>(null);

  // Fetch categories for checking existing ones
  const categoriesQuery = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/categories');
      const data = await response.json();
      return data.success ? data.data : [];
    },
  });

  const categories = categoriesQuery.data || [];

  // Fetch AI category suggestions
  const categorySuggestionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/ai/suggest-categories', {
        productName,
        productDescription,
      });
      const data = await response.json();
      console.log('AI Category Suggestions Response:', data);
      
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to get category suggestions');
      }
      
      return data.data;
    },
    onError: (error) => {
      console.error('Error fetching category suggestions:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get AI category suggestions. Please check your AI service configuration and try again.',
        variant: 'destructive',
      });
    },
  });

  // Create new category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: {
      name: string;
      slug: string;
      description: string;
      parentId?: number;
      level: number;
      displayOrder: number;
    }) => {
      const response = await apiRequest('POST', '/api/categories', categoryData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({
        title: 'Success',
        description: 'Categories created successfully!',
      });
    },
    onError: (error) => {
      console.error('Error creating category:', error);
      toast({
        title: 'Error',
        description: 'Failed to create categories. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Generate AI suggestions when dialog opens
  React.useEffect(() => {
    if (isOpen && productName && productDescription) {
      categorySuggestionMutation.mutate();
    }
  }, [isOpen, productName, productDescription]);

  const handleSelectSuggestion = (suggestion: CategorySuggestion) => {
    console.log('Selected suggestion:', suggestion);
    setSelectedSuggestion(suggestion);
    // Clear any new category selection when selecting existing category
    setNewCategoryData(null);
  };

  const handleApproveSelection = () => {
    console.log('Applying selection:', selectedSuggestion);
    if (selectedSuggestion?.parentCategory) {
      const parentId = selectedSuggestion.parentCategory.id;
      const childId = selectedSuggestion.childCategory?.id || null;
      onCategorySelected(parentId, childId);
      onOpenChange(false);
      toast({
        title: 'Categories Applied',
        description: 'Product categories have been updated successfully.',
      });
    }
  };

  const handleCreateNewCategories = async () => {
    if (!newCategoryData) {
      toast({
        title: 'Error',
        description: 'No category data selected.',
        variant: 'destructive',
      });
      return;
    }

    if (categoriesQuery.isLoading) {
      toast({
        title: 'Please wait',
        description: 'Categories are still loading. Please try again in a moment.',
        variant: 'default',
      });
      return;
    }

    if (!Array.isArray(categories) || categories.length === 0) {
      toast({
        title: 'Error',
        description: 'Categories not loaded yet. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCreatingCategory(true);

      // First, check if parent category already exists
      const parentSlug = slugify(newCategoryData.parentName, { lower: true, strict: true });
      let parentId = null;
      
      // Look for existing parent category by name
      const existingParent = categories.find(
        cat => cat.name.toLowerCase() === newCategoryData.parentName.toLowerCase() && cat.level === 0
      );

      if (existingParent) {
        // Use existing parent category
        parentId = existingParent.id;
      } else {
        // Create new parent category - get max display order for parent categories (level 0)
        const parentCategories = categories.filter(cat => cat.level === 0);
        const maxParentDisplayOrder = parentCategories.length > 0 
          ? Math.max(...parentCategories.map(cat => cat.displayOrder || 0))
          : 0;

        const parentCategoryData = {
          name: newCategoryData.parentName,
          slug: parentSlug,
          description: `AI-suggested parent category for ${productName}`,
          parentId: null,
          level: 0,
          displayOrder: maxParentDisplayOrder + 1,
        };
        
        console.log('Creating parent category with data:', parentCategoryData);
        const parentResponse = await createCategoryMutation.mutateAsync(parentCategoryData);
        parentId = parentResponse.id;
      }

      let childId = null;
      if (newCategoryData.childName) {
        // Get the highest display order for children under this specific parent
        const siblingChildren = categories.filter(cat => cat.parentId === parentId && cat.level === 1);
        const maxChildDisplayOrder = siblingChildren.length > 0 
          ? Math.max(...siblingChildren.map(cat => cat.displayOrder || 0))
          : 0;

        // Create child category with parent-prefixed slug
        const childSlug = `${parentSlug}-${slugify(newCategoryData.childName, { lower: true, strict: true })}`;
        const childCategoryData = {
          name: newCategoryData.childName,
          slug: childSlug,
          description: `AI-suggested child category for ${productName}`,
          parentId: parentId,
          level: 1,
          displayOrder: maxChildDisplayOrder + 1,
        };
        
        console.log('Creating child category with data:', childCategoryData);
        const childResponse = await createCategoryMutation.mutateAsync(childCategoryData);
        childId = childResponse.id;
      }

      // Apply the categories
      onCategorySelected(parentId, childId);
      onOpenChange(false);
      setIsCreatingCategory(false);
      setNewCategoryData(null);

      toast({
        title: 'Categories Created',
        description: childId 
          ? 'New child category has been created and applied to the product.'
          : 'New categories have been created and applied to the product.',
      });
    } catch (error) {
      console.error('Error creating categories:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response,
      });
      setIsCreatingCategory(false);
      
      // Try to get more specific error message
      let errorMessage = 'Failed to create categories. Please try again.';
      if (error.response) {
        try {
          const errorData = await error.response.json();
          errorMessage = errorData.error?.message || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const suggestions = categorySuggestionMutation.data?.suggestions || [];
  const newCategorySuggestions = categorySuggestionMutation.data?.newCategorySuggestions || [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI Category Suggestions
          </DialogTitle>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs font-medium text-blue-700 mb-1">Product Name:</p>
              <p className="text-sm text-blue-900 font-semibold">{productName}</p>
            </div>
            <DialogDescription>
              Based on your product details above, here are the AI-recommended categories:
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {categorySuggestionMutation.isPending && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Analyzing product and suggesting categories...</span>
              </div>
            </div>
          )}

          {categorySuggestionMutation.isError && (
            <Card className="border-destructive">
              <CardContent className="p-4">
                <p className="text-destructive text-sm">
                  Failed to get category suggestions. Please check your AI service configuration and try again.
                </p>
              </CardContent>
            </Card>
          )}

          {newCategorySuggestions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-green-500" />
                <h3 className="font-medium">Suggested New Categories</h3>
                <Badge variant="outline">Create New</Badge>
              </div>

              <div className="grid gap-4">
                {newCategorySuggestions.map((newSuggestion, index) => (
                  <Card
                    key={index}
                    className={`cursor-pointer transition-colors ${
                      newCategoryData === newSuggestion
                        ? 'border-green-500 bg-green-50'
                        : 'hover:border-muted-foreground/20'
                    }`}
                    onClick={() => {
                      console.log('Selected new category:', newSuggestion);
                      setNewCategoryData(newSuggestion);
                      // Clear any existing category selection when selecting new category
                      setSelectedSuggestion(null);
                    }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base text-green-700">
                          {newSuggestion.parentName}
                          {newSuggestion.childName && (
                            <span className="text-muted-foreground"> → {newSuggestion.childName}</span>
                          )}
                        </CardTitle>
                        {newCategoryData === newSuggestion && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{newSuggestion.reasoning}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {suggestions.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  <h3 className="font-medium">Existing Category Matches</h3>
                </div>

                <div className="grid gap-4">
                  {suggestions.map((suggestion, index) => (
                    <Card
                      key={index}
                      className={`cursor-pointer transition-colors ${
                        selectedSuggestion === suggestion
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-muted-foreground/20'
                      }`}
                      onClick={() => handleSelectSuggestion(suggestion)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">
                              {suggestion.parentCategory?.name}
                              {suggestion.childCategory && (
                                <span className="text-muted-foreground"> → {suggestion.childCategory.name}</span>
                              )}
                            </CardTitle>
                            {selectedSuggestion === suggestion && (
                              <CheckCircle className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <Badge variant={suggestion.confidence > 80 ? 'default' : 'secondary'}>
                            {suggestion.confidence}% match
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{suggestion.reasoning}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}

          {suggestions.length === 0 && newCategorySuggestions.length === 0 && !categorySuggestionMutation.isPending && !categorySuggestionMutation.isError && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No category suggestions available for this product.</p>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          
          <Button 
            onClick={(e) => {
              console.log('Apply button clicked!', selectedSuggestion);
              e.preventDefault();
              e.stopPropagation();
              handleApproveSelection();
            }}
            disabled={!selectedSuggestion}
          >
            Apply Selected Category
          </Button>
          
          <Button
            onClick={(e) => {
              console.log('Create button clicked!', newCategoryData);
              e.preventDefault();
              e.stopPropagation();
              handleCreateNewCategories();
            }}
            disabled={!newCategoryData || isCreatingCategory || createCategoryMutation.isPending || categoriesQuery.isLoading || !Array.isArray(categories)}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
          >
            {isCreatingCategory || createCategoryMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create & Apply Categories
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}