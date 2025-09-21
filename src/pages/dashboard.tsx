import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MediaItem } from '@/types/media';
import { apiService } from '@/services/apiService';
import MediaGrid from '@/components/media-grid';
import MediaTable from '@/components/media-table';
import { Filter, Grid, List, Search, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const { toast } = useToast();

  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');

  const typeFilter = searchParams.get('type') || 'all';
  const searchQuery = searchParams.get('q') || '';
  const favoriteFilter = searchParams.get('favorite') === 'true';
  const sortBy = searchParams.get('sort') || 'newest';

  // Sync search input with URL parameter
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newSearchParams = new URLSearchParams(location.search);
    if (searchInput.trim()) {
      newSearchParams.set('q', searchInput.trim());
    } else {
      newSearchParams.delete('q');
    }
    window.history.pushState({}, '', `${location.pathname}?${newSearchParams.toString()}`);
  };

  // Handle clearing search
  const handleClearSearch = () => {
    setSearchInput('');
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.delete('q');
    window.history.pushState({}, '', `${location.pathname}?${newSearchParams.toString()}`);
  };

  useEffect(() => {
    const fetchMediaFiles = async () => {
      setIsLoading(true);

      try {
        const response = await apiService.listFiles({
          type: typeFilter !== 'all' ? typeFilter : undefined,
          search: searchQuery || undefined,
          page: 1,
          limit: 20,
        });

        // Check if response and files array exists
        if (!response || !response.files || !Array.isArray(response.files)) {
          setMediaItems([]);
          return;
        }

        // Adapt MediaFile to work with existing components
        const adaptedFiles = response.files.map((file) => ({
          ...file,
          type: file.mimeType.startsWith('image/') ? 'image' :
                file.mimeType.startsWith('video/') ? 'video' :
                file.mimeType.startsWith('audio/') ? 'audio' : 'document',
          favorite: false, // Add default favorite state
          thumbnailUrl: file.mimeType.startsWith('image/') ? file.url : undefined,
          userId: 'current-user', // Add required userId property
          tags: file.tags || [], // Ensure tags is always an array
        }));

        setMediaItems(adaptedFiles as MediaItem[]);
      } catch (error) {
        console.error('Failed to fetch media files:', error);
        toast({
          title: 'Error',
          description: `Failed to load media files: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: 'destructive',
        });
        setMediaItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMediaFiles();
  }, [typeFilter, searchQuery, favoriteFilter, sortBy, toast]);

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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{getPageTitle()}</h1>

        <div className="flex items-center gap-2">
          <Select
            value={sortBy}
            onValueChange={(value) => {
              const newSearchParams = new URLSearchParams(location.search);
              newSearchParams.set('sort', value);
              window.history.pushState(
                {},
                '',
                `${location.pathname}?${newSearchParams.toString()}`
              );
            }}
          >
            <SelectTrigger className="w-[140px] sm:w-[180px]">
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

      {/* Search Form */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Search files..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10 text-sm"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button type="submit" variant="default" className="w-full sm:w-auto">
          Search
        </Button>
      </form>
      
      {searchQuery && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1 text-sm">
            Search: {searchQuery}
            <button
              className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full"
              onClick={handleClearSearch}
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