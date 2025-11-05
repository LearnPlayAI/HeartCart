import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { ArrowRight } from 'lucide-react';

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

export function FulvicWellnessHero() {
  const [, setLocation] = useLocation();
  
  const { data: settingData } = useQuery({
    queryKey: ['/api/settings/fulvicHeroConfig'],
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

  const backgroundStyle = config.backgroundImageUrl
    ? {
        backgroundImage: `url(${config.backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      };

  return (
    <div
      className="relative overflow-hidden rounded-lg shadow-md mb-4 md:mb-6"
      data-testid="fulvic-wellness-hero"
    >
      <div
        className="relative h-48 md:h-64 lg:h-80 flex items-center justify-center"
        style={backgroundStyle}
      >
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-black transition-opacity"
          style={{ opacity: config.overlayOpacity || 0.3 }}
        ></div>

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1
            className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4 animate-fade-in"
            style={{ color: config.textColor || '#FFFFFF' }}
          >
            {config.title}
          </h1>

          {config.subtitle && (
            <p
              className="text-base md:text-xl lg:text-2xl mb-4 md:mb-6 animate-fade-in"
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
              className="bg-pink-500 hover:bg-pink-600 text-white font-semibold px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all animate-fade-in"
              style={{ animationDelay: '0.2s' }}
              data-testid="fulvic-hero-cta-button"
            >
              {config.ctaText}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
