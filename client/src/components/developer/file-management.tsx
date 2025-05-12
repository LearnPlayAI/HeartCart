import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Database } from 'lucide-react';
import FileBrowser from './file-browser';

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
            <div className="p-6 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium">URL Handling Tests</h3>
              <p className="mt-2 text-gray-500">
                Test URL encoding and path handling for files with spaces and special characters.
              </p>
              <p className="mt-4 text-sm text-gray-500">
                Coming soon: Select specific folders for URL testing.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FileManagement;