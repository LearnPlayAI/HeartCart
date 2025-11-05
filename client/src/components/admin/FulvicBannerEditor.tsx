import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Eye, Save } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface BannerConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  backgroundImageUrl?: string;
  backgroundObjectKey?: string;
  textColor?: string;
  overlayOpacity?: number;
}

export function FulvicBannerEditor() {
  const { toast } = useToast();
  const [config, setConfig] = useState<BannerConfig>({
    enabled: true,
    title: '',
    subtitle: '',
    ctaText: '',
    ctaLink: '',
    textColor: '#FFFFFF',
    overlayOpacity: 0.3
  });
  const [showPreview, setShowPreview] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const { data: settingData, isLoading } = useQuery({
    queryKey: ['/api/admin/settings/fulvicHeroConfig'],
    retry: false
  });

  useEffect(() => {
    if (settingData?.success && settingData.data?.settingValue) {
      try {
        const parsed = JSON.parse(settingData.data.settingValue);
        setConfig(parsed);
      } catch (error) {
        console.error('Error parsing banner config:', error);
      }
    }
  }, [settingData]);

  const updateMutation = useMutation({
    mutationFn: async (newConfig: BannerConfig) => {
      return await apiRequest('/api/admin/settings/fulvicHeroConfig', {
        method: 'PUT',
        body: JSON.stringify({
          settingValue: JSON.stringify(newConfig)
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings/fulvicHeroConfig'] });
      toast({
        title: 'Banner Updated',
        description: 'Fulvic Wellness banner has been saved successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update banner configuration.',
        variant: 'destructive',
      });
    }
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload an image file.',
        variant: 'destructive',
      });
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      setConfig(prev => ({
        ...prev,
        backgroundImageUrl: data.url,
        backgroundObjectKey: data.objectKey
      }));

      toast({
        title: 'Image Uploaded',
        description: 'Banner image uploaded successfully.',
      });
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setConfig(prev => ({
      ...prev,
      backgroundImageUrl: undefined,
      backgroundObjectKey: undefined
    }));
  };

  const handleSave = () => {
    if (!config.title || !config.subtitle) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in title and subtitle.',
        variant: 'destructive',
      });
      return;
    }

    updateMutation.mutate(config);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fulvic Wellness Banner</CardTitle>
        <CardDescription>
          Configure the promotional banner that appears at the top of the homepage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="enabled"
            checked={config.enabled}
            onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
            className="h-4 w-4"
            data-testid="checkbox-banner-enabled"
          />
          <Label htmlFor="enabled">Enable Banner</Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Banner Title *</Label>
          <Input
            id="title"
            value={config.title}
            onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Discover Fulvic Wellness"
            maxLength={60}
            data-testid="input-banner-title"
          />
          <p className="text-sm text-gray-500">{config.title.length}/60 characters</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subtitle">Subtitle *</Label>
          <Textarea
            id="subtitle"
            value={config.subtitle}
            onChange={(e) => setConfig(prev => ({ ...prev, subtitle: e.target.value }))}
            placeholder="Premium health and wellness products for you and your animals"
            maxLength={150}
            rows={3}
            data-testid="input-banner-subtitle"
          />
          <p className="text-sm text-gray-500">{config.subtitle.length}/150 characters</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ctaText">Button Text</Label>
            <Input
              id="ctaText"
              value={config.ctaText}
              onChange={(e) => setConfig(prev => ({ ...prev, ctaText: e.target.value }))}
              placeholder="Shop Now"
              maxLength={30}
              data-testid="input-banner-cta-text"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ctaLink">Button Link</Label>
            <Input
              id="ctaLink"
              value={config.ctaLink}
              onChange={(e) => setConfig(prev => ({ ...prev, ctaLink: e.target.value }))}
              placeholder="/products?category=health-wellness"
              data-testid="input-banner-cta-link"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Background Image</Label>
          {config.backgroundImageUrl ? (
            <div className="relative">
              <img
                src={config.backgroundImageUrl}
                alt="Banner background"
                className="w-full h-48 object-cover rounded-lg"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={handleRemoveImage}
                data-testid="button-remove-banner-image"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">Upload banner image</p>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="cursor-pointer"
                data-testid="input-banner-image-upload"
              />
              {uploadingImage && <p className="text-sm text-pink-500 mt-2">Uploading...</p>}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="textColor">Text Color</Label>
            <Input
              id="textColor"
              type="color"
              value={config.textColor}
              onChange={(e) => setConfig(prev => ({ ...prev, textColor: e.target.value }))}
              data-testid="input-banner-text-color"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="overlayOpacity">Overlay Opacity</Label>
            <Input
              id="overlayOpacity"
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={config.overlayOpacity}
              onChange={(e) => setConfig(prev => ({ ...prev, overlayOpacity: parseFloat(e.target.value) }))}
              data-testid="input-banner-overlay-opacity"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-pink-500 hover:bg-pink-600"
            data-testid="button-save-banner"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? 'Saving...' : 'Save Banner'}
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
            data-testid="button-toggle-banner-preview"
          >
            <Eye className="h-4 w-4 mr-2" />
            {showPreview ? 'Hide' : 'Show'} Preview
          </Button>
        </div>

        {showPreview && config.enabled && (
          <div className="mt-6 border rounded-lg overflow-hidden">
            <div 
              className="relative h-64 flex items-center justify-center"
              style={{
                backgroundImage: config.backgroundImageUrl ? `url(${config.backgroundImageUrl})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div 
                className="absolute inset-0 bg-black"
                style={{ opacity: config.overlayOpacity || 0.3 }}
              ></div>
              <div className="relative z-10 text-center px-4">
                <h2 
                  className="text-3xl md:text-4xl font-bold mb-2"
                  style={{ color: config.textColor }}
                >
                  {config.title || 'Banner Title'}
                </h2>
                <p 
                  className="text-lg md:text-xl mb-4"
                  style={{ color: config.textColor }}
                >
                  {config.subtitle || 'Banner subtitle text'}
                </p>
                {config.ctaText && (
                  <Button 
                    className="bg-pink-500 hover:bg-pink-600 text-white"
                  >
                    {config.ctaText}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
