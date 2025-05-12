import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQueryFn, apiRequest } from '@/lib/queryClient';
import { 
  Folder, 
  FileIcon, 
  File, 
  Upload, 
  Trash2, 
  Download, 
  RefreshCw, 
  FolderPlus,
  ChevronRight,
  ChevronLeft,
  ArrowUp,
  Info,
  X,
  Database
} from 'lucide-react';
import { 
  Card, 
  CardContent,
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
  DialogClose
} from "@/components/ui/dialog";
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FileItem = {
  name: string;
  path: string;
  url: string;
  size?: number;
  type?: string;
  lastModified?: string;
};

type FileDetailsProps = {
  file: FileItem | null;
  onClose: () => void;
};

const FileDetails: React.FC<FileDetailsProps> = ({ file, onClose }) => {
  if (!file) return null;
  
  // Format file size to readable format (KB, MB, etc.)
  const formatFileSize = (size?: number) => {
    if (!size) return 'Unknown';
    
    if (size < 1024) {
      return `${size} B`;
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(2)} KB`;
    } else {
      return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    }
  };
  
  // Format timestamp to readable format
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };
  
  return (
    <div className="p-4 bg-white rounded-md shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">File Details</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-1 gap-2">
        <div className="flex items-center p-2 bg-gray-50 rounded">
          <div className="text-gray-500 w-28">Name:</div>
          <div className="font-medium truncate">{file.name}</div>
        </div>
        
        <div className="flex items-center p-2 bg-gray-50 rounded">
          <div className="text-gray-500 w-28">Path:</div>
          <div className="font-medium truncate">{file.path}</div>
        </div>
        
        <div className="flex items-center p-2 bg-gray-50 rounded">
          <div className="text-gray-500 w-28">Size:</div>
          <div className="font-medium">{formatFileSize(file.size)}</div>
        </div>
        
        <div className="flex items-center p-2 bg-gray-50 rounded">
          <div className="text-gray-500 w-28">Type:</div>
          <div className="font-medium">{file.type || 'Unknown'}</div>
        </div>
        
        <div className="flex items-center p-2 bg-gray-50 rounded">
          <div className="text-gray-500 w-28">Last Modified:</div>
          <div className="font-medium">{formatDate(file.lastModified)}</div>
        </div>
      </div>
      
      <div className="mt-4 flex justify-end space-x-2">
        <Button variant="outline" asChild>
          <a href={file.url} target="_blank" rel="noopener noreferrer">
            View File
          </a>
        </Button>
        
        <Button variant="outline" asChild>
          <a href={`/api/file-browser/files/${file.path}/download`} download>
            <Download className="mr-2 h-4 w-4" />
            Download
          </a>
        </Button>
      </div>
    </div>
  );
};

const FileBrowser: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [currentPath, setCurrentPath] = useState<string>('');
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState<boolean>(false);
  const [showFileDetails, setShowFileDetails] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  
  // Bucket queries
  const {
    data: bucketsData,
    isLoading: isBucketsLoading,
    error: bucketsError,
    refetch: refetchBuckets
  } = useQuery<{ success: boolean; data: { buckets: string[], currentBucket: string } }>({
    queryKey: ['/api/file-browser/buckets'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchOnWindowFocus: false
  });
  
  // Set bucket mutation
  const setBucketMutation = useMutation({
    mutationFn: async (bucketId: string) => {
      return await apiRequest('/api/file-browser/buckets/set', 'POST', { bucketId });
    },
    onSuccess: () => {
      toast({
        title: 'Storage Bucket Changed',
        description: 'Storage bucket has been switched successfully.',
        variant: 'default'
      });
      // Refetch folders and reset path
      setCurrentPath('');
      refetchFolders();
    },
    onError: (error: any) => {
      toast({
        title: 'Error Changing Bucket',
        description: error.message || 'Failed to change storage bucket. Please try again.',
        variant: 'destructive'
      });
    }
  });
  
  // Folders
  const {
    data: foldersData,
    isLoading: isFoldersLoading,
    error: foldersError,
    refetch: refetchFolders
  } = useQuery<{ success: boolean; data: { folders: string[], currentBucket: string } }>({
    queryKey: ['/api/file-browser/folders'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: currentPath === '',
    refetchOnWindowFocus: false
  });
  
  const {
    data: subFoldersData,
    isLoading: isSubFoldersLoading,
    error: subFoldersError,
    refetch: refetchSubFolders
  } = useQuery<{ success: boolean; data: { subfolders: string[] } }>({
    queryKey: [`/api/file-browser/folders/${encodeURIComponent(currentPath)}/subfolders`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: currentPath !== '',
    refetchOnWindowFocus: false
  });
  
  const {
    data: filesData,
    isLoading: isFilesLoading,
    error: filesError,
    refetch: refetchFiles
  } = useQuery<{ success: boolean; data: { files: FileItem[] } }>({
    queryKey: [`/api/file-browser/folders/${encodeURIComponent(currentPath)}/files`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchOnWindowFocus: false
  });
  
  // Extract data
  const buckets = bucketsData?.success ? bucketsData.data.buckets : [];
  const currentBucket = bucketsData?.success ? bucketsData.data.currentBucket : '';
  
  // Root folders
  const rootFolders = foldersData?.success ? foldersData.data.folders : [];
  
  // Sub folders
  const subFolders = subFoldersData?.success ? subFoldersData.data.subfolders : [];
  
  // Files
  const files = filesData?.success ? filesData.data.files : [];
  
  // Mutations
  const createFolderMutation = useMutation({
    mutationFn: async (folderPath: string) => {
      return await apiRequest('/api/file-browser/folders', 'POST', { folderPath });
    },
    onSuccess: () => {
      toast({
        title: 'Folder Created',
        description: 'The new folder was created successfully.',
        variant: 'default'
      });
      setNewFolderName('');
      setShowCreateFolder(false);
      
      // Refetch appropriate data based on current path
      if (currentPath === '') {
        refetchFolders();
      } else {
        refetchSubFolders();
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error Creating Folder',
        description: error.message || 'Failed to create folder. Please try again.',
        variant: 'destructive'
      });
    }
  });
  
  const uploadFileMutation = useMutation({
    mutationFn: async ({ file, folderPath }: { file: File; folderPath: string }) => {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      
      // Set up upload progress tracking
      setIsUploading(true);
      setUploadProgress(0);
      
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });
      
      // Return a Promise that resolves when upload is complete
      return new Promise((resolve, reject) => {
        xhr.open('POST', `/api/file-browser/upload${folderPath ? `/${encodeURIComponent(folderPath)}` : ''}`);
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error('Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.onabort = () => reject(new Error('Upload aborted'));
        xhr.send(formData);
      });
    },
    onSuccess: () => {
      toast({
        title: 'File Uploaded',
        description: 'The file was uploaded successfully.',
        variant: 'default'
      });
      setUploadFile(null);
      setIsUploading(false);
      
      // Refetch files
      refetchFiles();
    },
    onError: (error: any) => {
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload file. Please try again.',
        variant: 'destructive'
      });
      setIsUploading(false);
    },
    onSettled: () => {
      setUploadProgress(0);
    }
  });
  
  const deleteFileMutation = useMutation({
    mutationFn: async (filePath: string) => {
      return await apiRequest(`/api/file-browser/files/${encodeURIComponent(filePath)}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: 'File Deleted',
        description: 'The file was deleted successfully.',
        variant: 'default'
      });
      setFileToDelete(null);
      
      // Refetch files
      refetchFiles();
    },
    onError: (error: any) => {
      toast({
        title: 'Error Deleting File',
        description: error.message || 'Failed to delete file. Please try again.',
        variant: 'destructive'
      });
    }
  });
  
  // Navigate to a folder
  const navigateToFolder = (folderPath: string) => {
    // Add current path to history before changing
    setPathHistory([...pathHistory, currentPath]);
    setCurrentPath(folderPath);
  };
  
  // Navigate to parent folder
  const navigateToParent = () => {
    if (currentPath === '') return;
    
    // Extract parent path from current path
    const pathParts = currentPath.split('/');
    pathParts.pop();
    const parentPath = pathParts.join('/');
    
    // Add current path to history before changing
    setPathHistory([...pathHistory, currentPath]);
    setCurrentPath(parentPath);
  };
  
  // Navigate back
  const navigateBack = () => {
    if (pathHistory.length === 0) return;
    
    // Get the last path from history
    const newHistory = [...pathHistory];
    const previousPath = newHistory.pop() as string;
    
    setPathHistory(newHistory);
    setCurrentPath(previousPath);
  };
  
  // Handle file selection
  const handleFileSelect = (file: FileItem) => {
    setSelectedFile(file);
    setShowFileDetails(true);
  };
  
  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadFile(e.target.files[0]);
    }
  };
  
  // Handle create folder
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast({
        title: 'Error',
        description: 'Folder name cannot be empty.',
        variant: 'destructive'
      });
      return;
    }
    
    // Create full path for the new folder
    const folderPath = currentPath ? `${currentPath}/${newFolderName}` : newFolderName;
    
    createFolderMutation.mutate(folderPath);
  };
  
  // Handle file deletion
  const handleDeleteFile = (file: FileItem) => {
    setFileToDelete(file);
  };
  
  // Confirm file deletion
  const confirmDeleteFile = () => {
    if (!fileToDelete) return;
    
    deleteFileMutation.mutate(fileToDelete.path);
  };
  
  // Start upload
  const startUpload = () => {
    if (!uploadFile) return;
    
    uploadFileMutation.mutate({
      file: uploadFile,
      folderPath: currentPath
    });
  };
  
  // Refresh current view
  const refreshView = () => {
    if (currentPath === '') {
      refetchFolders();
    } else {
      refetchSubFolders();
    }
    refetchFiles();
  };
  
  // Display an appropriate message when there are no items to show
  const renderEmptyState = () => {
    const isLoading = isFoldersLoading || isSubFoldersLoading || isFilesLoading;
    
    if (isLoading) {
      return (
        <div className="p-8 text-center">
          <RefreshCw className="mx-auto h-8 w-8 text-gray-400 animate-spin" />
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      );
    }
    
    const hasItems = (currentPath === '' ? rootFolders.length > 0 : subFolders.length > 0) || files.length > 0;
    
    if (!hasItems) {
      return (
        <div className="p-8 text-center">
          <Folder className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500">
            {currentPath === '' 
              ? 'No folders or files found in the root directory.' 
              : 'This folder is empty.'}
          </p>
          <div className="mt-4 flex justify-center space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setShowCreateFolder(true)}
            >
              <FolderPlus className="mr-2 h-4 w-4" />
              Create Folder
            </Button>
            <label className="cursor-pointer">
              <Input 
                type="file" 
                className="hidden" 
                onChange={handleFileUpload} 
              />
              <Button variant="outline" type="button" asChild>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload File
                </span>
              </Button>
            </label>
          </div>
        </div>
      );
    }
    
    return null;
  };
  
  // Format file size
  const formatFileSize = (size?: number) => {
    if (!size) return 'Unknown';
    
    if (size < 1024) {
      return `${size} B`;
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    } else {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>File Browser</CardTitle>
            <CardDescription>
              Browse, upload and manage files in the object storage
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <div className="flex items-center mr-4">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-gray-500" />
                <Select
                  value={currentBucket}
                  onValueChange={(value) => setBucketMutation.mutate(value)}
                  disabled={isBucketsLoading || setBucketMutation.isPending}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select bucket" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Storage Buckets</SelectLabel>
                      {buckets.map((bucket) => (
                        <SelectItem key={bucket} value={bucket}>
                          {bucket}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshView}
              disabled={isFoldersLoading || isSubFoldersLoading || isFilesLoading}
            >
              <RefreshCw className={`h-4 w-4 ${(isFoldersLoading || isSubFoldersLoading || isFilesLoading) ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateFolder(true)}
            >
              <FolderPlus className="mr-2 h-4 w-4" />
              New Folder
            </Button>
            <label className="cursor-pointer">
              <Input 
                type="file" 
                className="hidden" 
                onChange={handleFileUpload} 
              />
              <Button variant="secondary" size="sm" type="button" asChild>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </span>
              </Button>
            </label>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Breadcrumb navigation */}
        <div className="flex items-center mb-4 space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={navigateBack}
            disabled={pathHistory.length === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setCurrentPath('')}
            disabled={currentPath === ''}
          >
            Root
          </Button>
          
          {currentPath !== '' && (
            <>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              
              {currentPath.split('/').map((segment, index, arr) => {
                const path = arr.slice(0, index + 1).join('/');
                return (
                  <React.Fragment key={path}>
                    {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateToFolder(path)}
                      className="truncate max-w-[150px]"
                    >
                      {segment}
                    </Button>
                  </React.Fragment>
                );
              })}
            </>
          )}
        </div>
        
        {/* Current bucket indicator */}
        <div className="mb-4">
          <div className="flex items-center">
            <Database className="h-3 w-3 text-gray-500 mr-1" />
            <span className="text-xs text-gray-500">
              Currently using storage bucket: <span className="font-medium">{currentBucket || 'Loading...'}</span>
            </span>
          </div>
        </div>
        
        {renderEmptyState() || (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Name</TableHead>
                  <TableHead className="w-[20%]">Type</TableHead>
                  <TableHead className="w-[15%]">Size</TableHead>
                  <TableHead className="w-[25%]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Parent directory link (if not in root) */}
                {currentPath !== '' && (
                  <TableRow>
                    <TableCell className="font-medium">
                      <div 
                        className="flex items-center cursor-pointer" 
                        onClick={navigateToParent}
                      >
                        <ArrowUp className="mr-2 h-4 w-4 text-gray-500" />
                        <span className="text-gray-500">..</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Directory</Badge>
                    </TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                  </TableRow>
                )}
                
                {/* Root folders or subfolders */}
                {(currentPath === '' ? rootFolders : subFolders).map((folder) => (
                  <TableRow key={folder}>
                    <TableCell className="font-medium">
                      <div 
                        className="flex items-center cursor-pointer hover:text-blue-600" 
                        onClick={() => navigateToFolder(currentPath ? `${currentPath}/${folder}` : folder)}
                      >
                        <Folder className="mr-2 h-4 w-4 text-yellow-500" />
                        <span className="truncate">{folder}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Directory</Badge>
                    </TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigateToFolder(currentPath ? `${currentPath}/${folder}` : folder)}
                        >
                          Open
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                
                {/* Files */}
                {files.map((file) => (
                  <TableRow key={file.path}>
                    <TableCell className="font-medium">
                      <div 
                        className="flex items-center cursor-pointer hover:text-blue-600" 
                        onClick={() => handleFileSelect(file)}
                      >
                        <FileIcon className="mr-2 h-4 w-4 text-blue-500" />
                        <span className="truncate">{file.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">File</Badge>
                    </TableCell>
                    <TableCell>{formatFileSize(file.size)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleFileSelect(file)}
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          asChild
                        >
                          <a 
                            href={`/api/file-browser/files/${file.path}/download`} 
                            download
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteFile(file)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
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
      
      {/* Upload progress display */}
      {isUploading && (
        <div className="px-6 py-4 bg-gray-50 rounded-md m-4">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm font-medium">Uploading {uploadFile?.name}</div>
            <div className="text-sm text-gray-500">{uploadProgress}%</div>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}
      
      {/* File ready to upload alert */}
      {uploadFile && !isUploading && (
        <div className="px-6 py-4 m-4">
          <Alert variant="default">
            <File className="h-4 w-4" />
            <AlertTitle>Ready to upload</AlertTitle>
            <AlertDescription>
              <div className="flex flex-col space-y-2">
                <div>
                  <span className="font-medium">File:</span> {uploadFile.name}
                </div>
                <div>
                  <span className="font-medium">Size:</span> {formatFileSize(uploadFile.size)}
                </div>
                <div>
                  <span className="font-medium">Destination:</span> {currentPath || 'Root'}
                </div>
                <div className="flex space-x-2 mt-2">
                  <Button onClick={startUpload}>
                    Upload Now
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setUploadFile(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      {/* Create Folder Dialog */}
      <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for the new folder.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full"
            />
            <div className="mt-2 text-sm text-gray-500">
              New folder will be created in: {currentPath || 'Root'}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateFolder(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
            >
              {createFolderMutation.isPending ? 'Creating...' : 'Create Folder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete File Confirmation Dialog */}
      <Dialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this file? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {fileToDelete && (
            <div className="py-4">
              <div className="flex items-center p-2 bg-gray-50 rounded">
                <FileIcon className="mr-2 h-4 w-4 text-blue-500" />
                <span className="truncate font-medium">{fileToDelete.name}</span>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFileToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteFile}
              disabled={deleteFileMutation.isPending}
            >
              {deleteFileMutation.isPending ? 'Deleting...' : 'Delete File'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* File Details Dialog */}
      <Dialog open={showFileDetails} onOpenChange={setShowFileDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>File Details</DialogTitle>
          </DialogHeader>
          
          <FileDetails 
            file={selectedFile} 
            onClose={() => setShowFileDetails(false)}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default FileBrowser;