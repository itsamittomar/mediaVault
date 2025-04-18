import { useRef, useState } from 'react';
import { MediaItem } from '@/types/media';
import { FileText, Volume2, VolumeX } from 'lucide-react';
import ReactPlayer from 'react-player';
import { Button } from '@/components/ui/button';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

interface MediaViewerProps {
  media: MediaItem;
}

export default function MediaViewer({ media }: MediaViewerProps) {
  const [isMuted, setIsMuted] = useState(true);
  const playerRef = useRef<ReactPlayer | null>(null);
  
  const renderMediaContent = () => {
    switch (media.type) {
      case 'image':
        return (
          <Dialog>
            <DialogTrigger asChild>
              <div className="cursor-zoom-in">
                <img
                  src={media.url}
                  alt={media.title}
                  className="w-full h-auto object-contain"
                />
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-screen-lg w-[95vw] p-0 bg-transparent border-0">
              <img
                src={media.url}
                alt={media.title}
                className="w-full h-auto max-h-[90vh] object-contain"
              />
            </DialogContent>
          </Dialog>
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
    <div className="bg-card">
      {renderMediaContent()}
    </div>
  );
}