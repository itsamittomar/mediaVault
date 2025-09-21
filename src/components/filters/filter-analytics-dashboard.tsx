import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  Palette,
  Heart,
  Star,
  Clock,
  BarChart3,
  Users,
  Sparkles
} from 'lucide-react';

interface FilterUsageStats {
  filter: {
    id: string;
    name: string;
    category: string;
    description: string;
  };
  count: number;
  rank: number;
}

interface RecentFilterApplication {
  id: string;
  appliedAt: string;
  filter: {
    name: string;
    category: string;
  };
  media: {
    title: string;
    type: string;
  };
}

interface FilterAnalytics {
  totalApplications: number;
  popularFilters: FilterUsageStats[];
  categoryStats: Record<string, number>;
  recentActivity: RecentFilterApplication[];
}

interface StyleProfile {
  preferredColors: string[];
  preferredMoods: string[];
  preferredStyles: string[];
}

export default function FilterAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<FilterAnalytics | null>(null);
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    fetchStyleProfile();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/v1/users/me/filters/analytics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const fetchStyleProfile = async () => {
    try {
      const response = await fetch('/api/v1/users/me/filters/style-profile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStyleProfile(data.styleProfile);
      }
    } catch (error) {
      console.error('Failed to fetch style profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'artistic': return <Palette className="h-4 w-4" />;
      case 'mood': return <Heart className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'artistic': return 'bg-purple-500';
      case 'mood': return 'bg-pink-500';
      case 'color': return 'bg-blue-500';
      case 'technical': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-64 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalApplications = analytics?.totalApplications || 0;
  const categoryStats = analytics?.categoryStats || {};

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Filters Applied</p>
                <p className="text-2xl font-bold">{totalApplications}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Favorite Category</p>
                <p className="text-2xl font-bold capitalize">
                  {Object.entries(categoryStats).reduce((a, b) => a[1] > b[1] ? a : b)?.[0] || 'None'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Most Popular</p>
                <p className="text-2xl font-bold">
                  {analytics?.popularFilters[0]?.filter.name || 'None'}
                </p>
              </div>
              <Star className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Learned Preferences</p>
                <p className="text-2xl font-bold">
                  {(styleProfile?.preferredStyles?.length || 0) + (styleProfile?.preferredMoods?.length || 0)}
                </p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="usage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="usage">Usage Statistics</TabsTrigger>
          <TabsTrigger value="profile">Style Profile</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Popular Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Most Used Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {analytics?.popularFilters?.map((stat, index) => (
                      <div key={stat.filter.id} className="flex items-center justify-between p-2 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{stat.filter.name}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              {getCategoryIcon(stat.filter.category)}
                              {stat.filter.category}
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary">{stat.count} uses</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Category Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(categoryStats).map(([category, count]) => (
                    <div key={category} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(category)}
                          <span className="capitalize font-medium">{category}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{count} uses</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getCategoryColor(category)}`}
                          style={{
                            width: `${(count / totalApplications) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Preferred Styles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Preferred Styles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {styleProfile?.preferredStyles?.length ? (
                    styleProfile.preferredStyles.map((style, index) => (
                      <Badge key={index} variant="secondary" className="capitalize">
                        {style.replace('-', ' ')}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No preferences learned yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Preferred Moods */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Preferred Moods
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {styleProfile?.preferredMoods?.length ? (
                    styleProfile.preferredMoods.map((mood, index) => (
                      <Badge key={index} variant="secondary" className="capitalize">
                        {mood}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No preferences learned yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Preferred Colors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Color Palette
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {styleProfile?.preferredColors?.length ? (
                    styleProfile.preferredColors.map((color, index) => (
                      <div
                        key={index}
                        className="w-8 h-8 rounded-full border-2 border-muted"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No color preferences learned yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Filter Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {analytics?.recentActivity?.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        {getCategoryIcon(activity.filter.category)}
                        <div>
                          <div className="font-medium">{activity.filter.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Applied to {activity.media.title}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          {formatTimeAgo(activity.appliedAt)}
                        </div>
                        <Badge variant="outline" className="mt-1 capitalize">
                          {activity.media.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {(!analytics?.recentActivity || analytics.recentActivity.length === 0) && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No recent activity</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}