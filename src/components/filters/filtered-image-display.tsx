import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Eye,
  EyeOff,
  Share,
  Save,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

// CSS filter generation utility
const generateCSSFilter = (appliedFilter: any): string => {
  if (!appliedFilter) return '';

  // Artistic filters
  if (appliedFilter.styleType) {
    switch (appliedFilter.styleType) {
      case 'watercolor':
        return 'blur(1px) saturate(1.3) brightness(1.1) contrast(0.9) opacity(0.95)';
      case 'oil-painting':
        return 'saturate(1.4) contrast(1.3) brightness(0.95) hue-rotate(5deg)';
      case 'cyberpunk':
        return 'saturate(1.8) contrast(1.6) brightness(0.9) hue-rotate(270deg) sepia(0.3)';
      case 'anime':
        return 'saturate(1.5) contrast(1.4) brightness(1.05) hue-rotate(10deg)';
      case 'vintage':
        return 'sepia(0.6) contrast(0.8) brightness(0.9) saturate(0.8) hue-rotate(15deg)';
      case 'noir':
        return 'grayscale(1) contrast(1.6) brightness(0.85)';
      case 'sketch':
        return 'grayscale(0.9) contrast(1.8) brightness(1.3) invert(0.2) sepia(0.1) blur(0.3px)';
      default:
        return 'saturate(1.2) contrast(1.1) brightness(1.05)';
    }
  }

  // Mood filters
  if (appliedFilter.moodType) {
    switch (appliedFilter.moodType) {
      case 'happy':
        return 'saturate(1.3) brightness(1.15) contrast(1.1) hue-rotate(10deg)';
      case 'dramatic':
        return 'contrast(1.5) brightness(0.9) saturate(0.8)';
      case 'cozy':
        return 'brightness(1.05) contrast(0.95) saturate(1.1) hue-rotate(15deg) sepia(0.1)';
      case 'energetic':
        return 'saturate(1.4) contrast(1.3) brightness(1.1)';
      case 'calm':
        return 'brightness(1.05) contrast(0.9) saturate(0.9) hue-rotate(-5deg)';
      case 'mysterious':
        return 'brightness(0.8) contrast(1.4) saturate(0.7) hue-rotate(200deg)';
      case 'romantic':
        return 'brightness(1.1) contrast(0.9) saturate(1.15) hue-rotate(5deg) sepia(0.05)';
      default:
        return 'brightness(1.05) saturate(1.1)';
    }
  }

  // Traditional filter categories
  if (appliedFilter.category === 'artistic') {
    return 'saturate(1.3) contrast(1.2) brightness(1.05) hue-rotate(10deg)';
  } else if (appliedFilter.category === 'mood') {
    return 'brightness(1.1) saturate(1.2) contrast(1.1)';
  }

  return 'saturate(1.1) brightness(1.05)';
};

interface FilteredImageDisplayProps {
  originalImage: string;
  filteredImage?: string;
  isProcessing?: boolean;
  processingMessage?: string;
  onSave?: () => void;
  onShare?: () => void;
  onReset?: () => void;
  appliedFilter?: {
    name: string;
    category: string;
    confidence?: number;
  };
}

export default function FilteredImageDisplay({
  originalImage,
  filteredImage,
  isProcessing = false,
  processingMessage = 'Applying filter...',
  onSave,
  onShare,
  onReset,
  appliedFilter
}: FilteredImageDisplayProps) {
  const [showComparison, setShowComparison] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const downloadImage = async () => {
    if (!filteredImage) return;

    setIsDownloading(true);
    try {
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = `data:image/jpeg;base64,${filteredImage}`;
      link.download = `filtered-image-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download image:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const shareImage = async () => {
    if (!filteredImage) return;

    try {
      // Convert base64 to blob
      const byteCharacters = atob(filteredImage);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      const file = new File([blob], 'filtered-image.jpg', { type: 'image/jpeg' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Filtered Image',
          text: appliedFilter ? `Image with ${appliedFilter.name} filter applied` : 'Filtered image',
          files: [file]
        });
      } else {
        // Fallback: copy to clipboard or show share dialog
        onShare?.();
      }
    } catch (error) {
      console.error('Failed to share image:', error);
      onShare?.();
    }
  };

  const renderImage = (src: string, alt: string, isFiltered: boolean = false) => {
    // Check if we're in CSS filter demo mode
    const isDemoMode = isFiltered && src === 'CSS_FILTER_DEMO';
    const cssFilter = isDemoMode ? generateCSSFilter(appliedFilter) : '';

    return (
      <div className="relative group">
        <img
          src={isDemoMode ? originalImage : (isFiltered ? `data:image/jpeg;base64,${src}` : src)}
          alt={alt}
          className="w-full h-auto object-contain rounded-lg transition-all duration-500"
          style={isDemoMode ? { filter: cssFilter } : undefined}
        />
        {isFiltered && appliedFilter && (
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="bg-black/50 text-white">
              {appliedFilter.name}
              {appliedFilter.confidence && (
                <span className="ml-1 text-xs">
                  ({Math.round(appliedFilter.confidence * 100)}%)
                </span>
              )}
            </Badge>
          </div>
        )}
        {isDemoMode && (
          <div className="absolute top-2 right-2">
            <Badge variant="outline" className="bg-blue-500 text-white border-blue-600">
              Demo Filter
            </Badge>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Main Image Display */}
      <Card className="relative overflow-hidden">
        {isProcessing ? (
          <div className="aspect-video bg-muted flex items-center justify-center">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">{processingMessage}</p>
              <div className="w-32 h-2 bg-muted-foreground/20 rounded-full mx-auto overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4">
            {showComparison && filteredImage ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Original</h4>
                  {renderImage(originalImage, 'Original image')}
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Filtered</h4>
                  {renderImage(filteredImage, 'Filtered image', true)}
                </div>
              </div>
            ) : (
              <Dialog>
                <DialogTrigger asChild>
                  <div className="cursor-zoom-in">
                    {filteredImage
                      ? renderImage(filteredImage, 'Filtered image', true)
                      : renderImage(originalImage, 'Original image')
                    }
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-4xl w-[95vw] h-[95vh] p-0">
                  <div className="p-4 h-full overflow-auto">
                    {filteredImage
                      ? renderImage(filteredImage, 'Filtered image - Full size', true)
                      : renderImage(originalImage, 'Original image - Full size')
                    }
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </Card>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {filteredImage && !isProcessing && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowComparison(!showComparison)}
              >
                {showComparison ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide Comparison
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Compare
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onReset}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {filteredImage && !isProcessing && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={shareImage}
              >
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadImage}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download
              </Button>
              {onSave && (
                <Button
                  size="sm"
                  onClick={onSave}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save to Library
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Filter Info */}
      {appliedFilter && !isProcessing && (
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">{appliedFilter.name}</h4>
              <p className="text-xs text-muted-foreground capitalize">
                {appliedFilter.category} filter
              </p>
            </div>
            {appliedFilter.confidence && (
              <Badge variant={appliedFilter.confidence > 0.8 ? 'default' : 'secondary'}>
                {Math.round(appliedFilter.confidence * 100)}% confidence
              </Badge>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}