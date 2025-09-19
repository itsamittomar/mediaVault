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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card key={item.id} className="group overflow-hidden transition-all hover:shadow-md">
          <div className="relative">
            <Link to={`/view/${item.id}`}>
              <AspectRatio ratio={3/2} className="bg-muted">
                {getThumbnail(item) ? (
                  <img
                    src={getThumbnail(item)}
                    alt={item.title}
                    className="object-cover w-full h-full rounded-t-md transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    {getFileIcon(item.type)}
                  </div>
                )}
              </AspectRatio>
            </Link>
            
            <div className="absolute top-2 right-2 flex gap-1">
              {item.favorite && (
                <Badge variant="secondary" className="bg-primary/10 backdrop-blur-sm">
                  <Star className="h-3 w-3 fill-primary text-primary mr-1" />
                  <span className="sr-only">Favorite</span>
                </Badge>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="icon" className="h-7 w-7 bg-background/80 backdrop-blur-sm">
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
          
          <CardContent className="p-4">
            <Link to={`/view/${item.id}`} className="hover:underline">
              <h3 className="font-medium line-clamp-1">{item.title}</h3>
            </Link>
            <p className="text-xs text-muted-foreground mt-1">
              {formatFileSize(item.size)} • {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </p>
          </CardContent>
          
          <CardFooter className="p-4 pt-0">
            <div className="flex flex-wrap gap-1">
              {item.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {item.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
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