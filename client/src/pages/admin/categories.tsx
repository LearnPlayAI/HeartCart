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
import { Switch } from "@/components/ui/switch";
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
  GripVertical,
  ArrowUpDown 
} from "lucide-react";
import { slugify, cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Category } from "@shared/schema";
import { useLocation } from "wouter";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function AdminCategories() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [newLevel, setNewLevel] = useState<number>(0);
  const [newDisplayOrder, setNewDisplayOrder] = useState<number>(0);
  const [categoryView, setCategoryView] = useState<'grid' | 'tree'>('tree');
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
      setIsCreateDialogOpen(false);
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
      setIsEditDialogOpen(false);
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
  
  // Update visibility mutation
  const updateVisibilityMutation = useMutation({
    mutationFn: async (data: { id: number; isActive: boolean }) => {
      const response = await fetch(`/api/categories/${data.id}/visibility`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: data.isActive }),
      });

      if (!response.ok) {
        throw new Error("Failed to update category visibility");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories/main/with-children"] });
      toast({
        title: "Visibility updated",
        description: `The category is now ${data.isActive ? 'visible' : 'hidden'}`,
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
    setIsEditDialogOpen(true);
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

  // Handle opening the attributes management page
  const handleManageAttributes = (categoryId: number) => {
    navigate(`/admin/category-attributes/${categoryId}`);
  };
  
  // Handle visibility toggle
  const handleVisibilityToggle = (categoryId: number, isActive: boolean) => {
    updateVisibilityMutation.mutate({
      id: categoryId,
      isActive
    });
  };
  
  // Handle drag end for the drag and drop functionality
  const handleDragEnd = (result: any) => {
    const { destination, source, draggableId, type } = result;
    
    // If no destination, do nothing
    if (!destination) return;
    
    // If dropped in the same place, do nothing
    if (
      destination.droppableId === source.droppableId && 
      destination.index === source.index
    ) {
      return;
    }
    
    // Handle reordering main categories
    if (type === 'MAIN_CATEGORY') {
      if (!hierarchicalCategories) return;
      
      // Get the reordered categories
      const reorderedCategories = Array.from(hierarchicalCategories);
      const [removed] = reorderedCategories.splice(source.index, 1);
      reorderedCategories.splice(destination.index, 0, removed);
      
      // Update display orders for all affected categories
      reorderedCategories.forEach((item, index) => {
        if (item.category.displayOrder !== index) {
          updateDisplayOrderMutation.mutate({
            id: item.category.id,
            displayOrder: index
          });
        }
      });
      
      return;
    }
    
    // Handle reordering subcategories
    if (type === 'SUB_CATEGORY') {
      if (!hierarchicalCategories) return;
      
      // Get the parent category's ID from the droppableId
      const parentId = parseInt(source.droppableId.replace('parent-', ''));
      
      // Find the parent category
      const parentItem = hierarchicalCategories.find(h => h.category.id === parentId);
      if (!parentItem) return;
      
      // Get the reordered subcategories
      const reorderedSubcategories = Array.from(parentItem.children);
      const [removed] = reorderedSubcategories.splice(source.index, 1);
      reorderedSubcategories.splice(destination.index, 0, removed);
      
      // Update display orders for all affected subcategories
      reorderedSubcategories.forEach((item, index) => {
        if (item.displayOrder !== index) {
          updateDisplayOrderMutation.mutate({
            id: item.id,
            displayOrder: index
          });
        }
      });
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
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
                onClick={() => setCategoryView('grid')}
                disabled={categoryView === 'grid'}
              >
                <Layers className="h-4 w-4" />
                <span>Grid View</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
                onClick={() => setCategoryView('tree')}
                disabled={categoryView === 'tree'}
              >
                <FolderTree className="h-4 w-4" />
                <span>Tree View</span>
              </Button>
            </div>
            
            {categoryView === 'grid' && (
              <Select value={filterLevel || "all"} onValueChange={(value) => setFilterLevel(value === "all" ? null : value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="0">Main Categories (Level 0)</SelectItem>
                  <SelectItem value="1">Subcategories (Level 1)</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            <Button 
              className="space-x-2"
              onClick={() => {
                setNewName("");
                setNewSlug("");
                setNewDescription("");
                setNewParentId(null);
                setNewLevel(0);
                setIsCreateDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              <span>Add Category</span>
            </Button>
          </div>
        </div>

        {/* Category Display */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !categories || categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No categories found</p>
            <Button 
              onClick={() => {
                setNewName("");
                setNewSlug("");
                setNewDescription("");
                setNewParentId(null);
                setNewLevel(0);
                setIsCreateDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create your first category
            </Button>
          </div>
        ) : categoryView === 'tree' ? (
          // Tree View for hierarchical display with drag and drop
          <div className="border rounded-md">
            <div className="p-3 bg-slate-100 border-b">
              <p className="flex items-center text-sm text-muted-foreground">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <span>Drag items to reorder categories and subcategories</span>
              </p>
            </div>
            
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="main-categories" type="MAIN_CATEGORY">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="divide-y"
                  >
                    {hierarchicalCategories?.map((item, index) => (
                      <Draggable 
                        key={item.category.id.toString()}
                        draggableId={item.category.id.toString()}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "border-b last:border-0",
                              snapshot.isDragging ? "bg-slate-100 shadow-lg" : ""
                            )}
                          >
                            <div className="p-4 bg-slate-50 flex justify-between items-center">
                              <div className="flex items-center">
                                <div
                                  {...provided.dragHandleProps}
                                  className="mr-2 cursor-grab"
                                >
                                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <h3 className="font-medium">{item.category.name}</h3>
                                <Badge variant="outline" className="ml-2">Level 0</Badge>
                                <Badge 
                                  variant="secondary" 
                                  className="ml-2"
                                >
                                  Order: {item.category.displayOrder || 0}
                                </Badge>
                                <div className="ml-2 flex items-center">
                                  <Switch
                                    checked={item.category.isActive}
                                    onCheckedChange={(checked) => handleVisibilityToggle(item.category.id, checked)}
                                    className="data-[state=checked]:bg-green-500"
                                  />
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    {item.category.isActive ? 'Visible' : 'Hidden'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleManageAttributes(item.category.id)}
                                >
                                  <Tag className="h-4 w-4 mr-2" />
                                  Attributes
                                </Button>
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                      <span className="sr-only">Actions</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={(e) => {
                                      e.preventDefault();
                                      handleEditClick(item.category);
                                    }}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuItem
                                      onSelect={(e) => {
                                        e.preventDefault();
                                        handleDeleteClick(item.category);
                                      }}
                                      className="text-red-600"
                                    >
                                      <Trash className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                            
                            {item.children.length > 0 && (
                              <Droppable 
                                droppableId={`parent-${item.category.id}`} 
                                type="SUB_CATEGORY"
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={cn(
                                      "pl-8 pr-4 py-2",
                                      snapshot.isDraggingOver ? "bg-pink-50" : ""
                                    )}
                                  >
                                    {item.children.map((child, index) => (
                                      <Draggable 
                                        key={child.id.toString()}
                                        draggableId={child.id.toString()}
                                        index={index}
                                      >
                                        {(provided, snapshot) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className={cn(
                                              "border-b last:border-0 py-3 flex justify-between items-center",
                                              snapshot.isDragging ? "bg-white shadow-md rounded-md" : ""
                                            )}
                                          >
                                            <div className="flex items-center">
                                              <div
                                                {...provided.dragHandleProps}
                                                className="mr-1 cursor-grab"
                                              >
                                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                                              </div>
                                              <ChevronRight className="h-4 w-4 mr-2 text-muted-foreground" />
                                              <span className="font-medium">{child.name}</span>
                                              <Badge variant="outline" className="ml-2">Level 1</Badge>
                                              <Badge 
                                                variant="secondary" 
                                                className="ml-2"
                                              >
                                                Order: {child.displayOrder || 0}
                                              </Badge>
                                              <div className="ml-2 flex items-center">
                                                <Switch
                                                  checked={child.isActive}
                                                  onCheckedChange={(checked) => handleVisibilityToggle(child.id, checked)}
                                                  className="data-[state=checked]:bg-green-500"
                                                />
                                                <span className="ml-2 text-xs text-muted-foreground">
                                                  {child.isActive ? 'Visible' : 'Hidden'}
                                                </span>
                                              </div>
                                            </div>
                                            <div className="flex space-x-2">
                                              <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => handleManageAttributes(child.id)}
                                              >
                                                <Tag className="h-4 w-4 mr-2" />
                                                Attributes
                                              </Button>
                                              
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Actions</span>
                                                  </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                  <DropdownMenuItem onSelect={(e) => {
                                                    e.preventDefault();
                                                    handleEditClick(child);
                                                  }}>
                                                    <Edit className="h-4 w-4 mr-2" />
                                                    Edit
                                                  </DropdownMenuItem>
                                                  
                                                  <DropdownMenuItem
                                                    onSelect={(e) => {
                                                      e.preventDefault();
                                                      handleDeleteClick(child);
                                                    }}
                                                    className="text-red-600"
                                                  >
                                                    <Trash className="h-4 w-4 mr-2" />
                                                    Delete
                                                  </DropdownMenuItem>
                                                </DropdownMenuContent>
                                              </DropdownMenu>
                                            </div>
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        ) : (
          // Grid View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories
              ?.filter(category => filterLevel === null || category.level?.toString() === filterLevel)
              .map((category) => (
              <Card key={category.id} className="overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-pink-100 to-pink-50 flex items-center justify-center">
                  <h3 className="text-xl font-bold text-pink-800">{category.name}</h3>
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <p className="text-sm text-muted-foreground">Slug: {category.slug}</p>
                        <Badge variant="outline">Level {category.level || 0}</Badge>
                        {category.isActive ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Parent: {getCategoryParentName(category)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Display Order: {category.displayOrder || 0}
                        </p>
                      </div>
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
                          <DropdownMenuItem 
                            onSelect={(e) => {
                              e.preventDefault();
                              handleManageAttributes(category.id);
                            }}
                          >
                            <Tag className="h-4 w-4 mr-2" />
                            Manage Attributes
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem onSelect={(e) => {
                            e.preventDefault();
                            handleEditClick(category);
                          }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              handleDeleteClick(category);
                            }}
                            className="text-red-600"
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {category.description && (
                      <p className="text-sm line-clamp-3">{category.description}</p>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-3"
                      onClick={() => handleManageAttributes(category.id)}
                    >
                      <Tag className="h-4 w-4 mr-2" />
                      Manage Attributes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
              <DialogDescription>
                Add a new category to organize your products.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name*</Label>
                <Input 
                  id="name" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)} 
                  placeholder="Category Name" 
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="parent">Parent Category</Label>
                <Select value={newParentId || "none"} onValueChange={(value) => setNewParentId(value === "none" ? null : value)}>
                  <SelectTrigger id="parent">
                    <SelectValue placeholder="No Parent (Main Category)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Parent (Main Category)</SelectItem>
                    {categories?.filter(cat => cat.level === 0).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Current level: {newLevel} {newLevel === 0 ? "(Main Category)" : "(Subcategory)"}
                </p>
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
                <Label htmlFor="displayOrder">Display Order</Label>
                <Input 
                  id="displayOrder" 
                  type="number" 
                  value={newDisplayOrder} 
                  onChange={(e) => setNewDisplayOrder(parseInt(e.target.value))} 
                />
                <p className="text-sm text-muted-foreground">
                  Controls the display order within the same level.
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
        
        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
              <DialogDescription>
                Update the category details
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Name*</Label>
                <Input 
                  id="edit-name" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)} 
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-parent">Parent Category</Label>
                <Select value={newParentId || "none"} onValueChange={(value) => setNewParentId(value === "none" ? null : value)}>
                  <SelectTrigger id="edit-parent">
                    <SelectValue placeholder="No Parent (Main Category)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Parent (Main Category)</SelectItem>
                    {categories?.filter(cat => 
                      cat.level === 0 && 
                      cat.id !== selectedCategory?.id
                    ).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Current level: {newLevel} {newLevel === 0 ? "(Main Category)" : "(Subcategory)"}
                </p>
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
                <Label htmlFor="edit-displayOrder">Display Order</Label>
                <Input 
                  id="edit-displayOrder" 
                  type="number" 
                  value={newDisplayOrder} 
                  onChange={(e) => setNewDisplayOrder(parseInt(e.target.value))} 
                />
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
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Delete Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Category</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this category?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="font-medium">{selectedCategory?.name}</p>
              <p className="text-sm text-muted-foreground">
                Slug: {selectedCategory?.slug}
              </p>
              {selectedCategory?.level === 0 && categories?.some(c => c.parentId === selectedCategory.id) && (
                <div className="mt-2 p-3 bg-amber-50 text-amber-800 rounded border border-amber-300">
                  <p className="font-medium">Warning</p>
                  <p className="text-sm">This category has subcategories that will also be deleted.</p>
                </div>
              )}
            </div>
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
                {deleteMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash className="mr-2 h-4 w-4" />
                )}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}