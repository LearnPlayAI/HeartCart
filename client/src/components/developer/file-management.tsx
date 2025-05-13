import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Database, 
  FileImage, 
  Link2, 
  ExternalLink, 
  XCircle, 
  CheckCircle2 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import FileBrowser from './file-browser';

// FileUrlTests component for testing URL handling with spaces and special characters
const FileUrlTests: React.FC = () => {
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [checkedFiles, setCheckedFiles] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, {passed: boolean, message: string}>>({});
  const { toast } = useToast();
  
  // Get list of root folders
  const { 
    data: foldersData,
    isLoading: isFoldersLoading
  } = useQuery<{ success: boolean, data: { folders: string[] } }>({
    queryKey: ['/api/file-browser/folders'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchOnWindowFocus: false
  });
  
  // Get files when a folder is selected
  const {
    data: filesData,
    isLoading: isFilesLoading,
    refetch: refetchFiles
  } = useQuery<{ success: boolean, data: { files: any[] } }>({
    queryKey: [`/api/file-browser/folders/${encodeURIComponent(selectedFolder)}/files`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!selectedFolder,
    refetchOnWindowFocus: false
  });
  
  const folders = foldersData?.success ? foldersData.data.folders : [];
  const files = filesData?.success ? filesData.data.files : [];
  
  // Test a single file URL
  const testFileUrl = (file: any) => {
    if (!file || !file.url) {
      return;
    }
    
    // Create an image element to test loading
    const img = new Image();
    img.onload = () => {
      setCheckedFiles(prev => ({
        ...prev,
        [file.path]: true
      }));
      
      setTestResults(prev => ({
        ...prev,
        [file.path]: {
          passed: true,
          message: `Successfully loaded image: ${file.name}`
        }
      }));
      
      toast({
        title: 'URL Test Passed',
        description: `Successfully loaded image: ${file.name}`,
        variant: 'default'
      });
    };
    img.onerror = () => {
      setCheckedFiles(prev => ({
        ...prev,
        [file.path]: false
      }));
      
      setTestResults(prev => ({
        ...prev,
        [file.path]: {
          passed: false,
          message: `Failed to load image: ${file.name}`
        }
      }));
      
      toast({
        title: 'URL Test Failed',
        description: `Failed to load image: ${file.name}`,
        variant: 'destructive'
      });
    };
    img.src = file.url;
  };
  
  // Test all files in the current folder
  const testAllFiles = () => {
    if (!files || files.length === 0) {
      toast({
        title: 'No Files to Test',
        description: 'There are no files available to test in this folder.',
        variant: 'default'
      });
      return;
    }
    
    // Clear previous results
    setCheckedFiles({});
    setTestResults({});
    
    // Test each file
    files.forEach(file => {
      setTimeout(() => testFileUrl(file), 200);
    });
  };
  
  // Run a special test for filenames with spaces
  const testSpacesHandling = () => {
    if (!files || files.length === 0) {
      toast({
        title: 'No Files to Test',
        description: 'There are no files available to test in this folder.',
        variant: 'default'
      });
      return;
    }
    
    // Filter files with spaces in the name
    const filesWithSpaces = files.filter(file => file.name.includes(' '));
    
    if (filesWithSpaces.length === 0) {
      toast({
        title: 'No Files with Spaces',
        description: 'There are no files with spaces in their names in this folder.',
        variant: 'default'
      });
      return;
    }
    
    // Test each file with spaces
    filesWithSpaces.forEach(file => {
      setTimeout(() => testFileUrl(file), 200);
    });
  };
  
  // Test URL encoding for special characters
  const testSpecialChars = () => {
    if (!files || files.length === 0) {
      toast({
        title: 'No Files to Test',
        description: 'There are no files available to test in this folder.',
        variant: 'default'
      });
      return;
    }
    
    // Filter files with special characters in the name
    const hasSpecialChars = (name: string) => {
      return /[!@#$%^&*()+={}\[\];:'",<>?~]/.test(name);
    };
    
    const filesWithSpecialChars = files.filter(file => hasSpecialChars(file.name));
    
    if (filesWithSpecialChars.length === 0) {
      toast({
        title: 'No Files with Special Characters',
        description: 'There are no files with special characters in their names in this folder.',
        variant: 'default'
      });
      return;
    }
    
    // Test each file with special characters
    filesWithSpecialChars.forEach(file => {
      setTimeout(() => testFileUrl(file), 200);
    });
  };
  
  const getStatusIcon = (status: boolean | undefined) => {
    if (status === undefined) return null;
    return status 
      ? <CheckCircle2 className="w-5 h-5 text-green-500" /> 
      : <XCircle className="w-5 h-5 text-red-500" />;
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
        <h3 className="text-lg font-medium mb-2">File URL Tests</h3>
        <p className="text-gray-600 mb-4">
          Test file URL encoding and handling, particularly for files with spaces and special characters.
        </p>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Select Folder</label>
          <Select
            value={selectedFolder}
            onValueChange={setSelectedFolder}
          >
            <SelectTrigger className="w-full md:w-64">
              <SelectValue placeholder="Select a folder" />
            </SelectTrigger>
            <SelectContent>
              {isFoldersLoading ? (
                <SelectItem value="loading" disabled>Loading folders...</SelectItem>
              ) : folders && folders.length > 0 ? (
                folders.map((folder) => (
                  <SelectItem key={folder} value={folder}>{folder}</SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>No folders available</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        
        {selectedFolder && (
          <div className="mt-6">
            <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
              <h4 className="font-medium">Files in {selectedFolder}</h4>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={testAllFiles}
                  disabled={isFilesLoading || files.length === 0}
                >
                  <Link2 className="h-4 w-4 mr-1" />
                  Test All URLs
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={testSpacesHandling}
                  disabled={isFilesLoading || files.length === 0}
                >
                  Test Spaces
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={testSpecialChars}
                  disabled={isFilesLoading || files.length === 0}
                >
                  Test Special Chars
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => refetchFiles()}
                  disabled={isFilesLoading}
                >
                  Refresh
                </Button>
              </div>
            </div>
            
            {isFilesLoading ? (
              <div className="text-center py-8">
                <FileImage className="mx-auto h-8 w-8 text-gray-400 animate-pulse" />
                <p className="mt-2 text-sm text-gray-500">Loading files...</p>
              </div>
            ) : files && files.length > 0 ? (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[160px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {files.map((file) => (
                      <TableRow key={file.path} className={
                        checkedFiles[file.path] !== undefined 
                          ? (checkedFiles[file.path] ? 'bg-green-50' : 'bg-red-50') 
                          : ''
                      }>
                        <TableCell className="font-mono text-sm">
                          {file.name}
                          {file.name.includes(' ') && (
                            <Badge variant="outline" className="ml-2 bg-amber-50">
                              Contains Spaces
                            </Badge>
                          )}
                          {/[!@#$%^&*()+={}\[\];:'",<>?~]/.test(file.name) && (
                            <Badge variant="outline" className="ml-2 bg-blue-50">
                              Special Chars
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusIcon(checkedFiles[file.path])}
                          {testResults[file.path] && (
                            <span className="ml-2 text-xs text-gray-500">
                              {testResults[file.path].passed ? 'Passed' : 'Failed'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => testFileUrl(file)}
                            >
                              <Link2 className="h-4 w-4 mr-1" />
                              Test URL
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <a 
                                href={file.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Open
                              </a>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 border rounded-md">
                <FileImage className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No files found in this folder</p>
                <p className="text-xs text-gray-400 mt-1">
                  Use the File Browser tab to upload files first
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * File Management component for the Storage Tests page
 * This component provides a tabbed interface for file browsing and URL testing
 */
const FileManagement: React.FC = () => {
  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <div className="flex items-center">
          <FileText className="w-6 h-6 text-blue-600 mr-2" />
          <div>
            <CardTitle>Object Storage Management</CardTitle>
            <CardDescription>
              Browse, upload, and manage files in Replit Object Storage
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="file-browser" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="file-browser">
              <Database className="h-4 w-4 mr-2" />
              File Browser
            </TabsTrigger>
            <TabsTrigger value="url-tests">
              <FileText className="h-4 w-4 mr-2" />
              URL Tests
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="file-browser">
            <FileBrowser />
          </TabsContent>
          
          <TabsContent value="url-tests">
            <FileUrlTests />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FileManagement;