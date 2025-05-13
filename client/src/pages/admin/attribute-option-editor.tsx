import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Helmet } from "react-helmet";
import { Loader2, Save, ArrowLeft, Plus, Trash2, Code } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { ApiError } from "@/lib/exceptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminLayout } from "@/components/admin/layout";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Attribute, AttributeOption } from "@/types/attribute-types";

function AttributeOptionEditorPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams();
  const attributeId = parseInt(params.id as string);
  const [optionFormOpen, setOptionFormOpen] = useState(false);
  const [metadataEditorOpen, setMetadataEditorOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<AttributeOption | null>(null);
  const [optionMetadata, setOptionMetadata] = useState<string>("");
  const [optionFormMode, setOptionFormMode] = useState<"create" | "edit">("create");
  const [optionToDelete, setOptionToDelete] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    value: "",
    displayValue: "",
    sortOrder: 0,
  });

  // Fetch attribute
  const {
    data: attributeResponse,
    isLoading: attributeLoading,
    error: attributeError,
  } = useQuery({
    queryKey: ["/api/attributes", attributeId],
    enabled: !!attributeId,
    retry: 1,
  });
  
  // Extract the attribute data from the standardized response
  const attribute = attributeResponse?.data;

  // Fetch attribute options
  const {
    data: optionsResponse,
    isLoading: optionsLoading,
    error: optionsError,
  } = useQuery({
    queryKey: ["/api/attributes", attributeId, "options"],
    enabled: !!attributeId,
    retry: 1,
  });
  
  // Extract the options data from the standardized response
  const options = optionsResponse?.data || [];

  // Create option mutation
  const createOptionMutation = useMutation({
    mutationFn: async (newOption: Omit<AttributeOption, "id">) => {
      const response = await fetch(`/api/attributes/${attributeId}/options`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newOption),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ApiError(
          errorData.message || "Failed to create option",
          response.status
        );
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/attributes", attributeId, "options"] 
      });
      setOptionFormOpen(false);
      toast({
        title: "Option created successfully",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create option",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update option mutation
  const updateOptionMutation = useMutation({
    mutationFn: async (updatedOption: Partial<AttributeOption> & { id: number }) => {
      const { id, ...data } = updatedOption;
      const response = await fetch(`/api/attributes/${attributeId}/options/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ApiError(
          errorData.message || "Failed to update option",
          response.status
        );
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/attributes", attributeId, "options"] 
      });
      setOptionFormOpen(false);
      setMetadataEditorOpen(false);
      toast({
        title: "Option updated successfully",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update option",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete option mutation
  const deleteOptionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/attributes/${attributeId}/options/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ApiError(
          errorData.message || "Failed to delete option",
          response.status
        );
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/attributes", attributeId, "options"] 
      });
      setConfirmDeleteOpen(false);
      setOptionToDelete(null);
      toast({
        title: "Option deleted successfully",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete option",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reorder options mutation
  const reorderOptionsMutation = useMutation({
    mutationFn: async (optionIds: number[]) => {
      const response = await fetch(`/api/attributes/${attributeId}/options/reorder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ optionIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ApiError(
          errorData.message || "Failed to reorder options",
          response.status
        );
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/attributes", attributeId, "options"] 
      });
      toast({
        title: "Options reordered successfully",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reorder options",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handler for opening the option form dialog for creating a new option
  const handleNewOption = () => {
    setSelectedOption(null);
    setOptionFormMode("create");
    setFormData({
      value: "",
      displayValue: "",
      sortOrder: options.length > 0 ? Math.max(...options.map(o => o.sortOrder || 0)) + 1 : 0,
    });
    setOptionFormOpen(true);
  };

  // Handler for opening the option form dialog for editing an existing option
  const handleEditOption = (option: AttributeOption) => {
    setSelectedOption(option);
    setOptionFormMode("edit");
    setFormData({
      value: option.value,
      displayValue: option.displayValue || "",
      sortOrder: option.sortOrder || 0,
    });
    setOptionFormOpen(true);
  };

  // Handler for option form submission
  const handleOptionSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const optionData = {
      value: formData.value,
      displayValue: formData.displayValue,
      sortOrder: formData.sortOrder,
      metadata: selectedOption?.metadata || null,
    };
    
    if (optionFormMode === "create") {
      createOptionMutation.mutate(optionData);
    } else if (optionFormMode === "edit" && selectedOption) {
      updateOptionMutation.mutate({
        id: selectedOption.id,
        ...optionData,
      });
    }
  };

  // Handler for input changes in the option form
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === "sortOrder" ? parseInt(value) || 0 : value 
    }));
  };

  // Handler for opening the metadata dialog
  const handleEditMetadata = (option: AttributeOption) => {
    setSelectedOption(option);
    setOptionMetadata(JSON.stringify(option.metadata || {}, null, 2));
    setMetadataEditorOpen(true);
  };

  // Handler for saving metadata
  const handleSaveMetadata = () => {
    if (!selectedOption) return;
    
    try {
      const parsedMetadata = optionMetadata ? JSON.parse(optionMetadata) : null;
      
      updateOptionMutation.mutate({
        id: selectedOption.id,
        metadata: parsedMetadata,
      });
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please enter valid JSON for metadata",
        variant: "destructive",
      });
    }
  };

  // Handler for confirming deletion
  const handleDeleteClick = (optionId: number) => {
    setOptionToDelete(optionId);
    setConfirmDeleteOpen(true);
  };

  // Handler for confirming deletion
  const handleConfirmDelete = () => {
    if (optionToDelete) {
      deleteOptionMutation.mutate(optionToDelete);
    }
  };

  // Loading state
  if (attributeLoading || optionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (attributeError || optionsError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-screen">
        <h1 className="text-2xl font-bold text-destructive">Error Loading Data</h1>
        <p>{attributeError ? (attributeError as Error).message : (optionsError as Error).message}</p>
        <Button onClick={() => navigate("/admin/attributes")}>
          Back to Attributes
        </Button>
      </div>
    );
  }

  return (
    <AdminLayout 
      title={`Options for ${attribute?.displayName}`}
      subtitle={`Manage attribute options for ${attribute?.displayName}`}
    >
      <Helmet>
        <title>Attribute Options | TeeMeYou Admin</title>
      </Helmet>

      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Button variant="outline" onClick={() => navigate("/admin/attributes")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Attributes
          </Button>
          <Button onClick={handleNewOption}>
            <Plus className="mr-2 h-4 w-4" />
            New Option
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Options for {attribute?.displayName}</CardTitle>
            <CardDescription>
              Manage the available options for this attribute
            </CardDescription>
          </CardHeader>
          <CardContent>
            {options.length === 0 ? (
              <div className="text-center p-8">
                <p className="text-muted-foreground">No options found for this attribute.</p>
                <Button variant="outline" onClick={handleNewOption} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Option
                </Button>
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Value</TableHead>
                      <TableHead>Display Value</TableHead>
                      <TableHead>Sort Order</TableHead>
                      <TableHead>Metadata</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {options.map((option) => (
                      <TableRow key={option.id}>
                        <TableCell className="font-medium">{option.value}</TableCell>
                        <TableCell>{option.displayValue}</TableCell>
                        <TableCell>{option.sortOrder}</TableCell>
                        <TableCell>
                          {option.metadata ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditMetadata(option)}
                            >
                              <Code className="h-4 w-4 mr-1" />
                              View Metadata
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">None</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditOption(option)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteClick(option.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Option Form Dialog */}
        <Dialog open={optionFormOpen} onOpenChange={setOptionFormOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {optionFormMode === "create" ? "Create New Option" : "Edit Option"}
              </DialogTitle>
              <DialogDescription>
                {optionFormMode === "create"
                  ? `Add a new option for ${attribute?.displayName}`
                  : `Update the option for ${attribute?.displayName}`}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleOptionSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="value">Value</Label>
                  <Input
                    id="value"
                    name="value"
                    placeholder="red"
                    value={formData.value}
                    onChange={handleInputChange}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Internal value, lowercase with no spaces
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayValue">Display Value</Label>
                  <Input
                    id="displayValue"
                    name="displayValue"
                    placeholder="Ruby Red"
                    value={formData.displayValue}
                    onChange={handleInputChange}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Customer-facing value
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    name="sortOrder"
                    type="number"
                    min={0}
                    step={1}
                    value={formData.sortOrder}
                    onChange={handleInputChange}
                  />
                </div>

                {selectedOption?.metadata && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Metadata</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditMetadata(selectedOption)}
                      >
                        Edit Metadata
                      </Button>
                    </div>
                    <div className="bg-muted p-2 rounded text-xs font-mono overflow-x-auto">
                      {JSON.stringify(selectedOption.metadata, null, 2)}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOptionFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createOptionMutation.isPending || updateOptionMutation.isPending
                  }
                >
                  {(createOptionMutation.isPending || updateOptionMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {optionFormMode === "create" ? "Create Option" : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Option Metadata Dialog */}
        <Dialog open={metadataEditorOpen} onOpenChange={setMetadataEditorOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Metadata</DialogTitle>
              <DialogDescription>
                Edit the metadata for this option in JSON format
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="metadata">Metadata (JSON)</Label>
                <Textarea
                  id="metadata"
                  value={optionMetadata}
                  onChange={(e) => setOptionMetadata(e.target.value)}
                  placeholder='{"hexCode": "#FF0000"}'
                  rows={10}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Enter metadata as valid JSON
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setMetadataEditorOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveMetadata}
                disabled={updateOptionMutation.isPending}
              >
                {updateOptionMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Metadata
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirm Delete Dialog */}
        <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this option? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteOptionMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}

export default AttributeOptionEditorPage;