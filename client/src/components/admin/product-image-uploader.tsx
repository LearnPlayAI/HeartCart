import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

type ProductImageUploaderProps = {
  productId: number;
  onUploadComplete?: () => void;
};

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

type FileWithPreview = {
  file: File;
  preview: string;
  status: UploadStatus;
  progress: number;
  error?: string;
};

const ProductImageUploader = ({ productId, onUploadComplete }: ProductImageUploaderProps) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const { toast } = useToast();
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Create previews for the dropped files
    const filesWithPreviews = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'idle' as UploadStatus,
      progress: 0
    }));
    
    setFiles(prev => [...prev, ...filesWithPreviews]);
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/webp': [],
      'image/gif': []
    },
    maxSize: 5 * 1024 * 1024, // 5MB max file size
    maxFiles: 10,
  });
  
  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      // Revoke the object URL to avoid memory leaks
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };
  
  const uploadFiles = async () => {
    const filesToUpload = files.filter(f => f.status === 'idle');
    
    if (filesToUpload.length === 0) {
      toast({
        title: 'No files to upload',
        description: 'Please add some images first',
        variant: 'destructive',
      });
      return;
    }
    
    // Update status of files to uploading
    setFiles(prev => 
      prev.map(file => 
        file.status === 'idle' ? { ...file, status: 'uploading' as UploadStatus } : file
      )
    );
    
    // Upload all files in parallel
    const uploadPromises = filesToUpload.map(async (fileItem, index) => {
      try {
        // Convert the file to a base64 data URL
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(fileItem.file);
        const base64Data = await base64Promise;
        
        // Update progress
        setFiles(prev => {
          const newFiles = [...prev];
          const fileIndex = newFiles.findIndex(f => f.preview === fileItem.preview);
          if (fileIndex !== -1) {
            newFiles[fileIndex] = { ...newFiles[fileIndex], progress: 50 };
          }
          return newFiles;
        });
        
        // Upload to the server
        const response = await apiRequest('POST', `/api/products/${productId}/images`, {
          url: base64Data,
          isMain: index === 0, // Set the first image as main by default
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Upload failed');
        }
        
        // Update file status to success
        setFiles(prev => {
          const newFiles = [...prev];
          const fileIndex = newFiles.findIndex(f => f.preview === fileItem.preview);
          if (fileIndex !== -1) {
            newFiles[fileIndex] = { ...newFiles[fileIndex], status: 'success', progress: 100 };
          }
          return newFiles;
        });
        
        return true;
      } catch (error) {
        // Update file status to error
        setFiles(prev => {
          const newFiles = [...prev];
          const fileIndex = newFiles.findIndex(f => f.preview === fileItem.preview);
          if (fileIndex !== -1) {
            newFiles[fileIndex] = { 
              ...newFiles[fileIndex], 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Upload failed' 
            };
          }
          return newFiles;
        });
        
        return false;
      }
    });
    
    const results = await Promise.all(uploadPromises);
    const successCount = results.filter(Boolean).length;
    
    // Display toast with upload results
    if (successCount > 0) {
      toast({
        title: 'Upload complete',
        description: `Successfully uploaded ${successCount} of ${filesToUpload.length} files`,
      });
      
      // Invalidate the product images cache
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/images`] });
      
      // Call the callback if provided
      if (onUploadComplete) {
        onUploadComplete();
      }
    } else {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload any images. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="space-y-4">
      <div 
        {...getRootProps()} 
        className={cn(
          "border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-8 text-center cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition",
          isDragActive && "bg-zinc-50 dark:bg-zinc-900/50 border-primary"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2">
          <ImagePlus size={36} className="text-zinc-400" />
          <p className="text-zinc-600 dark:text-zinc-400">
            {isDragActive ? 
              "Drop the files here..." : 
              "Drag 'n' drop some product images here, or click to select files"
            }
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            Supports JPG, PNG, GIF, WEBP up to 5MB
          </p>
        </div>
      </div>
      
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {files.map((file, index) => (
              <div 
                key={index} 
                className="relative group rounded-lg border overflow-hidden aspect-square"
              >
                <img
                  src={file.preview}
                  alt={`Product preview ${index}`}
                  className={cn(
                    "w-full h-full object-cover transition-opacity",
                    (file.status === 'uploading' || file.status === 'error') && "opacity-50"
                  )}
                  onLoad={() => { URL.revokeObjectURL(file.preview) }}
                />
                
                {file.status === 'idle' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                    className="absolute top-1 right-1 bg-zinc-900/70 hover:bg-zinc-900 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                  >
                    <X size={16} />
                  </button>
                )}
                
                {file.status === 'uploading' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/30">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                    <p className="text-xs text-white mt-2">{file.progress}%</p>
                  </div>
                )}
                
                {file.status === 'success' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-green-500/30">
                    <div className="bg-green-500 text-white text-xs px-2 py-1 rounded">
                      Uploaded
                    </div>
                  </div>
                )}
                
                {file.status === 'error' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-500/30">
                    <div className="bg-red-500 text-white text-xs px-2 py-1 rounded max-w-[90%] text-center" title={file.error}>
                      {file.error?.substring(0, 20)}...
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setFiles([])}
              disabled={files.some(f => f.status === 'uploading')}
            >
              Clear All
            </Button>
            <Button 
              onClick={uploadFiles}
              disabled={files.some(f => f.status === 'uploading') || files.filter(f => f.status === 'idle').length === 0}
            >
              {files.some(f => f.status === 'uploading') ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                `Upload ${files.filter(f => f.status === 'idle').length} Images`
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductImageUploader;