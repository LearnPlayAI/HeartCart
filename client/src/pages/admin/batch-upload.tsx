import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Helmet } from "react-helmet";
import { useCatalogs } from "@/hooks/use-catalogs";
import { useBatchUploads, BatchUpload, BatchUploadError } from "@/hooks/use-batch-uploads";
import { useAuth } from "@/hooks/use-auth";
import AdminLayout from "@/components/admin/layout";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Clock, 
  FileText, 
  Upload, 
  Trash2, 
  MoreVertical, 
  Eye, 
  Download, 
  Plus, 
  AlertCircle,
  Check, 
  X, 
  RefreshCw, 
  ArrowUpDown,
  HelpCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

// Form schema for creating a new batch upload
const createBatchUploadSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  description: z.string().optional(),
  catalogId: z.string().optional(),
});

// Form schema for uploading a CSV file
const uploadCsvSchema = z.object({
  file: z.instanceof(File, { message: "Please select a CSV file" })
    .refine(file => file.type === 'text/csv' || file.name.endsWith('.csv'), {
      message: "File must be a CSV file"
    }),
});

function getStatusBadge(status: string) {
  switch (status.toLowerCase()) {
    case 'pending':
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
    case 'processing':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Processing</Badge>;
    case 'completed':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
    case 'failed':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Failed</Badge>;
    case 'cancelled':
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getErrorSeverityBadge(severity: string) {
  switch (severity.toLowerCase()) {
    case 'error':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Error</Badge>;
    case 'warning':
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Warning</Badge>;
    case 'info':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Info</Badge>;
    default:
      return <Badge variant="outline">{severity}</Badge>;
  }
}

function BatchUploadListItem({ batch, onDelete, onViewErrors, onRefresh }: { 
  batch: BatchUpload; 
  onDelete: () => void;
  onViewErrors: () => void;
  onRefresh: () => void;
}) {
  const isComplete = batch.status.toLowerCase() === 'completed';
  const isFailed = batch.status.toLowerCase() === 'failed';
  const isProcessing = batch.status.toLowerCase() === 'processing';
  
  const progress = batch.totalRecords && batch.processedRecords
    ? Math.round((batch.processedRecords / batch.totalRecords) * 100)
    : 0;
  
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{batch.name}</CardTitle>
            <CardDescription>
              Created {formatDistanceToNow(new Date(batch.createdAt), { addSuffix: true })}
            </CardDescription>
          </div>
          {getStatusBadge(batch.status)}
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        {batch.description && (
          <p className="text-sm text-gray-600 mb-3">{batch.description}</p>
        )}
        
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-sm font-medium text-gray-500">File</p>
            <p className="text-sm">{batch.fileOriginalName || 'No file uploaded'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Catalog ID</p>
            <p className="text-sm">{batch.catalogId || 'None'}</p>
          </div>
        </div>
        
        {isProcessing && (
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-500">Processing progress</span>
              <span className="text-xs font-medium">
                {batch.processedRecords || 0} / {batch.totalRecords || 0} records
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
        
        {(isComplete || isFailed) && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center p-2 bg-gray-50 rounded">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-lg font-medium">{batch.totalRecords || 0}</p>
            </div>
            <div className="text-center p-2 bg-green-50 rounded">
              <p className="text-xs text-gray-500">Success</p>
              <p className="text-lg font-medium text-green-600">{batch.successCount || 0}</p>
            </div>
            <div className="text-center p-2 bg-red-50 rounded">
              <p className="text-xs text-gray-500">Errors</p>
              <p className="text-lg font-medium text-red-600">{batch.errorCount || 0}</p>
            </div>
          </div>
        )}
        
        {isFailed && batch.errorCount && batch.errorCount > 0 && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Errors detected</AlertTitle>
            <AlertDescription>
              {batch.errorCount} errors were found during processing.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <div className="text-xs text-gray-500">
          {batch.updatedAt !== batch.createdAt && 
            `Last updated ${formatDistanceToNow(new Date(batch.updatedAt), { addSuffix: true })}`
          }
        </div>
        <div className="flex space-x-2">
          {batch.errorCount && batch.errorCount > 0 && (
            <Button variant="outline" size="sm" onClick={onViewErrors}>
              <Eye className="h-4 w-4 mr-1" />
              View Errors
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function ErrorList({ errors }: { errors: BatchUploadError[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Row</TableHead>
            <TableHead>Field</TableHead>
            <TableHead>Error Message</TableHead>
            <TableHead className="w-[100px]">Severity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {errors.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                No errors found
              </TableCell>
            </TableRow>
          ) : (
            errors.map((error) => (
              <TableRow key={error.id}>
                <TableCell>{error.row || 'N/A'}</TableCell>
                <TableCell>{error.field || 'N/A'}</TableCell>
                <TableCell>{error.message}</TableCell>
                <TableCell>{getErrorSeverityBadge(error.severity)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function CreateBatchUploadForm({ 
  onClose, 
  onSubmit 
}: { 
  onClose: () => void; 
  onSubmit: (data: z.infer<typeof createBatchUploadSchema>) => Promise<void>; 
}) {
  const { data: catalogs, isLoading: isLoadingCatalogs } = useCatalogs();
  
  const form = useForm<z.infer<typeof createBatchUploadSchema>>({
    resolver: zodResolver(createBatchUploadSchema),
    defaultValues: {
      name: '',
      description: '',
      catalogId: '',
    },
  });

  const handleSubmit = async (data: z.infer<typeof createBatchUploadSchema>) => {
    try {
      const formattedData = {
        name: data.name,
        description: data.description || '',
        catalogId: data.catalogId ? parseInt(data.catalogId) : undefined,
      };
      
      await onSubmit(formattedData);
      onClose();
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="May 2025 Products" {...field} />
              </FormControl>
              <FormDescription>
                Give your batch upload a descriptive name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter a description"
                  className="resize-none"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription>
                Provide additional details about this batch upload.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="catalogId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Catalog (Optional)</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a catalog" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">No catalog (use default)</SelectItem>
                  {catalogs?.map((catalog) => (
                    <SelectItem key={catalog.id} value={catalog.id.toString()}>
                      {catalog.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Associate this batch with a specific catalog.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <>Creating...</>
            ) : (
              <>Create Batch</>
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function UploadCsvForm({ 
  batchId, 
  onClose, 
  onSubmit 
}: { 
  batchId: number;
  onClose: () => void; 
  onSubmit: (data: { id: number; file: File }) => Promise<void>; 
}) {
  const form = useForm<z.infer<typeof uploadCsvSchema>>({
    resolver: zodResolver(uploadCsvSchema),
    defaultValues: {},
  });
  
  const [fileSelected, setFileSelected] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('');
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      form.setValue('file', files[0]);
      setFileSelected(true);
      setFileName(files[0].name);
    } else {
      form.setValue('file', undefined as any);
      setFileSelected(false);
      setFileName('');
    }
  };

  const handleSubmit = async (data: z.infer<typeof uploadCsvSchema>) => {
    try {
      await onSubmit({ id: batchId, file: data.file });
      onClose();
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="file"
          render={({ field: { ref, ...field } }) => (
            <FormItem>
              <FormLabel>CSV File</FormLabel>
              <FormControl>
                <div className="grid w-full gap-2">
                  <div className="flex items-center justify-center w-full">
                    <label
                      htmlFor="csv-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">CSV files only</p>
                      </div>
                      <input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        className="hidden"
                        ref={ref}
                        onChange={handleFileChange}
                        {...field}
                      />
                    </label>
                  </div>
                  
                  {fileSelected && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <span className="text-sm truncate">{fileName}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          form.setValue('file', undefined as any);
                          setFileSelected(false);
                          setFileName('');
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormDescription>
                Upload a CSV file containing product data.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={!fileSelected || form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <>Uploading...</>
            ) : (
              <>Upload CSV</>
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

export default function BatchUploadPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState<boolean>(false);
  const [showUploadDialog, setShowUploadDialog] = useState<boolean>(false);
  const [showErrorsDialog, setShowErrorsDialog] = useState<boolean>(false);
  const [currentErrors, setCurrentErrors] = useState<BatchUploadError[]>([]);
  const [currentBatch, setCurrentBatch] = useState<BatchUpload | null>(null);
  
  const { 
    batchUploads,
    isLoadingBatchUploads,
    refetchBatchUploads,
    createBatchUpload,
    uploadCsvFile,
    deleteBatchUpload,
    getBatchUploadErrors,
    downloadTemplateCSV 
  } = useBatchUploads();
  
  // Handler for showing errors
  const handleViewErrors = async (batchId: number) => {
    try {
      const errors = await getBatchUploadErrors(batchId);
      const batch = batchUploads?.find(b => b.id === batchId) || null;
      
      setCurrentErrors(errors);
      setCurrentBatch(batch);
      setShowErrorsDialog(true);
    } catch (error) {
      toast({
        title: "Error fetching errors",
        description: error instanceof Error ? error.message : "Failed to fetch batch upload errors",
        variant: "destructive",
      });
    }
  };
  
  // Handler for deleting a batch upload
  const handleDelete = async (batchId: number) => {
    if (window.confirm("Are you sure you want to delete this batch upload? This action cannot be undone.")) {
      try {
        await deleteBatchUpload(batchId);
      } catch (error) {
        // Error handling is done in the mutation
      }
    }
  };
  
  // Handlers for dialog states
  const openCreateDialog = () => setShowCreateDialog(true);
  const closeCreateDialog = () => setShowCreateDialog(false);
  
  const openUploadDialog = (batchId: number) => {
    setSelectedBatchId(batchId);
    setShowUploadDialog(true);
  };
  const closeUploadDialog = () => {
    setSelectedBatchId(null);
    setShowUploadDialog(false);
  };
  
  const closeErrorsDialog = () => {
    setShowErrorsDialog(false);
    setCurrentErrors([]);
    setCurrentBatch(null);
  };
  
  // If user is not an admin, show error
  if (!user || user.role !== 'admin') {
    return (
      <AdminLayout>
        <div className="container mx-auto py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You must be an administrator to access this page.
            </AlertDescription>
          </Alert>
        </div>
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout>
      <Helmet>
        <title>Mass Product Upload | TeeMeYou Admin</title>
        <meta name="description" content="Manage batch uploads for mass product import" />
      </Helmet>
      
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Mass Product Upload</h1>
            <p className="text-muted-foreground mt-1">
              Upload and manage multiple products at once via CSV files
            </p>
          </div>
          
          <div className="flex space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => downloadTemplateCSV()}>
                  Generic Template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => alert("Select a specific catalog template in a future version")}>
                  Catalog-Specific Template
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create Batch Upload
            </Button>
          </div>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <HelpCircle className="h-5 w-5 mr-2 text-muted-foreground" />
              How to use batch product upload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                <span className="font-medium">Download a template CSV</span> by clicking the "Download Template" button above.
              </li>
              <li>
                <span className="font-medium">Fill in the CSV</span> with your product data. Each row represents one product.
              </li>
              <li>
                <span className="font-medium">Create a new batch upload</span> job using the "Create Batch Upload" button.
              </li>
              <li>
                <span className="font-medium">Upload your completed CSV</span> file to the batch job.
              </li>
              <li>
                <span className="font-medium">Monitor the processing status</span> and check for any errors.
              </li>
              <li>
                <span className="font-medium">Upload images separately</span> through the Product Images page after products are created.
              </li>
            </ol>
            
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Important Notes</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>For attributes with multiple values, separate them with commas in the same cell.</li>
                  <li>Required fields are marked in the template header with an asterisk (*).</li>
                  <li>Product images need to be uploaded separately after products are created.</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
        
        <div className="my-6">
          <h2 className="text-xl font-semibold mb-4">Batch Upload Jobs</h2>
          
          {isLoadingBatchUploads ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : batchUploads && batchUploads.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {batchUploads.map((batch) => (
                <BatchUploadListItem
                  key={batch.id}
                  batch={batch}
                  onDelete={() => handleDelete(batch.id)}
                  onViewErrors={() => handleViewErrors(batch.id)}
                  onRefresh={() => refetchBatchUploads()}
                />
              ))}
            </div>
          ) : (
            <Card className="bg-muted/40">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No batch uploads yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create a new batch upload job to start importing products.
                </p>
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Batch Upload
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Create Batch Upload Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Batch Upload</DialogTitle>
            <DialogDescription>
              Set up a new batch upload job for importing products.
            </DialogDescription>
          </DialogHeader>
          <CreateBatchUploadForm
            onClose={closeCreateDialog}
            onSubmit={createBatchUpload}
          />
        </DialogContent>
      </Dialog>
      
      {/* Upload CSV Dialog */}
      {selectedBatchId && (
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Upload CSV File</DialogTitle>
              <DialogDescription>
                Upload a CSV file containing product data to process.
              </DialogDescription>
            </DialogHeader>
            <UploadCsvForm
              batchId={selectedBatchId}
              onClose={closeUploadDialog}
              onSubmit={uploadCsvFile}
            />
          </DialogContent>
        </Dialog>
      )}
      
      {/* View Errors Dialog */}
      <Dialog open={showErrorsDialog} onOpenChange={setShowErrorsDialog}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>
              Batch Upload Errors
              {currentBatch && (
                <span className="text-muted-foreground font-normal ml-2">
                  ({currentBatch.name})
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {currentBatch && currentBatch.errorCount
                ? `${currentBatch.errorCount} errors were found during processing.`
                : "Review errors from the batch upload process."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-96 overflow-y-auto">
            <ErrorList errors={currentErrors} />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={closeErrorsDialog}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}