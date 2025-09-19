import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, File, X, FilePlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn, formatFileSize } from '@/lib/utils';
import { getCategories } from '@/data/media';
import { apiService } from '@/services/apiService';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ACCEPTED_FILE_TYPES = {
  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  'video/*': ['.mp4', '.webm', '.mov'],
  'audio/*': ['.mp3', '.wav', '.ogg'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc', '.docx'],
  'application/vnd.ms-excel': ['.xls', '.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt', '.pptx'],
};

const uploadSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  description: z.string().optional(),
  tags: z.string().optional(),
  category: z.string().optional(),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const categories = getCategories();

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      title: '',
      description: '',
      tags: '',
      category: '',
    },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    onDrop: (acceptedFiles: File[]) => {
      setFiles(acceptedFiles);
      
      // If file is dropped, automatically set the title to the file name without extension
      if (acceptedFiles.length === 1) {
        const fileName = acceptedFiles[0].name.split('.').slice(0, -1).join('.');
        form.setValue('title', fileName);
      }
    },
    onDropRejected: (rejectedFiles) => {
      rejectedFiles.forEach((file) => {
        file.errors.forEach((error) => {
          if (error.code === 'file-too-large') {
            toast({
              title: 'File too large',
              description: `Maximum file size is ${formatFileSize(MAX_FILE_SIZE)}`,
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Invalid file',
              description: error.message,
              variant: 'destructive',
            });
          }
        });
      });
    },
  });

  const onSubmit = async (data: UploadFormValues) => {
    if (files.length === 0) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to upload',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Prepare metadata
        const metadata = {
          title: data.title || file.name.split('.').slice(0, -1).join('.'),
          description: data.description || undefined,
          category: data.category || undefined,
          tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : undefined,
        };

        // Upload file
        await apiService.uploadFile(file, metadata);

        // Update progress
        const progress = ((i + 1) / files.length) * 100;
        setUploadProgress(progress);
      }

      toast({
        title: 'Upload successful',
        description: `${files.length > 1 ? `${files.length} files` : files[0].name} uploaded successfully`,
      });

      setFiles([]);
      form.reset();

      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);

    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileTypeIcon = (file: File) => {
    const type = file.type.split('/')[0];
    switch (type) {
      case 'image':
        return <FilePlus className="h-6 w-6 text-orange-500" />;
      case 'video':
        return <FilePlus className="h-6 w-6 text-purple-500" />;
      case 'audio':
        return <FilePlus className="h-6 w-6 text-green-500" />;
      default:
        return <FilePlus className="h-6 w-6 text-blue-500" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Upload Media</h1>
        <p className="text-muted-foreground">Add new media to your library</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Upload Files</CardTitle>
          <CardDescription>
            Drag and drop your files here or click to browse.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div 
                {...getRootProps()} 
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 transition-colors text-center cursor-pointer",
                  isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center gap-1">
                  <Upload className={cn("h-10 w-10 mb-2", isDragActive ? "text-primary" : "text-muted-foreground")} />
                  <h3 className="font-medium">
                    {isDragActive ? 'Drop your files here' : 'Drag & drop your files here'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    or click to browse (max {formatFileSize(MAX_FILE_SIZE)})
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supported formats: Images, Videos, Audio, Documents
                  </p>
                </div>
              </div>
              
              {files.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Selected Files ({files.length})</h3>
                  <div className="border rounded-md divide-y">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          {getFileTypeIcon(file)}
                          <div>
                            <p className="text-sm font-medium line-clamp-1">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(index)}
                          disabled={isUploading}
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Remove file</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter a title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                          <SelectItem value="new">+ Create New Category</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter a description (optional)"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter tags separated by commas" {...field} />
                    </FormControl>
                    <FormDescription>
                      Separate tags with commas (e.g., nature, vacation, family)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" disabled={isUploading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isUploading || files.length === 0}>
                  {isUploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}