import * as Minio from 'minio';

// MinIO client configuration
const minioClient = new Minio.Client({
  endPoint: import.meta.env.VITE_MINIO_ENDPOINT || 'localhost',
  port: parseInt(import.meta.env.VITE_MINIO_PORT) || 9000,
  useSSL: import.meta.env.VITE_MINIO_USE_SSL === 'true',
  accessKey: import.meta.env.VITE_MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: import.meta.env.VITE_MINIO_SECRET_KEY || 'minioadmin',
});

const BUCKET_NAME = import.meta.env.VITE_MINIO_BUCKET_NAME || 'mediavault';

export interface UploadResult {
  fileName: string;
  url: string;
  etag: string;
}

export interface MediaFile {
  id: string;
  fileName: string;
  originalName: string;
  url: string;
  size: number;
  mimeType: string;
  uploadDate: Date;
  title: string;
  description?: string;
  tags?: string[];
  category?: string;
}

class MinioService {
  async ensureBucketExists(): Promise<void> {
    try {
      const exists = await minioClient.bucketExists(BUCKET_NAME);
      if (!exists) {
        await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');

        // Set bucket policy to allow public read access
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
            },
          ],
        };

        await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
      }
    } catch (error) {
      console.error('Error ensuring bucket exists:', error);
      throw new Error('Failed to initialize MinIO bucket');
    }
  }

  async uploadFile(
    file: File,
    metadata: {
      title: string;
      description?: string;
      tags?: string;
      category?: string;
    }
  ): Promise<UploadResult> {
    try {
      await this.ensureBucketExists();

      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${timestamp}_${sanitizedName}`;

      // Prepare metadata
      const minioMetadata = {
        'Content-Type': file.type,
        'X-Amz-Meta-Original-Name': file.name,
        'X-Amz-Meta-Title': metadata.title,
        'X-Amz-Meta-Upload-Date': new Date().toISOString(),
        ...(metadata.description && { 'X-Amz-Meta-Description': metadata.description }),
        ...(metadata.tags && { 'X-Amz-Meta-Tags': metadata.tags }),
        ...(metadata.category && { 'X-Amz-Meta-Category': metadata.category }),
      };

      // Upload file
      const result = await minioClient.putObject(
        BUCKET_NAME,
        fileName,
        file.stream(),
        file.size,
        minioMetadata
      );

      // Get presigned URL for the uploaded file
      const url = await minioClient.presignedGetObject(BUCKET_NAME, fileName, 7 * 24 * 60 * 60); // 7 days

      return {
        fileName,
        url,
        etag: result.etag,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Failed to upload file to MinIO');
    }
  }

  async getFileUrl(fileName: string, expiry: number = 7 * 24 * 60 * 60): Promise<string> {
    try {
      return await minioClient.presignedGetObject(BUCKET_NAME, fileName, expiry);
    } catch (error) {
      console.error('Error getting file URL:', error);
      throw new Error('Failed to get file URL');
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    try {
      await minioClient.removeObject(BUCKET_NAME, fileName);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }

  async listFiles(): Promise<MediaFile[]> {
    try {
      const files: MediaFile[] = [];
      const stream = minioClient.listObjects(BUCKET_NAME, '', true);

      return new Promise((resolve, reject) => {
        stream.on('data', async (obj) => {
          if (obj.name) {
            try {
              // Get object metadata
              const stat = await minioClient.statObject(BUCKET_NAME, obj.name);
              const url = await this.getFileUrl(obj.name);

              const mediaFile: MediaFile = {
                id: obj.name,
                fileName: obj.name,
                originalName: stat.metaData['x-amz-meta-original-name'] || obj.name,
                url,
                size: obj.size || 0,
                mimeType: stat.metaData['content-type'] || 'application/octet-stream',
                uploadDate: obj.lastModified || new Date(),
                title: stat.metaData['x-amz-meta-title'] || obj.name,
                description: stat.metaData['x-amz-meta-description'],
                tags: stat.metaData['x-amz-meta-tags']?.split(',').map(tag => tag.trim()),
                category: stat.metaData['x-amz-meta-category'],
              };

              files.push(mediaFile);
            } catch (error) {
              console.error(`Error processing file ${obj.name}:`, error);
            }
          }
        });

        stream.on('error', (error) => {
          console.error('Error listing files:', error);
          reject(new Error('Failed to list files'));
        });

        stream.on('end', () => {
          // Sort files by upload date (newest first)
          files.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
          resolve(files);
        });
      });
    } catch (error) {
      console.error('Error listing files:', error);
      throw new Error('Failed to list files');
    }
  }

  async getFilesByCategory(category: string): Promise<MediaFile[]> {
    const allFiles = await this.listFiles();
    return allFiles.filter(file => file.category === category);
  }

  async searchFiles(query: string): Promise<MediaFile[]> {
    const allFiles = await this.listFiles();
    const searchTerm = query.toLowerCase();

    return allFiles.filter(file =>
      file.title.toLowerCase().includes(searchTerm) ||
      file.originalName.toLowerCase().includes(searchTerm) ||
      file.description?.toLowerCase().includes(searchTerm) ||
      file.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }
}

export const minioService = new MinioService();