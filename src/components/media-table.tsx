import { Link } from 'react-router-dom';
import { MediaItem } from '@/types/media';
import { formatDistanceToNow, format } from 'date-fns';
import { 
  FileTextIcon, 
  FileVideoIcon, 
  FileAudioIcon,
  FileImageIcon,
  MoreHorizontal,
  Star,
  Download,
  Trash2,
  Pencil,
  StarOff
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatFileSize } from '@/lib/utils';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

interface MediaTableProps {
  items: MediaItem[];
}

export default function MediaTable({ items }: MediaTableProps) {
  const { toast } = useToast();
  
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileTextIcon className="h-4 w-4 text-blue-500" />;
      case 'video':
        return <FileVideoIcon className="h-4 w-4 text-purple-500" />;
      case 'audio':
        return <FileAudioIcon className="h-4 w-4 text-green-500" />;
      case 'image':
        return <FileImageIcon className="h-4 w-4 text-orange-500" />;
      default:
        return <FileTextIcon className="h-4 w-4 text-gray-500" />;
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
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Date Added</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getFileIcon(item.type)}
                  <div>
                    <Link to={`/view/${item.id}`} className="font-medium hover:underline">
                      {item.title}
                    </Link>
                    {item.favorite && (
                      <Star className="h-3 w-3 fill-primary text-primary inline-block ml-1" />
                    )}
                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {item.type}
                </Badge>
              </TableCell>
              <TableCell>
                {formatFileSize(item.size)}
              </TableCell>
              <TableCell>
                <div className="font-mono text-xs">
                  {format(new Date(item.createdAt), 'PPP')}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {item.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {item.tags.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{item.tags.length - 2}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}