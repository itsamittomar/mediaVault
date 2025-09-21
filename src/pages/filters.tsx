import { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, BarChart3, Image as ImageIcon, Palette, Upload, Plus } from 'lucide-react';
import FilterAnalyticsDashboard from '@/components/filters/filter-analytics-dashboard';
import EnhancedMediaViewer from '@/components/enhanced-media-viewer';
import { MediaItem } from '@/types/media';

const DEMO_IMAGES: MediaItem[] = [
  {
    id: 'demo-1',
    title: 'Mountain Landscape',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=200&fit=crop',
    size: 2048000,
    category: 'nature',
    tags: ['landscape', 'mountains', 'nature'],
    uploadedAt: new Date().toISOString(),
    userId: 'demo-user',
    isPublic: false,
    description: 'Beautiful mountain landscape perfect for testing artistic filters'
  },
  {
    id: 'demo-2',
    title: 'City Portrait',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop',
    size: 1536000,
    category: 'portrait',
    tags: ['portrait', 'person', 'urban'],
    uploadedAt: new Date().toISOString(),
    userId: 'demo-user',
    isPublic: false,
    description: 'Urban portrait ideal for mood enhancement filters'
  },
  {
    id: 'demo-3',
    title: 'Abstract Art',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=300&h=200&fit=crop',
    size: 1792000,
    category: 'art',
    tags: ['abstract', 'colorful', 'modern'],
    uploadedAt: new Date().toISOString(),
    userId: 'demo-user',
    isPublic: false,
    description: 'Colorful abstract composition for style transfer experiments'
  }
];

export default function FiltersPage() {
  const [activeView, setActiveView] = useState<'demo' | 'analytics'>('demo');
  const [selectedImage, setSelectedImage] = useState<MediaItem | null>(null);
  const [uploadedImages, setUploadedImages] = useState<MediaItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = (files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        alert('Please select only image files');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const newImage: MediaItem = {
          id: `uploaded-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: file.name.replace(/\.[^/.]+$/, ''),
          type: 'image',
          url: result,
          thumbnailUrl: result,
          size: file.size,
          category: 'uploaded',
          tags: ['uploaded', 'custom'],
          uploadedAt: new Date().toISOString(),
          userId: 'demo-user',
          isPublic: false,
          description: `Uploaded image: ${file.name}`
        };

        setUploadedImages(prev => [...prev, newImage]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    processFiles(files);

    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );

    if (files.length > 0) {
      processFiles(files);
    }
  };

  const allImages = [...uploadedImages, ...DEMO_IMAGES];

  return (
    <>
      <Helmet>
        <title>Smart Filters - MediaVault</title>
        <meta name="description" content="Experience AI-powered image filters and view your usage analytics" />
      </Helmet>

      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Smart Filters</h1>
          <p className="text-muted-foreground">
            Experience AI-powered image enhancement with artistic filters, mood adjustments, and style transfers
          </p>
        </div>

        <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'demo' | 'analytics')} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="demo" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Filter Demo
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="demo" className="space-y-6">
            {selectedImage ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedImage(null)}
                    >
                      ← Back to Gallery
                    </Button>
                    <div>
                      <h2 className="text-xl font-semibold">{selectedImage.title}</h2>
                      <p className="text-sm text-muted-foreground">{selectedImage.description}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    Demo Mode
                  </Badge>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <EnhancedMediaViewer media={selectedImage} />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Palette className="h-5 w-5" />
                        Smart Filters Gallery
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Upload Image
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <p className="text-muted-foreground mb-4">
                      Upload your own images or use our demo gallery to experience Smart Filters with live preview:
                    </p>

                    {/* Drag and Drop Upload Zone */}
                    <div
                      className={`mb-6 border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        isDragging
                          ? 'border-primary bg-primary/5'
                          : 'border-muted-foreground/25 hover:border-primary/50'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">
                        {isDragging ? 'Drop your images here' : 'Drag & Drop Images'}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Support JPG, PNG, GIF, WebP formats • Multiple files supported
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Choose Files
                      </Button>
                    </div>

                    {uploadedImages.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          Your Uploaded Images ({uploadedImages.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {uploadedImages.map((image) => (
                            <Card
                              key={image.id}
                              className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-primary/20"
                              onClick={() => setSelectedImage(image)}
                            >
                              <div className="aspect-video relative overflow-hidden rounded-t-lg">
                                <img
                                  src={image.thumbnailUrl}
                                  alt={image.title}
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                                />
                                <Badge className="absolute top-2 right-2 bg-primary">
                                  Custom
                                </Badge>
                              </div>
                              <CardContent className="p-4">
                                <h3 className="font-semibold mb-1">{image.title}</h3>
                                <p className="text-sm text-muted-foreground mb-2">
                                  Size: {(image.size / 1024).toFixed(1)} KB
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {image.tags?.map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mb-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Demo Images
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {DEMO_IMAGES.map((image) => (
                        <Card
                          key={image.id}
                          className="cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => setSelectedImage(image)}
                        >
                          <div className="aspect-video relative overflow-hidden rounded-t-lg">
                            <img
                              src={image.thumbnailUrl}
                              alt={image.title}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                            />
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold mb-1">{image.title}</h3>
                            <p className="text-sm text-muted-foreground mb-2">{image.description}</p>
                            <div className="flex flex-wrap gap-1">
                              {image.tags?.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Available Filter Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          Artistic Filters
                        </h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li>• <strong>Watercolor:</strong> Soft, flowing painting effect</li>
                          <li>• <strong>Oil Painting:</strong> Rich textures and brush strokes</li>
                          <li>• <strong>Cyberpunk:</strong> Futuristic neon aesthetic</li>
                          <li>• <strong>Anime Style:</strong> Clean, vibrant illustration</li>
                          <li>• <strong>Vintage:</strong> Classic aged photography</li>
                          <li>• <strong>Film Noir:</strong> Dramatic black and white</li>
                          <li>• <strong>Pencil Sketch:</strong> Hand-drawn line art</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Mood Enhancements
                        </h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li>• <strong>Happy Vibes:</strong> Bright, uplifting tones</li>
                          <li>• <strong>Dramatic Scene:</strong> High contrast intensity</li>
                          <li>• <strong>Cozy Comfort:</strong> Warm, intimate atmosphere</li>
                          <li>• <strong>High Energy:</strong> Dynamic and vibrant</li>
                          <li>• <strong>Peaceful Calm:</strong> Serene, tranquil feel</li>
                          <li>• <strong>Mysterious Shadow:</strong> Dark, enigmatic mood</li>
                          <li>• <strong>Romantic Glow:</strong> Soft, dreamy lighting</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Filter Usage Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Track your filter usage patterns and discover your personalized style preferences.
                </p>
              </CardContent>
            </Card>
            <FilterAnalyticsDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}