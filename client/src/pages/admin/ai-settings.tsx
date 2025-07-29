import React from "react";
import { AdminLayout } from "@/components/admin/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    displayName: string;
    isWorking: boolean;
    description: string;
    badge: {
      text: string;
      variant: string;
    };
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

  // All model metadata now comes from the API - no hardcoded configurations

  return (
    <Card className={`border-2 transition-all ${isCurrentModel ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold">{model.displayName}</h4>
              <Badge variant={model.badge.variant as any}>{model.badge.text}</Badge>
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
              title="Test model connectivity"
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
                title={!model.isWorking ? "Model not responding - test first" : "Switch to this model"}
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
  const { data: aiModelsData, isLoading: isLoadingModels, error: aiModelsError, refetch } = useAIModels();
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
                Choose which Gemini AI model to use for all AI features. Models are tested automatically to ensure they're working.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingModels ? (
                <div className="flex justify-center items-center h-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2 text-gray-600">Loading AI models...</span>
                </div>
              ) : aiModelsError ? (
                <div className="text-red-500 p-4 rounded-md bg-red-50">
                  <h3 className="font-semibold mb-2">Error loading AI models</h3>
                  <p>{aiModelsError.message}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => refetch()}
                    className="mt-2"
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Current Model Display */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-blue-900">Current AI Model</h3>
                        <p className="text-sm text-blue-700">
                          {aiModelsData?.data?.currentModel || 'Loading...'}
                          {aiModelsData?.data?.isDefault && (
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
                    <div className="space-y-3">
                      {aiModelsData?.data?.models?.map((model: any) => (
                        <ModelCard
                          key={model.modelName}
                          model={model}
                          isCurrentModel={model.modelName === aiModelsData.data.currentModel}
                          onSelect={handleModelChange}
                          isUpdating={updateModelMutation.isPending}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <h3 className="font-semibold text-gray-900 mb-2">How to use:</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• <strong>Test button</strong>: Check if a model is responding correctly</li>
                      <li>• <strong>Switch button</strong>: Change to a different working model</li>
                      <li>• <strong>Status indicators</strong>: Green = working, Red = not responding</li>
                      <li>• Models are automatically tested when this page loads</li>
                    </ul>
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