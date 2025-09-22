import { Link } from 'react-router-dom';
import { MediaItem } from '@/types/media';
import { formatDistanceToNow } from 'date-fns';
import { formatFileSize } from '@/lib/utils';
import { 
  FileTextIcon, 
  FileVideoIcon, 
  FileAudioIcon,
  MoreVertical,
  Star,
  Download,
  Trash2,
  Pencil,
  StarOff
} from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Card, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface MediaGridProps {
  items: MediaItem[];
}

export default function MediaGrid({ items }: MediaGridProps) {
  const { toast } = useToast();
  
  const getThumbnail = (item: MediaItem) => {
    if (item.thumbnailUrl) {
      return item.thumbnailUrl;
    }

    return item.type === 'image' ? item.url : undefined;
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileTextIcon className="h-10 w-10 text-blue-500" />;
      case 'video':
        return <FileVideoIcon className="h-10 w-10 text-purple-500" />;
      case 'audio':
        return <FileAudioIcon className="h-10 w-10 text-green-500" />;
      default:
        return <FileTextIcon className="h-10 w-10 text-gray-500" />;
    }
  };
  
  const handleFavoriteToggle = (id: string, currentState: boolean) => {
    toast({
      title: currentState ? "Removed from favorites" : "Added to favorites",
      description: "Your media preferences have been updated.",
    });
  };
  
  const handleDelete = (id: string, title: string) => {
    toast({
      title: "File deleted",
      description: `"${title}" has been removed.`,
    });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 stagger-animation">
      {items.map((item) => (
        <Card key={item.id} className="group overflow-hidden media-card hover-lift interactive-card animate-scale-in">
          <div className="relative">
            <Link to={`/view/${item.id}`}>
              <AspectRatio ratio={3/2} className="bg-gradient-to-br from-muted to-muted/50">
                {getThumbnail(item) ? (
                  <img
                    src={getThumbnail(item)}
                    alt={item.title}
                    className="object-cover w-full h-full rounded-t-md transition-all duration-500 group-hover:scale-110 group-hover:brightness-110"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-primary/10 to-accent/10">
                    {getFileIcon(item.type)}
                  </div>
                )}
              </AspectRatio>
            </Link>
            
            <div className="absolute top-2 right-2 flex gap-1">
              {item.favorite && (
                <Badge variant="secondary" className="bg-primary/20 backdrop-blur-sm border border-primary/30 badge-glow animate-pulse-glow">
                  <Star className="h-3 w-3 fill-primary text-primary mr-1" />
                  <span className="sr-only">Favorite</span>
                </Badge>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="icon" className="h-7 w-7 glass smooth-transition hover:scale-110">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => handleFavoriteToggle(item.id, item.favorite)}
                  >
                    {item.favorite ? (
                      <>
                        <StarOff className="mr-2 h-4 w-4" />
                        <span>Remove from favorites</span>
                      </>
                    ) : (
                      <>
                        <Star className="mr-2 h-4 w-4" />
                        <span>Add to favorites</span>
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={`/view/${item.id}`}>
                      <FileTextIcon className="mr-2 h-4 w-4" />
                      <span>View details</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="mr-2 h-4 w-4" />
                    <span>Download</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Pencil className="mr-2 h-4 w-4" />
                    <span>Edit metadata</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive cursor-pointer"
                    onClick={() => handleDelete(item.id, item.title)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <CardContent className="p-4 bg-gradient-to-b from-card to-muted/20">
            <Link to={`/view/${item.id}`} className="hover:underline">
              <h3 className="font-semibold line-clamp-1 gradient-text">{item.title}</h3>
            </Link>
            <p className="text-xs text-muted-foreground mt-1">
              {formatFileSize(item.size)} • {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </p>
          </CardContent>
          
          <CardFooter className="p-4 pt-0 bg-gradient-to-t from-muted/30 to-transparent">
            <div className="flex flex-wrap gap-1">
              {item.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs smooth-transition hover:scale-105 hover:bg-primary/10">
                  {tag}
                </Badge>
              ))}
              {item.tags.length > 3 && (
                <Badge variant="outline" className="text-xs smooth-transition hover:scale-105">
                  +{item.tags.length - 3}
                </Badge>
              )}
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}