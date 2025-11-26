import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { ArrowRight } from 'lucide-react';

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
  backgroundImageUrl?: string;
  backgroundObjectKey?: string;
  imageVariants?: ImageVariant[];
  textColor?: string;
  overlayOpacity?: number;
}

export function MarketingBanner() {
  const [, setLocation] = useLocation();
  
  const { data: settingData } = useQuery({
    queryKey: ['/api/settings/marketingBannerConfig'],
    retry: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  if (!settingData?.success || !settingData.data?.settingValue) {
    return null;
  }

  let config: BannerConfig;
  try {
    config = JSON.parse(settingData.data.settingValue);
  } catch (error) {
    console.error('Error parsing banner config:', error);
    return null;
  }

  if (!config.enabled || !config.title) {
    return null;
  }

  const handleCtaClick = () => {
    if (config.ctaLink) {
      if (config.ctaLink.startsWith('http')) {
        window.location.href = config.ctaLink;
      } else {
        setLocation(config.ctaLink);
      }
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-lg shadow-md mb-4 md:mb-6"
      data-testid="marketing-banner"
    >
      {/* Responsive container: taller on mobile (aspect-[3/2]), wider on tablet (aspect-[3/1]), widest on desktop (aspect-[4/1]) */}
      <div className="relative w-full aspect-[3/2] sm:aspect-[3/1] md:aspect-[4/1] bg-gradient-to-r from-purple-500 to-pink-500">
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Responsive Banner Image */}
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
                alt={config.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </picture>
          ) : config.backgroundImageUrl ? (
            <img
              src={config.backgroundImageUrl}
              alt={config.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : null}

          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black transition-opacity"
            style={{ opacity: config.overlayOpacity || 0.3 }}
          />

          {/* Content - using flex column to ensure button stays visible */}
          <div className="relative z-10 text-center px-4 py-4 max-w-4xl mx-auto flex flex-col items-center justify-center h-full">
            <h1
              className="text-xl sm:text-2xl md:text-3xl lg:text-5xl font-bold mb-1 sm:mb-2 md:mb-4 animate-fade-in line-clamp-2"
              style={{ color: config.textColor || '#FFFFFF' }}
            >
              {config.title}
            </h1>

            {config.subtitle && (
              <p
                className="text-sm sm:text-base md:text-lg lg:text-2xl mb-3 sm:mb-4 md:mb-6 animate-fade-in line-clamp-2"
                style={{
                  color: config.textColor || '#FFFFFF',
                  animationDelay: '0.1s',
                }}
              >
                {config.subtitle}
              </p>
            )}

            {config.ctaText && (
              <Button
                onClick={handleCtaClick}
                size="lg"
                className="bg-pink-500 hover:bg-pink-600 text-white font-semibold px-4 sm:px-6 md:px-8 py-2 sm:py-4 md:py-6 text-sm sm:text-base md:text-lg shadow-lg hover:shadow-xl transition-all animate-fade-in flex-shrink-0"
                style={{ animationDelay: '0.2s' }}
                data-testid="fulvic-hero-cta-button"
              >
                {config.ctaText}
                <ArrowRight className="ml-2 h-4 sm:h-5 w-4 sm:w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
