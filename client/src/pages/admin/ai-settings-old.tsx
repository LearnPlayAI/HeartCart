import React from "react";
import { AdminLayout } from "@/components/admin/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, InfoIcon, CheckCircle2, TestTube, AlertCircle, Zap } from "lucide-react";
import { useAIModels, useUpdateAIModel, useTestAIModel } from "@/hooks/use-ai-settings";
import { Helmet } from "react-helmet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

// Model Card Component
interface ModelCardProps {
  model: {
    modelName: string;
    isWorking: boolean;
    description: string;
  };
  isCurrentModel: boolean;
  onSelect: (modelName: string) => void;
  isUpdating: boolean;
}

function ModelCard({ model, isCurrentModel, onSelect, isUpdating }: ModelCardProps) {
  const testModelMutation = useTestAIModel();

  const handleTest = () => {
    testModelMutation.mutate(model.modelName);
  };

  const getModelDisplayName = (modelName: string) => {
    const displayNames: Record<string, string> = {
      'gemini-2.0-flash': 'Gemini 2.0 Flash',
      'gemini-2.5-flash': 'Gemini 2.5 Flash', 
      'gemini-2.5-flash-lite': 'Gemini 2.5 Flash Lite',
      'gemini-2.5-pro': 'Gemini 2.5 Pro'
    };
    return displayNames[modelName] || modelName;
  };

  const getModelBadge = (modelName: string) => {
    if (modelName === 'gemini-2.0-flash') return { text: 'Free Tier', variant: 'default' as const };
    if (modelName === 'gemini-2.5-flash') return { text: 'Best Value', variant: 'secondary' as const };
    if (modelName === 'gemini-2.5-flash-lite') return { text: 'Cost Efficient', variant: 'outline' as const };
    if (modelName === 'gemini-2.5-pro') return { text: 'Most Powerful', variant: 'destructive' as const };
    return { text: 'Standard', variant: 'outline' as const };
  };

  const badge = getModelBadge(model.modelName);

  return (
    <Card className={`border-2 transition-all ${isCurrentModel ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold">{getModelDisplayName(model.modelName)}</h4>
              <Badge variant={badge.variant}>{badge.text}</Badge>
              {model.isWorking ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              {isCurrentModel && <Badge variant="default">Current</Badge>}
            </div>
            <p className="text-sm text-gray-600 mb-3">{model.description}</p>
            <div className="flex items-center gap-2 text-xs">
              <span className={`px-2 py-1 rounded-full ${model.isWorking ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {model.isWorking ? 'Working' : 'Not Responding'}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testModelMutation.isPending}
            >
              {testModelMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <TestTube className="h-3 w-3" />
              )}
            </Button>
            
            {!isCurrentModel && (
              <Button
                onClick={() => onSelect(model.modelName)}
                disabled={isUpdating || !model.isWorking}
                size="sm"
              >
                {isUpdating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Zap className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AISettingsPage() {
  const { data: aiModelsResponse, isLoading: isLoadingModels, error: aiModelsError, refetch } = useAIModels();
  const updateModelMutation = useUpdateAIModel();

  const handleModelChange = (modelName: string) => {
    updateModelMutation.mutate(modelName, {
      onSuccess: () => {
        // Refetch models to update the current selection
        refetch();
      }
    });
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>AI Settings | HeartCart Admin</title>
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
                  {/* Current Model Display */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-blue-900">Current AI Model</h3>
                        <p className="text-sm text-blue-700">
                          {aiModelsResponse?.data?.currentModel || 'Loading...'}
                          {aiModelsResponse?.data?.isDefault && (
                            <Badge variant="secondary" className="ml-2">Default</Badge>
                          )}
                        </p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>

                  {/* Available Models List */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Available Models</h3>
                    {aiModelsResponse?.data?.models?.map((model: any) => (
                      <ModelCard
                        key={model.modelName}
                        model={model}
                        isCurrentModel={model.modelName === aiModelsResponse.data.currentModel}
                        onSelect={handleModelChange}
                        isUpdating={updateModelMutation.isPending}
                      />
                    ))}
                  </div>

                        <SelectContent>
                          {aiModels?.available?.map((model) => (
                            <SelectItem key={model} value={model}>
                              <div className="flex items-center">
                                <span>{model}</span>
                                {model === aiModels?.current && (
                                  <CheckCircle2 className="ml-2 h-4 w-4 text-green-500" />
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={() => aiModels?.current && handleModelChange(aiModels?.current)}
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
                      {aiModels?.available?.map((model) => (
                        <div 
                          key={model} 
                          className={`border rounded-md p-3 relative ${
                            model === aiModels?.current ? "border-primary bg-pink-50" : "border-gray-200"
                          }`}
                        >
                          <div className="flex items-center">
                            <span className="font-medium">{model}</span>
                            {model === aiModels?.current && (
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