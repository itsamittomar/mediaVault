import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sparkles,
  Palette,
  Heart,
  Zap,
  Brain,
  Settings,
  Download,
  RotateCcw
} from 'lucide-react';

interface FilterPreset {
  id: string;
  name: string;
  category: 'artistic' | 'mood' | 'color' | 'technical';
  type: string;
  description: string;
  thumbnail?: string;
  config: FilterConfig;
  isCustom?: boolean;
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

interface FilterSuggestion {
  filterId: string;
  confidence: number;
  reason: string;
  filter: FilterPreset;
}

interface FilterPanelProps {
  mediaId: string;
  onFilterApply: (filterId: string, config?: FilterConfig) => void;
  onAIStyleTransfer: (styleType: string, intensity: number) => void;
  onMoodEnhancement: (moodType: string, intensity: number, colorTone: string) => void;
  isProcessing?: boolean;
}

export default function FilterPanel({
  mediaId,
  onFilterApply,
  onAIStyleTransfer,
  onMoodEnhancement,
  isProcessing = false
}: FilterPanelProps) {
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>([]);
  const [suggestions, setSuggestions] = useState<FilterSuggestion[]>([]);
  const [customConfig, setCustomConfig] = useState<FilterConfig>({
    brightness: 1,
    contrast: 1,
    saturation: 1,
    hue: 0,
    sepia: 0,
    grayscale: 0,
    blur: 0,
    opacity: 1,
    invert: 0
  });
  const [selectedFilter, setSelectedFilter] = useState<FilterPreset | null>(null);
  const [activeTab, setActiveTab] = useState('presets');

  useEffect(() => {
    fetchFilterPresets();
    fetchSuggestions();
  }, [mediaId]);

  const fetchFilterPresets = async () => {
    try {
      const response = await fetch('/api/v1/filters/presets', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const data = await response.json();
      setFilterPresets(data.presets || []);
    } catch (error) {
      console.error('Failed to fetch filter presets:', error);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const response = await fetch(`/api/v1/filters/media/${mediaId}/suggestions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Failed to fetch filter suggestions:', error);
    }
  };

  const handlePresetClick = (preset: FilterPreset) => {
    setSelectedFilter(preset);
    setCustomConfig({ ...preset.config });
  };

  const handleApplyFilter = () => {
    if (selectedFilter) {
      onFilterApply(selectedFilter.id, customConfig);
    }
  };

  const resetCustomConfig = () => {
    if (selectedFilter) {
      setCustomConfig({ ...selectedFilter.config });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'artistic': return <Palette className="h-4 w-4" />;
      case 'mood': return <Heart className="h-4 w-4" />;
      case 'technical': return <Settings className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'bg-green-500';
    if (confidence > 0.6) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const artisticFilters = filterPresets.filter(f => f.category === 'artistic');
  const moodFilters = filterPresets.filter(f => f.category === 'mood');

  return (
    <Card className="w-80 h-full glass animate-slide-in-right">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 animate-pulse" />
          Smart Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mx-2 glass">
            <TabsTrigger value="suggestions" className="text-xs">
              <Brain className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger value="presets" className="text-xs">
              <Palette className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger value="ai" className="text-xs">
              <Zap className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger value="custom" className="text-xs">
              <Settings className="h-3 w-3" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="suggestions" className="px-2 mt-2">
            <ScrollArea className="h-[400px] custom-scrollbar">
              <div className="space-y-2">
                <h4 className="text-sm font-medium mb-2">AI Suggestions</h4>
                {suggestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No suggestions available</p>
                ) : (
                  suggestions.map((suggestion) => (
                    <div
                      key={suggestion.filterId}
                      className="p-2 rounded-lg border cursor-pointer filter-preset smooth-transition"
                      onClick={() => handlePresetClick(suggestion.filter)}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-medium">{suggestion.filter.name}</span>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${getConfidenceColor(suggestion.confidence)}`} />
                          <span className="text-xs text-muted-foreground">
                            {Math.round(suggestion.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {suggestion.filter.description}
                      </p>
                      <Badge variant="outline" className="text-xs smooth-transition hover:scale-105">
                        {suggestion.reason.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="presets" className="px-2 mt-2">
            <ScrollArea className="h-[400px] custom-scrollbar">
              <div className="space-y-4">
                {/* Artistic Filters */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Palette className="h-4 w-4 animate-pulse" />
                    Artistic
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {artisticFilters.map((preset) => (
                      <div
                        key={preset.id}
                        className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                          selectedFilter?.id === preset.id ? 'border-primary bg-gradient-to-br from-primary/20 to-accent/10 neon-glow' : 'filter-preset'
                        } smooth-transition`}
                        onClick={() => handlePresetClick(preset)}
                      >
                        <div className="text-sm font-medium truncate gradient-text">{preset.name}</div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {preset.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Mood Filters */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Heart className="h-4 w-4 animate-pulse" />
                    Mood
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {moodFilters.map((preset) => (
                      <div
                        key={preset.id}
                        className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                          selectedFilter?.id === preset.id ? 'border-primary bg-gradient-to-br from-primary/20 to-accent/10 neon-glow' : 'filter-preset'
                        } smooth-transition`}
                        onClick={() => handlePresetClick(preset)}
                      >
                        <div className="text-sm font-medium truncate gradient-text">{preset.name}</div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {preset.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="ai" className="px-2 mt-2">
            <ScrollArea className="h-[400px] custom-scrollbar">
              <div className="space-y-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 animate-pulse" />
                  AI-Powered
                </h4>

                {/* Style Transfer */}
                <div className="space-y-2">
                  <h5 className="text-sm font-medium">Style Transfer</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {['watercolor', 'oil-painting', 'cyberpunk', 'anime', 'sketch'].map((style) => (
                      <Button
                        key={style}
                        variant="outline"
                        size="sm"
                        className="h-auto p-2 smooth-transition hover:scale-105 hover:bg-primary/10"
                        onClick={() => onAIStyleTransfer(style, 0.8)}
                        disabled={isProcessing}
                      >
                        <div className="text-center">
                          <div className="text-xs font-medium capitalize">
                            {style.replace('-', ' ')}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Mood Enhancement */}
                <div className="space-y-2">
                  <h5 className="text-sm font-medium">Mood Enhancement</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {['happy', 'dramatic', 'cozy', 'romantic'].map((mood) => (
                      <Button
                        key={mood}
                        variant="outline"
                        size="sm"
                        className="h-auto p-2 smooth-transition hover:scale-105 hover:bg-primary/10"
                        onClick={() => onMoodEnhancement(mood, 0.7, 'warm')}
                        disabled={isProcessing}
                      >
                        <div className="text-center">
                          <div className="text-xs font-medium capitalize">{mood}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                {isProcessing && (
                  <div className="text-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2 spinner-glow"></div>
                    <p className="text-sm text-muted-foreground">Processing with AI...</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="custom" className="px-2 mt-2">
            <ScrollArea className="h-[400px] custom-scrollbar">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Custom Adjustments</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetCustomConfig}
                    disabled={!selectedFilter}
                    className="smooth-transition hover:scale-110"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </div>

                {selectedFilter ? (
                  <div className="space-y-4">
                    <div className="text-xs text-muted-foreground mb-2">
                      Editing: {selectedFilter.name}
                    </div>

                    {/* Brightness */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Brightness</span>
                        <span>{customConfig.brightness?.toFixed(2)}</span>
                      </div>
                      <Slider
                        value={[customConfig.brightness || 1]}
                        onValueChange={([value]) =>
                          setCustomConfig(prev => ({ ...prev, brightness: value }))
                        }
                        min={0}
                        max={2}
                        step={0.1}
                        className="w-full"
                      />
                    </div>

                    {/* Contrast */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Contrast</span>
                        <span>{customConfig.contrast?.toFixed(2)}</span>
                      </div>
                      <Slider
                        value={[customConfig.contrast || 1]}
                        onValueChange={([value]) =>
                          setCustomConfig(prev => ({ ...prev, contrast: value }))
                        }
                        min={0}
                        max={2}
                        step={0.1}
                        className="w-full"
                      />
                    </div>

                    {/* Saturation */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Saturation</span>
                        <span>{customConfig.saturation?.toFixed(2)}</span>
                      </div>
                      <Slider
                        value={[customConfig.saturation || 1]}
                        onValueChange={([value]) =>
                          setCustomConfig(prev => ({ ...prev, saturation: value }))
                        }
                        min={0}
                        max={2}
                        step={0.1}
                        className="w-full"
                      />
                    </div>

                    {/* Hue */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Hue</span>
                        <span>{customConfig.hue}°</span>
                      </div>
                      <Slider
                        value={[customConfig.hue || 0]}
                        onValueChange={([value]) =>
                          setCustomConfig(prev => ({ ...prev, hue: value }))
                        }
                        min={-180}
                        max={180}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    {/* Apply Button */}
                    <div className="pt-4">
                      <Button
                        onClick={handleApplyFilter}
                        className="w-full btn-primary smooth-transition hover:scale-105"
                        disabled={isProcessing}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Apply Filter
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Select a filter preset to customize
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}