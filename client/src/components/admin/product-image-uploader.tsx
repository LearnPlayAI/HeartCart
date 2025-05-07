import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImagePlus, X, Loader2, Crop, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ImageCropModal } from './image-crop-modal';
import { useProductAnalysis } from '@/hooks/use-ai';

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
  cropped?: boolean;
};

const ProductImageUploader = ({ productId, onUploadComplete }: ProductImageUploaderProps) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);
  const { toast } = useToast();
  const { removeBackground, isProcessing: isRemovingBackground } = useProductAnalysis({
    onSuccess: () => {
      // We'll handle success in the actual removeBackground call
    }
  });
  
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
  
  const openCropModal = (index: number) => {
    setSelectedFileIndex(index);
    setCropModalOpen(true);
  };
  
  const handleCropComplete = (croppedImageBlob: Blob) => {
    if (selectedFileIndex === null) return;
    
    // Create a new file with the cropped image
    const newFile = new File(
      [croppedImageBlob],
      files[selectedFileIndex].file.name,
      { type: croppedImageBlob.type }
    );
    
    // Create a new URL for the preview
    const newPreview = URL.createObjectURL(croppedImageBlob);
    
    // Update the file in the list
    setFiles(prev => {
      const newFiles = [...prev];
      // Revoke the old preview URL to avoid memory leaks
      URL.revokeObjectURL(newFiles[selectedFileIndex].preview);
      
      newFiles[selectedFileIndex] = {
        ...newFiles[selectedFileIndex],
        file: newFile,
        preview: newPreview,
        cropped: true
      };
      return newFiles;
    });
    
    // Close the modal
    setCropModalOpen(false);
    setSelectedFileIndex(null);
    
    toast({
      title: 'Image cropped',
      description: 'The image has been cropped successfully',
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
    
    try {
      // Create a FormData object
      const formData = new FormData();
      
      // Append each file to the FormData
      filesToUpload.forEach((fileItem) => {
        // Use 'images' as the field name to match server expectations
        formData.append('images', fileItem.file);
        
        // Update progress
        setFiles(prev => {
          const newFiles = [...prev];
          const fileIndex = newFiles.findIndex(f => f.preview === fileItem.preview);
          if (fileIndex !== -1) {
            newFiles[fileIndex] = { ...newFiles[fileIndex], progress: 50 };
          }
          return newFiles;
        });
      });
      
      // Upload all files at once using fetch directly (not apiRequest)
      // Use the /api/upload route which has multer configured for file handling
      const response = await fetch(`/api/upload/products/${productId}/images`, {
        method: 'POST',
        body: formData,
        // No Content-Type header - browser sets it automatically with boundary
      });
      
      if (!response.ok) {
        let errorMessage = 'Upload failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If response is not JSON, use text
          errorMessage = await response.text() || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      // Log successful response for debugging
      console.log("Upload successful, response:", data);
      
      // Verify we got the expected response format
      if (!data.success || !data.files || !Array.isArray(data.files)) {
        console.warn("Unexpected response format:", data);
      }
      
      // Update all files to success
      setFiles(prev => 
        prev.map(file => {
          if (file.status === 'uploading') {
            return { ...file, status: 'success', progress: 100 };
          }
          return file;
        })
      );
      
      const successCount = filesToUpload.length;
    } catch (error) {
      // Update all uploading files to error status
      setFiles(prev => 
        prev.map(file => {
          if (file.status === 'uploading') {
            return { 
              ...file, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Upload failed' 
            };
          }
          return file;
        })
      );
      
      // Show error toast
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload images',
        variant: 'destructive',
      });
      
      const successCount = 0;
    
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
      {/* Background Removal Loading Overlay */}
      {isRemovingBackground && selectedFileIndex !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col items-center justify-center">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg max-w-md text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-pink-600" />
            <h3 className="text-lg font-semibold mb-2">AI Processing</h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Removing background from your image using AI...
            </p>
          </div>
        </div>
      )}
      
      {/* Crop Modal */}
      {selectedFileIndex !== null && files[selectedFileIndex] && (
        <ImageCropModal
          open={cropModalOpen}
          onOpenChange={setCropModalOpen}
          imageUrl={files[selectedFileIndex].preview}
          onCropComplete={handleCropComplete}
          aspectRatio={1}
        />
      )}
      
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
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setSelectedFileIndex(index);
                        // Convert the file to a base64 data URL for AI processing
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (reader.result) {
                            removeBackground({ imageUrl: reader.result.toString() })
                              .then(processedImageUrl => {
                                if (processedImageUrl && selectedFileIndex !== null) {
                                  // Convert the base64 data to a blob
                                  const base64Data = processedImageUrl.split(',')[1];
                                  const binaryData = atob(base64Data);
                                  const array = new Uint8Array(binaryData.length);
                                  for (let i = 0; i < binaryData.length; i++) {
                                    array[i] = binaryData.charCodeAt(i);
                                  }
                                  const blob = new Blob([array], { type: 'image/png' });
                                  
                                  // Create a new file with the processed image
                                  const newFile = new File(
                                    [blob],
                                    files[selectedFileIndex].file.name,
                                    { type: 'image/png' }
                                  );
                                  
                                  // Create a new URL for the preview
                                  const newPreview = URL.createObjectURL(blob);
                                  
                                  // Update the file in the list
                                  setFiles(prev => {
                                    const newFiles = [...prev];
                                    // Revoke the old preview URL to avoid memory leaks
                                    URL.revokeObjectURL(newFiles[selectedFileIndex].preview);
                                    
                                    newFiles[selectedFileIndex] = {
                                      ...newFiles[selectedFileIndex],
                                      file: newFile,
                                      preview: newPreview,
                                    };
                                    return newFiles;
                                  });
                                  
                                  // Clear the selected file index
                                  setSelectedFileIndex(null);
                                }
                              });
                          }
                        };
                        reader.readAsDataURL(file.file);
                      }}
                      className="bg-pink-600/80 hover:bg-pink-600 text-white rounded-full p-1"
                      title="Remove background (AI)"
                      disabled={isRemovingBackground}
                    >
                      <Wand2 size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openCropModal(index); }}
                      className="bg-zinc-900/70 hover:bg-zinc-900 text-white rounded-full p-1"
                      title="Crop image"
                    >
                      <Crop size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                      className="bg-zinc-900/70 hover:bg-zinc-900 text-white rounded-full p-1"
                      title="Remove image"
                    >
                      <X size={16} />
                    </button>
                  </div>
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