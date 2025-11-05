import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Eye, Save, Link as LinkIcon } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface ImageVariant {
  url: string;
  width: number;
  height: number;
  size: number;
  suffix: string;
}

interface BannerConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  ctaLinkType?: 'category' | 'custom';
  ctaCategoryId?: number;
  ctaCategorySlug?: string;
  backgroundImageUrl?: string;
  backgroundObjectKey?: string;
  imageVariants?: ImageVariant[];
  bannerId?: string;
  textColor?: string;
  overlayOpacity?: number;
}

export function MarketingBannerEditor() {
  const { toast } = useToast();
  const [config, setConfig] = useState<BannerConfig>({
    enabled: true,
    title: '',
    subtitle: '',
    ctaText: '',
    ctaLink: '',
    ctaLinkType: 'custom',
    textColor: '#FFFFFF',
    overlayOpacity: 0.3,
    bannerId: `banner-${Date.now()}`
  });
  const [showPreview, setShowPreview] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const { data: settingData, isLoading } = useQuery({
    queryKey: ['/api/admin/settings/marketingBannerConfig'],
    retry: false
  });
  
  const { data: categoriesData } = useQuery({
    queryKey: ['/api/categories/main/with-children']
  });

  useEffect(() => {
    if (settingData?.success && settingData.data?.settingValue) {
      try {
        const parsed = JSON.parse(settingData.data.settingValue);
        
        // Migration: detect if config uses old format (no ctaLinkType)
        if (!parsed.ctaLinkType) {
          // Check if ctaLink matches category pattern
          const categoryMatch = parsed.ctaLink?.match(/\/products\?category=(.+)/);
          if (categoryMatch && categoriesData?.success) {
            // Try to find matching category by slug
            const slug = categoryMatch[1];
            const allCategories = categoriesData.data.flatMap((parent: any) => 
              [parent.category, ...(parent.children || [])]
            );
            const matchedCategory = allCategories.find((cat: any) => cat.slug === slug);
            
            if (matchedCategory) {
              parsed.ctaLinkType = 'category';
              parsed.ctaCategoryId = matchedCategory.id;
              parsed.ctaCategorySlug = matchedCategory.slug;
            } else {
              parsed.ctaLinkType = 'custom';
            }
          } else {
            parsed.ctaLinkType = 'custom';
          }
        }
        
        // Ensure bannerId exists
        if (!parsed.bannerId) {
          parsed.bannerId = `banner-${Date.now()}`;
        }
        
        setConfig(parsed);
      } catch (error) {
        console.error('Error parsing banner config:', error);
      }
    }
  }, [settingData, categoriesData]);

  const updateMutation = useMutation({
    mutationFn: async (newConfig: BannerConfig) => {
      return await apiRequest('/api/admin/settings/marketingBannerConfig', {
        method: 'PUT',
        body: JSON.stringify({
          settingValue: JSON.stringify(newConfig)
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings/marketingBannerConfig'] });
      toast({
        title: 'Banner Updated',
        description: 'Marketing banner has been saved successfully.',
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
      formData.append('bannerId', config.bannerId || `banner-${Date.now()}`);

      const response = await fetch('/api/banners/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Upload failed');
      }
      
      const { variants, bannerId } = result.data;
      
      // Use the desktop variant as the primary image
      const primaryVariant = variants.find((v: ImageVariant) => v.suffix === 'desktop') || variants[0];
      
      setConfig(prev => ({
        ...prev,
        imageVariants: variants,
        bannerId,
        backgroundImageUrl: primaryVariant.url,
        backgroundObjectKey: `public/banners/${bannerId}/${primaryVariant.url.split('/').pop()}`
      }));

      toast({
        title: 'Banner Uploaded',
        description: result.warning || `Responsive banner images generated successfully.`,
        variant: result.warning ? 'default' : undefined,
      });
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload image. Please try again.',
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
      backgroundObjectKey: undefined,
      imageVariants: undefined
    }));
  };
  
  const handleCategoryChange = (categoryId: string) => {
    const allCategories = categoriesData?.success ? categoriesData.data.flatMap((parent: any) => 
      [parent.category, ...(parent.children || [])]
    ) : [];
    
    const selectedCategory = allCategories.find((cat: any) => cat.id === parseInt(categoryId));
    
    if (selectedCategory) {
      setConfig(prev => ({
        ...prev,
        ctaCategoryId: selectedCategory.id,
        ctaCategorySlug: selectedCategory.slug,
        ctaLink: `/products?category=${selectedCategory.slug}`
      }));
    }
  };
  
  const handleLinkTypeChange = (type: 'category' | 'custom') => {
    setConfig(prev => {
      if (type === 'category' && prev.ctaCategorySlug) {
        // Switch to category mode and regenerate URL
        return {
          ...prev,
          ctaLinkType: type,
          ctaLink: `/products?category=${prev.ctaCategorySlug}`
        };
      } else if (type === 'custom') {
        // Switch to custom mode
        return {
          ...prev,
          ctaLinkType: type
        };
      }
      return { ...prev, ctaLinkType: type };
    });
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
        <CardTitle>Marketing Banner</CardTitle>
        <CardDescription>
          Configure the promotional banner that appears at the top of the homepage. Perfect for seasonal campaigns, special promotions, or featured product ranges.
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

        <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
          <Label>Button Destination</Label>
          
          <RadioGroup value={config.ctaLinkType} onValueChange={handleLinkTypeChange}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="category" id="link-category" />
              <Label htmlFor="link-category" className="font-normal cursor-pointer">
                Link to Category
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="custom" id="link-custom" />
              <Label htmlFor="link-custom" className="font-normal cursor-pointer">
                Custom URL
              </Label>
            </div>
          </RadioGroup>

          {config.ctaLinkType === 'category' ? (
            <div className="space-y-2">
              <Select 
                value={config.ctaCategoryId?.toString() || ''} 
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger data-testid="select-banner-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesData?.success && categoriesData.data.map((parent: any) => (
                    <div key={parent.category.id}>
                      <SelectItem value={parent.category.id.toString()}>
                        {parent.category.name}
                      </SelectItem>
                      {parent.children && parent.children.map((child: any) => (
                        <SelectItem key={child.id} value={child.id.toString()} className="pl-6">
                          └─ {child.name}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
              {config.ctaLink && (
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-white rounded p-2">
                  <LinkIcon className="h-4 w-4" />
                  <span className="font-mono text-xs">{config.ctaLink}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                id="ctaLink"
                value={config.ctaLink}
                onChange={(e) => setConfig(prev => ({ ...prev, ctaLink: e.target.value }))}
                placeholder="/products or /special-offer"
                data-testid="input-banner-cta-link"
              />
              <p className="text-xs text-gray-500">Enter any URL path (e.g., /products, /about, etc.)</p>
            </div>
          )}
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
            <AspectRatio ratio={21 / 9} className="bg-gradient-to-r from-purple-500 to-pink-500">
              <div className="relative w-full h-full flex items-center justify-center">
                {config.imageVariants && config.imageVariants.length > 0 ? (
                  <picture>
                    <source
                      media="(min-width: 1920px)"
                      srcSet={config.imageVariants.find(v => v.suffix === '4k')?.url}
                    />
                    <source
                      media="(min-width: 1280px)"
                      srcSet={config.imageVariants.find(v => v.suffix === 'hd')?.url}
                    />
                    <source
                      media="(min-width: 768px)"
                      srcSet={config.imageVariants.find(v => v.suffix === 'desktop')?.url}
                    />
                    <source
                      media="(min-width: 480px)"
                      srcSet={config.imageVariants.find(v => v.suffix === 'tablet')?.url}
                    />
                    <img
                      src={config.imageVariants.find(v => v.suffix === 'mobile')?.url || config.backgroundImageUrl}
                      alt="Banner background"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </picture>
                ) : config.backgroundImageUrl ? (
                  <img
                    src={config.backgroundImageUrl}
                    alt="Banner background"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : null}
                
                <div 
                  className="absolute inset-0 bg-black"
                  style={{ opacity: config.overlayOpacity || 0.3 }}
                />
                
                <div className="relative z-10 text-center px-4 max-w-4xl">
                  <h2 
                    className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3"
                    style={{ color: config.textColor }}
                  >
                    {config.title || 'Banner Title'}
                  </h2>
                  <p 
                    className="text-base sm:text-lg md:text-xl lg:text-2xl mb-4 sm:mb-6"
                    style={{ color: config.textColor }}
                  >
                    {config.subtitle || 'Banner subtitle text'}
                  </p>
                  {config.ctaText && (
                    <Button 
                      className="bg-pink-500 hover:bg-pink-600 text-white text-sm sm:text-base"
                    >
                      {config.ctaText}
                    </Button>
                  )}
                </div>
              </div>
            </AspectRatio>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
