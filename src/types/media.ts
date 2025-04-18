export type MediaType = 'image' | 'video' | 'audio' | 'document';

export interface MediaItem {
  id: string;
  title: string;
  description?: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  size: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  favorite: boolean;
  category?: string;
  userId: string;
}