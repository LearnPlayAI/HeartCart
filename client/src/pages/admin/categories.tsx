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
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Edit, Trash, MoreHorizontal } from "lucide-react";
import { slugify } from "@/lib/utils";
import { useState } from "react";
import { Category } from "@shared/schema";

export default function AdminCategories() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Fetch categories
  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return await response.json();
    },
  });

  // Create category mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; slug: string; description: string }) => {
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
      toast({
        title: "Category created",
        description: "The category has been created successfully",
      });
      setNewName("");
      setNewSlug("");
      setNewDescription("");
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
    mutationFn: async (data: { id: number; name: string; slug: string; description: string }) => {
      const response = await fetch(`/api/categories/${data.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          slug: data.slug,
          description: data.description
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update category");
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
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
      description: newDescription
    });
  };

  const handleEditClick = (category: Category) => {
    setSelectedCategory(category);
    setNewName(category.name);
    setNewSlug(category.slug);
    setNewDescription(category.description || "");
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
      description: newDescription
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