import { MediaItem } from '@/types/media';

// Mock data for demonstration purposes
export const mediaItems: MediaItem[] = [
  {
    id: '1',
    title: 'Nature Landscape',
    description: 'Beautiful mountain landscape at sunset',
    type: 'image',
    url: 'https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg',
    thumbnailUrl: 'https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg?auto=compress&cs=tinysrgb&w=200',
    size: 1024 * 1024 * 2.5, // 2.5 MB
    createdAt: '2025-03-15T10:30:00Z',
    updatedAt: '2025-03-15T10:30:00Z',
    tags: ['nature', 'landscape', 'mountains'],
    favorite: true,
    category: 'Landscapes',
    userId: '1',
  },
  {
    id: '2',
    title: 'Product Documentation',
    description: 'Technical documentation for the new product release',
    type: 'document',
    url: 'https://example.com/document.pdf',
    thumbnailUrl: '',
    size: 1024 * 1024 * 1.2, // 1.2 MB
    createdAt: '2025-03-10T14:20:00Z',
    updatedAt: '2025-03-12T09:15:00Z',
    tags: ['documentation', 'technical', 'product'],
    favorite: false,
    category: 'Work',
    userId: '1',
  },
  {
    id: '3',
    title: 'Beach Waves',
    description: 'Relaxing audio of ocean waves',
    type: 'audio',
    url: 'https://example.com/beach-waves.mp3',
    thumbnailUrl: 'https://images.pexels.com/photos/1295138/pexels-photo-1295138.jpeg?auto=compress&cs=tinysrgb&w=200',
    size: 1024 * 1024 * 3.5, // 3.5 MB
    createdAt: '2025-02-28T16:45:00Z',
    updatedAt: '2025-02-28T16:45:00Z',
    tags: ['audio', 'relaxation', 'ocean'],
    favorite: true,
    category: 'Sounds',
    userId: '1',
  },
  {
    id: '4',
    title: 'Drone Footage',
    description: 'Aerial view of coastline captured by drone',
    type: 'video',
    url: 'https://example.com/drone-footage.mp4',
    thumbnailUrl: 'https://images.pexels.com/photos/1139040/pexels-photo-1139040.jpeg?auto=compress&cs=tinysrgb&w=200',
    size: 1024 * 1024 * 15.8, // 15.8 MB
    createdAt: '2025-03-05T11:20:00Z',
    updatedAt: '2025-03-06T14:30:00Z',
    tags: ['video', 'drone', 'aerial', 'beach'],
    favorite: false,
    category: 'Videos',
    userId: '1',
  },
  {
    id: '5',
    title: 'City at Night',
    description: 'Urban cityscape with neon lights',
    type: 'image',
    url: 'https://images.pexels.com/photos/1538177/pexels-photo-1538177.jpeg',
    thumbnailUrl: 'https://images.pexels.com/photos/1538177/pexels-photo-1538177.jpeg?auto=compress&cs=tinysrgb&w=200',
    size: 1024 * 1024 * 3.2, // 3.2 MB
    createdAt: '2025-03-12T23:15:00Z',
    updatedAt: '2025-03-12T23:15:00Z',
    tags: ['city', 'night', 'urban', 'lights'],
    favorite: true,
    category: 'Cityscapes',
    userId: '1',
  },
  {
    id: '6',
    title: 'Quarterly Report',
    description: 'Q1 2025 financial report',
    type: 'document',
    url: 'https://example.com/q1-report.pdf',
    thumbnailUrl: '',
    size: 1024 * 1024 * 2.1, // 2.1 MB
    createdAt: '2025-04-02T10:00:00Z',
    updatedAt: '2025-04-03T15:30:00Z',
    tags: ['finance', 'report', 'quarterly'],
    favorite: false,
    category: 'Work',
    userId: '1',
  },
  {
    id: '7',
    title: 'Morning Coffee',
    description: 'Close-up shot of coffee cup on wooden table',
    type: 'image',
    url: 'https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg',
    thumbnailUrl: 'https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg?auto=compress&cs=tinysrgb&w=200',
    size: 1024 * 1024 * 1.8, // 1.8 MB
    createdAt: '2025-03-25T08:45:00Z',
    updatedAt: '2025-03-25T08:45:00Z',
    tags: ['coffee', 'lifestyle', 'morning'],
    favorite: true,
    category: 'Food',
    userId: '1',
  },
  {
    id: '8',
    title: 'Project Presentation',
    description: 'Final presentation for client project',
    type: 'document',
    url: 'https://example.com/project-presentation.pptx',
    thumbnailUrl: '',
    size: 1024 * 1024 * 4.5, // 4.5 MB
    createdAt: '2025-03-18T16:20:00Z',
    updatedAt: '2025-03-20T09:10:00Z',
    tags: ['presentation', 'project', 'client'],
    favorite: false,
    category: 'Work',
    userId: '1',
  },
];

// Function to get media items with optional filtering
export function getMediaItems({
  type,
  search,
  favorite,
  userId,
}: {
  type?: string;
  search?: string;
  favorite?: boolean;
  userId?: string;
} = {}): MediaItem[] {
  let filtered = [...mediaItems];
  
  if (userId) {
    filtered = filtered.filter(item => item.userId === userId);
  }
  
  if (type && type !== 'all') {
    filtered = filtered.filter(item => item.type === type);
  }
  
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(
      item =>
        item.title.toLowerCase().includes(searchLower) ||
        (item.description && item.description.toLowerCase().includes(searchLower)) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }
  
  if (favorite !== undefined) {
    filtered = filtered.filter(item => item.favorite === favorite);
  }
  
  return filtered;
}

// Function to get a single media item by ID
export function getMediaItemById(id: string): MediaItem | undefined {
  return mediaItems.find(item => item.id === id);
}

// Function to get categories
export function getCategories(): string[] {
  const categories = new Set<string>();
  mediaItems.forEach(item => {
    if (item.category) {
      categories.add(item.category);
    }
  });
  return Array.from(categories);
}

// Function to get all tags
export function getTags(): string[] {
  const tags = new Set<string>();
  mediaItems.forEach(item => {
    item.tags.forEach(tag => tags.add(tag));
  });
  return Array.from(tags);
}