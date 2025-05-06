import React from "react";
import { AdminLayout } from "@/components/admin/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, InfoIcon, CheckCircle2 } from "lucide-react";
import { useAIModels, useUpdateAIModel } from "@/hooks/use-ai-settings";
import { Helmet } from "react-helmet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

export default function AISettingsPage() {
  const { data: aiModels, isLoading: isLoadingModels, error: aiModelsError } = useAIModels();
  const updateModelMutation = useUpdateAIModel();

  const handleModelChange = (modelName: string) => {
    updateModelMutation.mutate(modelName);
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>AI Settings | TeeMeYou Admin</title>
      </Helmet>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">AI Settings</h1>
      </div>
      
      <Tabs defaultValue="models" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="models">AI Models</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>
        
        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="mr-2">Gemini AI Model Selection</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-4 w-4 opacity-70" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      Select which Gemini AI model to use for product analysis, background removal, tagging, and price suggestions.
                      Different models have different capabilities and performance characteristics.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
              <CardDescription>
                Choose which Gemini AI model to use for all AI features
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingModels ? (
                <div className="flex justify-center items-center h-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : aiModelsError ? (
                <div className="text-red-500 p-4 rounded-md bg-red-50">
                  Error loading AI models: {aiModelsError.message}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="flex-grow space-y-2">
                      <div className="flex items-center gap-2">
                        <label htmlFor="model-select" className="text-sm font-medium">
                          Current Model:
                        </label>
                        {aiModels?.isDefault && (
                          <Badge variant="outline" className="text-xs bg-yellow-50">
                            Default
                          </Badge>
                        )}
                      </div>
                      <Select 
                        value={aiModels?.current} 
                        onValueChange={handleModelChange}
                        disabled={updateModelMutation.isPending}
                      >
                        <SelectTrigger id="model-select" className="w-full">
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          {aiModels?.available.map((model) => (
                            <SelectItem key={model} value={model}>
                              <div className="flex items-center">
                                <span>{model}</span>
                                {model === aiModels.current && (
                                  <CheckCircle2 className="ml-2 h-4 w-4 text-green-500" />
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={() => aiModels?.current && handleModelChange(aiModels.current)}
                      disabled={updateModelMutation.isPending || !aiModels?.current}
                      className="min-w-32"
                    >
                      {updateModelMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Reinitialize Model"
                      )}
                    </Button>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-md space-y-2">
                    <h3 className="font-medium">Available Models</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {aiModels?.available.map((model) => (
                        <div 
                          key={model} 
                          className={`border rounded-md p-3 relative ${
                            model === aiModels.current ? "border-primary bg-pink-50" : "border-gray-200"
                          }`}
                        >
                          <div className="flex items-center">
                            <span className="font-medium">{model}</span>
                            {model === aiModels.current && (
                              <Badge className="ml-2 bg-primary text-white">Active</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {getModelDescription(model)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced AI Configuration</CardTitle>
              <CardDescription>
                Fine-tune how AI features work in the application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 italic">
                Advanced settings will be available in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

function getModelDescription(modelName: string): string {
  const descriptions: Record<string, string> = {
    'gemini-1.5-flash': 'Fast and efficient model for most tasks with good balance of speed and quality.',
    'gemini-1.5-pro': 'Most powerful model with advanced reasoning and high quality output. Slower but more accurate.',
    'gemini-pro': 'Legacy model with solid performance for most tasks.',
    'gemini-pro-vision': 'Legacy model with vision capabilities for image analysis.'
  };
  
  return descriptions[modelName] || 'Google Gemini AI model';
}