import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MediaItem } from '@/types/media';
import { apiService } from '@/services/apiService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Star, StarOff, Pencil, Trash2 } from 'lucide-react';
import { formatFileSize } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import MediaViewer from '@/components/media-viewer';

export default function ViewerPage() {
  const { id } = useParams<{ id: string }>();
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchMedia = async () => {
      if (!id) return;

      setIsLoading(true);

      try {
        const response = await apiService.getFile(id);

        // Adapt MediaFile to work with existing components
        const adaptedFile = {
          ...response,
          type: response.mimeType.startsWith('image/') ? 'image' :
                response.mimeType.startsWith('video/') ? 'video' :
                response.mimeType.startsWith('audio/') ? 'audio' : 'document',
          favorite: false, // Add default favorite state
          thumbnailUrl: response.mimeType.startsWith('image/') ? response.url : undefined,
          userId: 'current-user', // Add required userId property
          tags: response.tags || [], // Ensure tags is always an array
        };

        setMedia(adaptedFile as MediaItem);
      } catch (error) {
        console.error('Failed to fetch media file:', error);
        toast({
          title: 'Error',
          description: 'Failed to load media file.',
          variant: 'destructive',
        });
        setMedia(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMedia();
  }, [id, toast]);

  const handleDownload = async () => {
    if (!media) return;

    try {
      const blob = await apiService.downloadFile(media.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = media.originalName || media.title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download started',
        description: `"${media.title}" is being downloaded.`,
      });
    } catch (error) {
      toast({
        title: 'Download failed',
        description: 'Failed to download the file. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!media) return;

    try {
      await apiService.deleteFile(media.id);
      toast({
        title: 'File deleted',
        description: `"${media.title}" has been removed.`,
      });
      navigate('/all-files');
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: 'Failed to delete the file. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleFavoriteToggle = () => {
    if (!media) return;
    
    toast({
      title: media.favorite ? 'Removed from favorites' : 'Added to favorites',
      description: 'Your media preferences have been updated.',
    });
    
    setMedia({
      ...media,
      favorite: !media.favorite,
    });
  };

  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-40 mt-2" />
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Skeleton className="h-[300px] md:h-[400px] w-full rounded-lg" />
          </div>
          <div>
            <Skeleton className="h-8 w-32 mb-4" />
            <Skeleton className="h-5 w-full mb-2" />
            <Skeleton className="h-5 w-2/3 mb-4" />
            
            <Skeleton className="h-6 w-36 mb-2" />
            <Skeleton className="h-4 w-24 mb-4" />
            
            <Skeleton className="h-6 w-36 mb-2" />
            <div className="flex gap-2 mb-4">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
            </div>
            
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!media) {
    return (
      <div className="container max-w-5xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <h2 className="text-2xl font-bold mb-2">Media not found</h2>
            <p className="text-muted-foreground mb-6">The media you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold">{media.title}</h1>
        <p className="text-muted-foreground">{media.type.charAt(0).toUpperCase() + media.type.slice(1)} • {formatFileSize(media.size)}</p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardContent className="p-0 overflow-hidden rounded-lg">
              <MediaViewer media={media} />
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardContent className="p-6 space-y-4">
              {media.description && (
                <div>
                  <h3 className="text-lg font-medium mb-2">Description</h3>
                  <p className="text-muted-foreground">{media.description}</p>
                </div>
              )}
              
              <div>
                <h3 className="text-lg font-medium mb-2">Details</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div className="text-muted-foreground">Date Added</div>
                  <div>{format(new Date(media.createdAt), 'PPP')}</div>
                  
                  <div className="text-muted-foreground">Last Modified</div>
                  <div>{format(new Date(media.updatedAt), 'PPP')}</div>
                  
                  <div className="text-muted-foreground">File Size</div>
                  <div>{formatFileSize(media.size)}</div>
                  
                  {media.category && (
                    <>
                      <div className="text-muted-foreground">Category</div>
                      <div>{media.category}</div>
                    </>
                  )}
                </div>
              </div>
              
              {media.tags.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {media.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="pt-4 flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleFavoriteToggle}
                >
                  {media.favorite ? (
                    <>
                      <StarOff className="h-4 w-4 mr-2" />
                      Unfavorite
                    </>
                  ) : (
                    <>
                      <Star className="h-4 w-4 mr-2" />
                      Favorite
                    </>
                  )}
                </Button>
                <Button variant="outline" className="flex-1" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline">
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Edit</span>
                </Button>
                <Button variant="outline" className="text-destructive hover:text-destructive" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}