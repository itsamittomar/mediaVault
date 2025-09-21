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
import { Badge } from '@/components/ui/badge';
import { Upload, File, X, FilePlus, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn, formatFileSize } from '@/lib/utils';
import { getCategories } from '@/data/media';
import { apiService, type AutoSuggestionsResponse } from '@/services/apiService';

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
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [autoSuggestions, setAutoSuggestions] = useState<AutoSuggestionsResponse | null>(null);
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
      setAutoSuggestions(null); // Clear previous suggestions

      // If file is dropped, automatically set the title to the file name without extension
      if (acceptedFiles.length === 1) {
        const fileName = acceptedFiles[0].name.split('.').slice(0, -1).join('.');
        form.setValue('title', fileName);

        // Auto-generate suggestions for images
        if (acceptedFiles[0].type.startsWith('image/')) {
          generateAutoSuggestions(acceptedFiles[0]);
        }
      }
    },
    onDropRejected: (rejectedFiles) => {
      rejectedFiles.forEach((file) => {
        file.errors.forEach((error) => {
          if (error.code === 'file-too-large') {
            toast.error('File too large', {
              description: `Maximum file size is ${formatFileSize(MAX_FILE_SIZE)}`,
            });
          } else {
            toast.error('Invalid file', {
              description: error.message,
            });
          }
        });
      });
    },
  });

  const onSubmit = async (data: UploadFormValues) => {
    if (files.length === 0) {
      toast.error('No file selected', {
        description: 'Please select a file to upload',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Show initial upload notification
    const uploadToastId = toast.loading(
      `Uploading ${files.length > 1 ? `${files.length} files` : files[0].name}...`,
      {
        description: 'Please wait while your files are being uploaded',
        duration: Infinity,
      }
    );

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Update toast with current file info
        toast.loading(`Uploading ${file.name}...`, {
          id: uploadToastId,
          description: `File ${i + 1} of ${files.length}`,
        });

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

      // Dismiss loading toast and show success
      toast.dismiss(uploadToastId);
      toast.success('Upload successful! ✨', {
        description: `${files.length > 1 ? `${files.length} files` : files[0].name} uploaded successfully`,
        duration: 5000,
        action: {
          label: 'View Files',
          onClick: () => navigate('/dashboard'),
        },
      });

      setFiles([]);
      form.reset();

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Upload failed:', error);
      toast.dismiss(uploadToastId);
      toast.error('Upload failed ❌', {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const generateAutoSuggestions = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }

    setIsGeneratingSuggestions(true);

    try {
      const suggestions = await apiService.getAutoSuggestions(file);
      setAutoSuggestions(suggestions);

      toast.success('AI Suggestions Ready! ✨', {
        description: 'Click the suggestions below to auto-fill your form',
        duration: 4000,
      });
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      toast.info('Basic suggestions generated', {
        description: 'AI analysis unavailable, showing basic file information',
        duration: 3000,
      });
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const applySuggestions = () => {
    if (!autoSuggestions) return;

    // Auto-fill form fields with suggestions
    if (autoSuggestions.description) {
      form.setValue('description', autoSuggestions.description);
    }

    if (autoSuggestions.category) {
      form.setValue('category', autoSuggestions.category);
    }

    if (autoSuggestions.tags && autoSuggestions.tags.length > 0) {
      form.setValue('tags', autoSuggestions.tags.join(', '));
    }

    toast.success('Suggestions Applied! 🎉', {
      description: 'Form fields have been auto-filled with AI suggestions',
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setAutoSuggestions(null); // Clear suggestions when file is removed
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
                <div className="space-y-4">
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
                          <div className="flex items-center gap-2">
                            {file.type.startsWith('image/') && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => generateAutoSuggestions(file)}
                                disabled={isGeneratingSuggestions || isUploading}
                              >
                                {isGeneratingSuggestions ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Sparkles className="h-4 w-4" />
                                )}
                                {isGeneratingSuggestions ? 'Analyzing...' : 'AI Suggest'}
                              </Button>
                            )}
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
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Suggestions Panel */}
                  {autoSuggestions && (
                    <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-emerald-600" />
                          AI Suggestions
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(autoSuggestions.confidence * 100)}% confidence
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {autoSuggestions.description && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Description</p>
                            <p className="text-sm">{autoSuggestions.description}</p>
                          </div>
                        )}

                        {autoSuggestions.category && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Category</p>
                            <Badge variant="outline" className="text-xs">{autoSuggestions.category}</Badge>
                          </div>
                        )}

                        {autoSuggestions.tags && autoSuggestions.tags.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Tags</p>
                            <div className="flex flex-wrap gap-1">
                              {autoSuggestions.tags.slice(0, 8).map((tag, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">{tag}</Badge>
                              ))}
                              {autoSuggestions.tags.length > 8 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{autoSuggestions.tags.length - 8} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {autoSuggestions.detectedObjects && autoSuggestions.detectedObjects.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Detected Objects</p>
                            <div className="flex flex-wrap gap-1">
                              {autoSuggestions.detectedObjects.slice(0, 6).map((object, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">{object}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <Button
                          type="button"
                          onClick={applySuggestions}
                          className="w-full mt-3"
                          variant="default"
                          size="sm"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Apply All Suggestions
                        </Button>
                      </CardContent>
                    </Card>
                  )}
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