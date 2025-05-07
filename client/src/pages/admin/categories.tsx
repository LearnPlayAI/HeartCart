import { AdminLayout } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Plus, 
  Edit, 
  Trash, 
  MoreHorizontal, 
  FolderTree, 
  Tag, 
  ChevronRight, 
  Layers, 
  ArrowUpDown 
} from "lucide-react";
import { slugify } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Category } from "@shared/schema";
import { Link, useLocation } from "wouter";

export default function AdminCategories() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [newLevel, setNewLevel] = useState<number>(0);
  const [newDisplayOrder, setNewDisplayOrder] = useState<number>(0);
  const [categoryView, setCategoryView] = useState<'grid' | 'tree'>('grid');
  const [filterLevel, setFilterLevel] = useState<string | null>(null);
  
  // Fetch categories
  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return await response.json();
    },
  });
  
  // Fetch hierarchical category data for tree view
  const { data: hierarchicalCategories } = useQuery<Array<{ category: Category, children: Category[] }>>({
    queryKey: ["/api/categories/main/with-children"],
    queryFn: async () => {
      const response = await fetch("/api/categories/main/with-children");
      if (!response.ok) throw new Error("Failed to fetch hierarchical categories");
      return await response.json();
    },
  });

  // Create category mutation
  const createMutation = useMutation({
    mutationFn: async (data: { 
      name: string; 
      slug: string; 
      description: string; 
      parentId?: number;
      level: number;
      displayOrder: number;
    }) => {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create category");
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories/main/with-children"] });
      toast({
        title: "Category created",
        description: "The category has been created successfully",
      });
      setNewName("");
      setNewSlug("");
      setNewDescription("");
      setNewParentId(null);
      setNewLevel(0);
      setNewDisplayOrder(0);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  // Update category mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { 
      id: number; 
      name: string; 
      slug: string; 
      description: string;
      parentId?: number | null;
      level: number;
      displayOrder: number;
    }) => {
      const response = await fetch(`/api/categories/${data.id}`, {
        method: "PUT", // Changed from PATCH to match server implementation
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          slug: data.slug,
          description: data.description,
          parentId: data.parentId === 0 ? null : data.parentId,
          level: data.level,
          displayOrder: data.displayOrder
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update category");
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories/main/with-children"] });
      toast({
        title: "Category updated",
        description: "The category has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  // Delete category mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete category");
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories/main/with-children"] });
      toast({
        title: "Category deleted",
        description: "The category has been deleted successfully",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  // Update display order mutation
  const updateDisplayOrderMutation = useMutation({
    mutationFn: async (data: { id: number; displayOrder: number }) => {
      const response = await fetch(`/api/categories/${data.id}/display-order`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayOrder: data.displayOrder }),
      });

      if (!response.ok) {
        throw new Error("Failed to update category display order");
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories/main/with-children"] });
      toast({
        title: "Display order updated",
        description: "The category display order has been updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  // Effect to set initial display order for new categories
  useEffect(() => {
    if (categories && categories.length > 0) {
      // If parent is selected, find the max display order among its children
      if (newParentId) {
        const parentIdNum = parseInt(newParentId);
        const siblingCategories = categories.filter(c => c.parentId === parentIdNum);
        if (siblingCategories.length > 0) {
          const maxOrder = Math.max(...siblingCategories.map(c => c.displayOrder || 0));
          setNewDisplayOrder(maxOrder + 1);
          return;
        }
      }
      
      // Otherwise, for level 0 categories
      const levelZeroCategories = categories.filter(c => c.level === 0);
      if (levelZeroCategories.length > 0) {
        const maxOrder = Math.max(...levelZeroCategories.map(c => c.displayOrder || 0));
        setNewDisplayOrder(maxOrder + 1);
      } else {
        setNewDisplayOrder(0);
      }
    }
  }, [categories, newParentId]);

  // Effect to update level based on parent selection
  useEffect(() => {
    if (newParentId) {
      const parentCategory = categories?.find(c => c.id === parseInt(newParentId));
      if (parentCategory) {
        setNewLevel((parentCategory.level || 0) + 1);
      }
    } else {
      setNewLevel(0);
    }
  }, [newParentId, categories]);

  const handleCreateCategory = () => {
    if (!newName) {
      toast({
        title: "Validation Error",
        description: "Category name is required",
        variant: "destructive"
      });
      return;
    }
    
    createMutation.mutate({
      name: newName,
      slug: newSlug || slugify(newName),
      description: newDescription,
      parentId: newParentId ? parseInt(newParentId) : undefined,
      level: newLevel,
      displayOrder: newDisplayOrder
    });
  };

  const handleEditClick = (category: Category) => {
    setSelectedCategory(category);
    setNewName(category.name);
    setNewSlug(category.slug);
    setNewDescription(category.description || "");
    setNewParentId(category.parentId ? category.parentId.toString() : null);
    setNewLevel(category.level || 0);
    setNewDisplayOrder(category.displayOrder || 0);
  };

  const handleUpdateCategory = () => {
    if (!selectedCategory) return;
    
    if (!newName) {
      toast({
        title: "Validation Error",
        description: "Category name is required",
        variant: "destructive"
      });
      return;
    }
    
    updateMutation.mutate({
      id: selectedCategory.id,
      name: newName,
      slug: newSlug || slugify(newName),
      description: newDescription,
      parentId: newParentId ? parseInt(newParentId) : null,
      level: newLevel,
      displayOrder: newDisplayOrder
    });
  };

  const handleDeleteClick = (category: Category) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteCategory = () => {
    if (selectedCategory) {
      deleteMutation.mutate(selectedCategory.id);
    }
  };
  
  // Helper to get parent category name
  const getCategoryParentName = (category: Category): string => {
    if (!category.parentId) return "None";
    const parent = categories?.find(c => c.id === category.parentId);
    return parent ? parent.name : "Unknown";
  };

  return (
    <AdminLayout>
      <div className="flex flex-col space-y-6">
        {/* Header with title and actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Categories</h2>
            <p className="text-muted-foreground">
              Manage product categories and organization
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="space-x-2">
                <Plus className="h-4 w-4" />
                <span>Add Category</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Category</DialogTitle>
                <DialogDescription>
                  Add a new category to organize your products.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input 
                    id="name" 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)} 
                    placeholder="Category Name" 
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="slug">Slug</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="slug" 
                      value={newSlug} 
                      onChange={(e) => setNewSlug(e.target.value)} 
                      placeholder={slugify(newName) || "category-slug"} 
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setNewSlug(slugify(newName))}
                    >
                      Generate
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The URL-friendly version of the name.
                  </p>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description"
                    value={newDescription} 
                    onChange={(e) => setNewDescription(e.target.value)} 
                    placeholder="Category description" 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleCreateCategory} 
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Category
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Category Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !categories || categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No categories found</p>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Category</DialogTitle>
                  <DialogDescription>
                    Add a new category to organize your products.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input 
                      id="name" 
                      value={newName} 
                      onChange={(e) => setNewName(e.target.value)} 
                      placeholder="Category Name" 
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="slug">Slug</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="slug" 
                        value={newSlug} 
                        onChange={(e) => setNewSlug(e.target.value)} 
                        placeholder={slugify(newName) || "category-slug"} 
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setNewSlug(slugify(newName))}
                      >
                        Generate
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      The URL-friendly version of the name.
                    </p>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description"
                      value={newDescription} 
                      onChange={(e) => setNewDescription(e.target.value)} 
                      placeholder="Category description" 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleCreateCategory} 
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Category
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <Card key={category.id} className="overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-pink-100 to-pink-50 flex items-center justify-center">
                  <h3 className="text-xl font-bold text-pink-800">{category.name}</h3>
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Slug: {category.slug}</p>
                      {category.isActive ? (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Dialog>
                            <DialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => {
                                e.preventDefault();
                                handleEditClick(category);
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Category</DialogTitle>
                                <DialogDescription>
                                  Update the category details
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                  <Label htmlFor="edit-name">Name</Label>
                                  <Input 
                                    id="edit-name" 
                                    value={newName} 
                                    onChange={(e) => setNewName(e.target.value)} 
                                  />
                                </div>
                                
                                <div className="grid gap-2">
                                  <Label htmlFor="edit-slug">Slug</Label>
                                  <div className="flex gap-2">
                                    <Input 
                                      id="edit-slug" 
                                      value={newSlug} 
                                      onChange={(e) => setNewSlug(e.target.value)} 
                                    />
                                    <Button 
                                      type="button" 
                                      variant="outline" 
                                      onClick={() => setNewSlug(slugify(newName))}
                                    >
                                      Generate
                                    </Button>
                                  </div>
                                </div>
                                
                                <div className="grid gap-2">
                                  <Label htmlFor="edit-description">Description</Label>
                                  <Textarea 
                                    id="edit-description"
                                    value={newDescription} 
                                    onChange={(e) => setNewDescription(e.target.value)} 
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button 
                                  onClick={handleUpdateCategory} 
                                  disabled={updateMutation.isPending}
                                >
                                  {updateMutation.isPending && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  )}
                                  Update Category
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onSelect={(e) => {
                              e.preventDefault();
                              handleDeleteClick(category);
                            }}
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {category.description && (
                    <p className="text-sm text-muted-foreground">
                      {category.description.length > 100
                        ? `${category.description.substring(0, 100)}...`
                        : category.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this category? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteCategory}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}