import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MediaItem } from '@/types/media';
import { apiService } from '@/services/apiService';
import MediaGrid from '@/components/media-grid';
import MediaTable from '@/components/media-table';
import { Filter, Grid, List, RefreshCw, Search, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function AllFilesPage() {
  const { toast } = useToast();

  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAllFiles = async () => {
    setIsLoading(true);

    try {
      const response = await apiService.listFiles({
        type: typeFilter !== 'all' ? typeFilter : undefined,
        search: searchQuery || undefined,
        page: 1,
        limit: 100, // Get more files for the all files view
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
        description: 'Failed to load media files. Please try again.',
        variant: 'destructive',
      });
      setMediaItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
  };

  // Handle clearing search
  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  useEffect(() => {
    fetchAllFiles();
  }, [typeFilter, sortBy, searchQuery]);

  const handleRefresh = () => {
    fetchAllFiles();
  };

  // Filter and sort files
  const filteredAndSortedFiles = [...mediaItems].sort((a, b) => {
    switch (sortBy) {
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'name':
        return a.title.localeCompare(b.title);
      case 'size':
        return b.size - a.size;
      case 'newest':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const getTypeStats = () => {
    const stats = mediaItems.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: mediaItems.length,
      images: stats.image || 0,
      videos: stats.video || 0,
      audio: stats.audio || 0,
      documents: stats.document || 0,
    };
  };

  const stats = getTypeStats();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Files</h1>
          <p className="text-muted-foreground">
            Showing {filteredAndSortedFiles.length} of {stats.total} files
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="sr-only">Refresh</span>
          </Button>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="File type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="image">Images ({stats.images})</SelectItem>
              <SelectItem value="video">Videos ({stats.videos})</SelectItem>
              <SelectItem value="audio">Audio ({stats.audio})</SelectItem>
              <SelectItem value="document">Documents ({stats.documents})</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
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

      {/* Search Form */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Search files by name, description, or tags..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
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
        <Button type="submit" variant="default">
          Search
        </Button>
      </form>

      {/* Active Search Query Display */}
      {searchQuery && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1 text-sm">
            Search: {searchQuery}
            <button
              type="button"
              onClick={handleClearSearch}
              className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full"
            >
              ×
            </button>
          </Badge>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Files</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.images}</div>
            <div className="text-sm text-muted-foreground">Images</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.videos}</div>
            <div className="text-sm text-muted-foreground">Videos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.audio}</div>
            <div className="text-sm text-muted-foreground">Audio</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.documents}</div>
            <div className="text-sm text-muted-foreground">Documents</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-10 h-10 border-4 border-primary rounded-full border-t-transparent"></div>
            </div>
          ) : filteredAndSortedFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-6 mb-4">
                <Filter className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">No files found</h3>
              <p className="text-muted-foreground max-w-md">
                {searchQuery
                  ? `No results found for "${searchQuery}". Try a different search term or clear the search.`
                  : typeFilter !== 'all'
                  ? `No ${typeFilter} files found. Try a different file type or upload some media.`
                  : 'No files have been uploaded yet. Upload some media to get started.'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <MediaGrid items={filteredAndSortedFiles} />
          ) : (
            <MediaTable items={filteredAndSortedFiles} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}