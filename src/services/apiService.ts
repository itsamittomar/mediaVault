const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (
  import.meta.env.PROD ? '/api/v1' : 'http://localhost:8080/api/v1'
);

export interface MediaFile {
  id: string;
  fileName: string;
  originalName: string;
  title: string;
  description?: string | null;
  mimeType: string;
  size: number;
  category?: string | null;
  tags: string[] | null;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadResponse {
  id: string;
  fileName: string;
  originalName: string;
  title: string;
  description?: string | null;
  mimeType: string;
  size: number;
  category?: string | null;
  tags: string[] | null;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListResponse {
  files: MediaFile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface UploadRequest {
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
}

export interface UpdateRequest {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
}

export interface ListQuery {
  category?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

class ApiService {
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('accessToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
          ...options.headers,
        },
        credentials: 'include',
      });
    } catch (error) {
      throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          errorMessage = errorJson.error;
        }
      } catch {
        // If parsing fails, use the response text
        if (errorText) {
          errorMessage = errorText;
        }
      }

      throw new Error(errorMessage);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async uploadFile(file: File, metadata: UploadRequest): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', metadata.title);

    if (metadata.description) {
      formData.append('description', metadata.description);
    }

    if (metadata.category) {
      formData.append('category', metadata.category);
    }

    if (metadata.tags && metadata.tags.length > 0) {
      formData.append('tags', JSON.stringify(metadata.tags));
    }

    const response = await fetch(`${API_BASE_URL}/media/upload`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Upload failed: ${response.status} ${response.statusText}`;

      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          errorMessage = errorJson.error;
        }
      } catch {
        if (errorText) {
          errorMessage = errorText;
        }
      }

      throw new Error(errorMessage);
    }

    return response.json();
  }

  async getFile(id: string): Promise<MediaFile> {
    return this.request<MediaFile>(`/media/${id}`);
  }

  async listFiles(query: ListQuery = {}): Promise<ListResponse> {
    const params = new URLSearchParams();

    if (query.category) params.append('category', query.category);
    if (query.type) params.append('type', query.type);
    if (query.search) params.append('search', query.search);
    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());

    const queryString = params.toString();
    const endpoint = queryString ? `/media?${queryString}` : '/media';

    return this.request<ListResponse>(endpoint);
  }

  async updateFile(id: string, updates: UpdateRequest): Promise<MediaFile> {
    return this.request<MediaFile>(`/media/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteFile(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/media/${id}`, {
      method: 'DELETE',
    });
  }

  async downloadFile(id: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/media/${id}/download`, {
      headers: {
        ...this.getAuthHeaders(),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    return response.blob();
  }

  async getCategories(): Promise<string[]> {
    const response = await this.request<{ categories: string[] }>('/categories');
    return response.categories;
  }

  async uploadAvatar(file: File): Promise<{ user: any; message: string }> {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(`${API_BASE_URL}/profile/avatar`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Avatar upload failed: ${response.status} ${response.statusText}`;

      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          errorMessage = errorJson.error;
        }
      } catch {
        if (errorText) {
          errorMessage = errorText;
        }
      }

      throw new Error(errorMessage);
    }

    return response.json();
  }

  async updateProfile(updates: { username?: string; email?: string }): Promise<{ user: any; message: string }> {
    return this.request<{ user: any; message: string }>('/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async getProfile(): Promise<{ user: any }> {
    return this.request<{ user: any }>('/profile');
  }

  async healthCheck(): Promise<{ status: string; service: string }> {
    const response = await fetch(`${API_BASE_URL.replace('/api/v1', '')}/health`);
    return response.json();
  }
}

export const apiService = new ApiService();