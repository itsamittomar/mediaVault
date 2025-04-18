import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { MediaItem } from '@/types/media';
import { getMediaItems } from '@/data/media';
import { useAuth } from '@/contexts/auth-context';
import MediaGrid from '@/components/media-grid';
import MediaTable from '@/components/media-table';
import { Filter, Grid, List } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DashboardPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const { user } = useAuth();
  
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(true);
  
  const typeFilter = searchParams.get('type') || 'all';
  const searchQuery = searchParams.get('q') || '';
  const favoriteFilter = searchParams.get('favorite') === 'true';
  const sortBy = searchParams.get('sort') || 'newest';

  useEffect(() => {
    setIsLoading(true);
    
    // Simulate API fetch delay
    setTimeout(() => {
      const items = getMediaItems({
        type: typeFilter !== 'all' ? typeFilter : undefined,
        search: searchQuery || undefined,
        favorite: searchParams.has('favorite') ? favoriteFilter : undefined,
        userId: user?.id,
      });
      
      // Sort items
      const sortedItems = [...items].sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else if (sortBy === 'oldest') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else if (sortBy === 'name') {
          return a.title.localeCompare(b.title);
        } else if (sortBy === 'size') {
          return b.size - a.size;
        }
        return 0;
      });
      
      setMediaItems(sortedItems);
      setIsLoading(false);
    }, 500);
  }, [typeFilter, searchQuery, favoriteFilter, sortBy, user?.id]);

  // Helper to get title based on filters
  const getPageTitle = () => {
    if (favoriteFilter) return "Favorite Media";
    if (searchQuery) return `Search Results: "${searchQuery}"`;
    
    switch (typeFilter) {
      case 'image': return 'Images';
      case 'video': return 'Videos';
      case 'audio': return 'Audio Files';
      case 'document': return 'Documents';
      default: return 'All Media';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{getPageTitle()}</h1>
        
        <div className="flex items-center gap-2">
          <Select
            value={sortBy}
            onValueChange={(value) => {
              searchParams.set('sort', value);
              window.history.pushState(
                {},
                '',
                `${location.pathname}?${searchParams.toString()}`
              );
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="size">Size</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="border rounded-md p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
              <span className="sr-only">Grid view</span>
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
              <span className="sr-only">List view</span>
            </Button>
          </div>
        </div>
      </div>
      
      {searchQuery && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1 text-sm">
            Search: {searchQuery}
            <button
              className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full"
              onClick={() => {
                searchParams.delete('q');
                window.location.search = searchParams.toString();
              }}
            >
              ×
            </button>
          </Badge>
        </div>
      )}
      
      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-10 h-10 border-4 border-primary rounded-full border-t-transparent"></div>
            </div>
          ) : mediaItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-6 mb-4">
                <Filter className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">No media found</h3>
              <p className="text-muted-foreground max-w-md">
                {searchQuery
                  ? `No results found for "${searchQuery}". Try a different search term.`
                  : `No ${typeFilter !== 'all' ? typeFilter : ''} files found. Upload some media to get started.`}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <MediaGrid items={mediaItems} />
          ) : (
            <MediaTable items={mediaItems} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}