/**
 * Reusable Drag and Drop File Upload Component
 */

import { useState, useCallback, ReactNode } from 'react';
import { useDropzone } from 'react-dropzone';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  onFilesDrop: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
  maxSize?: number; // in MB
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  dropText?: string;
  children?: ReactNode;
}

export const DropZone = ({
  onFilesDrop,
  accept,
  maxFiles = 5,
  maxSize = 5, // 5MB default
  className,
  disabled = false,
  loading = false,
  error,
  dropText = "Drop files here...",
  children
}: DropZoneProps) => {
  const [isDragActive, setIsDragActive] = useState(false);
  
  // Convert maxSize from MB to bytes for dropzone
  const maxSizeBytes = maxSize * 1024 * 1024;
  
  // Convert accept string to Dropzone format
  const getAcceptFormat = () => {
    if (!accept) return undefined;
    
    // Simple parser for accept format (e.g. 'image/*' -> { 'image/*': [] })
    const formats = accept.split(',').map(format => format.trim());
    return formats.reduce((obj, format) => {
      obj[format] = [];
      return obj;
    }, {} as Record<string, string[]>);
  };
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesDrop(acceptedFiles);
  }, [onFilesDrop]);
  
  const {
    getRootProps,
    getInputProps,
    isDragReject,
    fileRejections
  } = useDropzone({
    onDrop,
    accept: getAcceptFormat(),
    maxFiles,
    maxSize: maxSizeBytes,
    disabled: disabled || loading,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDropAccepted: () => setIsDragActive(false),
    onDropRejected: () => setIsDragActive(false)
  });
  
  // Generate error message from rejections
  const getErrorMessage = () => {
    if (error) return error;
    if (fileRejections.length === 0) return null;
    
    const rejection = fileRejections[0];
    const errorCode = rejection.errors[0]?.code;
    
    switch (errorCode) {
      case 'file-too-large':
        return `File is too large. Max size is ${maxSize}MB`;
      case 'file-invalid-type':
        return `File type not accepted. Please upload ${accept} files`;
      case 'too-many-files':
        return `Too many files. Max ${maxFiles} files allowed`;
      default:
        return 'Invalid file';
    }
  };
  
  const errorMessage = getErrorMessage();
  
  return (
    <div className={cn(
      "relative w-full",
      className
    )}>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors flex flex-col items-center justify-center",
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20",
          isDragReject || errorMessage ? "border-destructive/50 bg-destructive/5" : "",
          disabled ? "opacity-60 cursor-not-allowed" : "",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
      >
        <input {...getInputProps()} />
        
        {loading ? (
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : children ? (
          children
        ) : (
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground mb-1">
              {isDragActive ? "Drop files here..." : dropText}
            </p>
            <p className="text-xs text-muted-foreground">
              {`Drag & drop or click to browse (${maxFiles} files max, ${maxSize}MB each)`}
            </p>
          </div>
        )}
      </div>
      
      {errorMessage && (
        <p className="text-sm text-destructive mt-1">
          {errorMessage}
        </p>
      )}
    </div>
  );
};