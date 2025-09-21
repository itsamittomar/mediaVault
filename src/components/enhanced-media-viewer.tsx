import { useState, useRef } from 'react';
import { MediaItem } from '@/types/media';
import { FileText, Volume2, VolumeX, Sparkles } from 'lucide-react';
import ReactPlayer from 'react-player';
import { Button } from '@/components/ui/button';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import FilterPanel from '@/components/filters/filter-panel';
import FilteredImageDisplay from '@/components/filters/filtered-image-display';

interface EnhancedMediaViewerProps {
  media: MediaItem;
}

interface FilterConfig {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  hue?: number;
  sepia?: number;
  grayscale?: number;
  blur?: number;
  opacity?: number;
  invert?: number;
}

export default function EnhancedMediaViewer({ media }: EnhancedMediaViewerProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filteredImage, setFilteredImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('Applying filter...');
  const [appliedFilter, setAppliedFilter] = useState<{
    name: string;
    category: string;
    confidence?: number;
  } | null>(null);
  const playerRef = useRef<ReactPlayer | null>(null);

  const handleFilterApply = async (filterId: string, config?: FilterConfig) => {
    if (media.type !== 'image') {
      console.warn('Filters can only be applied to images');
      return;
    }

    setIsProcessing(true);
    setProcessingMessage('Applying traditional filter...');

    try {
      const response = await fetch(`/api/v1/filters/media/${media.id}/apply/${filterId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filterId,
          customConfig: config
        })
      });

      if (!response.ok) {
        throw new Error('Failed to apply filter');
      }

      const result = await response.json();
      setFilteredImage(result.data.processedImage);

      // Get filter details for display
      const filterResponse = await fetch(`/api/v1/filters/presets`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const filtersData = await filterResponse.json();
      const filterPreset = filtersData.presets?.find((p: any) => p.id === filterId);

      if (filterPreset) {
        setAppliedFilter({
          name: filterPreset.name,
          category: filterPreset.category
        });
      }
    } catch (error) {
      console.error('Failed to apply filter:', error);
      // You might want to show a toast notification here
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAIStyleTransfer = async (styleType: string, intensity: number) => {
    if (media.type !== 'image') {
      console.warn('AI filters can only be applied to images');
      return;
    }

    setIsProcessing(true);
    setProcessingMessage('Applying AI style transfer... This may take a moment.');

    try {
      const response = await fetch(`/api/v1/ai-filters/media/${media.id}/style-transfer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          styleType,
          intensity,
          preserveFace: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to apply AI style transfer');
      }

      const result = await response.json();
      setFilteredImage(result.data.processedImage);
      setAppliedFilter({
        name: `AI ${styleType.charAt(0).toUpperCase() + styleType.slice(1).replace('-', ' ')}`,
        category: 'artistic',
        confidence: result.data.confidence
      });
    } catch (error) {
      console.error('Failed to apply AI style transfer:', error);
      // You might want to show a toast notification here
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMoodEnhancement = async (moodType: string, intensity: number, colorTone: string) => {
    if (media.type !== 'image') {
      console.warn('Mood enhancement can only be applied to images');
      return;
    }

    setIsProcessing(true);
    setProcessingMessage('Applying AI mood enhancement...');

    try {
      const response = await fetch(`/api/v1/ai-filters/media/${media.id}/mood-enhancement`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          moodType,
          intensity,
          colorTone
        })
      });

      if (!response.ok) {
        throw new Error('Failed to apply mood enhancement');
      }

      const result = await response.json();
      setFilteredImage(result.data.processedImage);
      setAppliedFilter({
        name: `AI ${moodType.charAt(0).toUpperCase() + moodType.slice(1)} Mood`,
        category: 'mood',
        confidence: result.data.confidence
      });
    } catch (error) {
      console.error('Failed to apply mood enhancement:', error);
      // You might want to show a toast notification here
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveFiltered = async () => {
    if (!filteredImage) return;

    try {
      // Here you would implement saving the filtered image to the user's library
      // This might involve uploading the base64 image back to your storage
      console.log('Saving filtered image to library...');
      // You might want to show a success toast here
    } catch (error) {
      console.error('Failed to save filtered image:', error);
    }
  };

  const handleReset = () => {
    setFilteredImage(null);
    setAppliedFilter(null);
  };

  const renderMediaContent = () => {
    switch (media.type) {
      case 'image':
        return (
          <div className="flex flex-col lg:flex-row h-full">
            <ResizablePanelGroup direction="horizontal" className="flex-1">
              <ResizablePanel defaultSize={showFilters ? 75 : 100}>
                <div className="h-full p-4">
                  <div className="relative mb-4">
                    <Button
                      variant={showFilters ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                      className="absolute top-2 right-2 z-10"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {showFilters ? 'Hide Filters' : 'Smart Filters'}
                    </Button>
                  </div>

                  <FilteredImageDisplay
                    originalImage={media.url}
                    filteredImage={filteredImage}
                    isProcessing={isProcessing}
                    processingMessage={processingMessage}
                    appliedFilter={appliedFilter}
                    onSave={handleSaveFiltered}
                    onReset={handleReset}
                  />
                </div>
              </ResizablePanel>

              {showFilters && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
                    <div className="h-full border-l">
                      <FilterPanel
                        mediaId={media.id}
                        onFilterApply={handleFilterApply}
                        onAIStyleTransfer={handleAIStyleTransfer}
                        onMoodEnhancement={handleMoodEnhancement}
                        isProcessing={isProcessing}
                      />
                    </div>
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </div>
        );

      case 'video':
        return (
          <div className="relative group">
            <ReactPlayer
              ref={playerRef}
              url={media.url || "https://www.youtube.com/watch?v=dQw4w9WgXcQ"} // For demo purposes
              width="100%"
              height="100%"
              controls
              muted={isMuted}
              playing
              config={{
                file: {
                  attributes: {
                    controlsList: 'nodownload',
                  },
                },
              }}
            />
            <Button
              variant="secondary"
              size="icon"
              className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>
        );

      case 'audio':
        return (
          <div className="p-8 flex flex-col items-center">
            {media.thumbnailUrl ? (
              <div className="mb-6 w-full max-w-[240px]">
                <AspectRatio ratio={1}>
                  <img
                    src={media.thumbnailUrl}
                    alt={media.title}
                    className="w-full h-full object-cover rounded-md"
                  />
                </AspectRatio>
              </div>
            ) : (
              <div className="mb-6 p-8 bg-muted rounded-full">
                <Volume2 className="h-12 w-12" />
              </div>
            )}
            <div className="w-full">
              <ReactPlayer
                url={media.url || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"} // For demo
                width="100%"
                height="50px"
                controls
                config={{
                  file: {
                    forceAudio: true,
                  },
                }}
              />
            </div>
          </div>
        );

      case 'document':
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="p-8 bg-muted rounded-full mb-4">
              <FileText className="h-12 w-12" />
            </div>
            <h2 className="text-xl font-medium mb-2">{media.title}</h2>
            <p className="text-muted-foreground mb-6">PDF Document</p>
            <Button>
              View Document
            </Button>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center p-8">
            <p>Unsupported media type</p>
          </div>
        );
    }
  };

  return (
    <div className="bg-card h-full">
      {renderMediaContent()}
    </div>
  );
}