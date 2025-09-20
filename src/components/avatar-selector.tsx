import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Upload, User, Camera, Check } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';

interface AvatarSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileSelect: (file: File) => void;
}

// Default avatar options - these could be stored in a more sophisticated way
const DEFAULT_AVATARS = [
  {
    id: 'avatar-1',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4',
    name: 'Felix',
  },
  {
    id: 'avatar-2',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=c0aede',
    name: 'Aneka',
  },
  {
    id: 'avatar-3',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob&backgroundColor=ffd93d',
    name: 'Bob',
  },
  {
    id: 'avatar-4',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Annie&backgroundColor=ffb3ba',
    name: 'Annie',
  },
  {
    id: 'avatar-5',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=bae1ff',
    name: 'Alex',
  },
  {
    id: 'avatar-6',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sam&backgroundColor=c7ceea',
    name: 'Sam',
  },
  {
    id: 'avatar-7',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Riley&backgroundColor=b8e6b8',
    name: 'Riley',
  },
  {
    id: 'avatar-8',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan&backgroundColor=ffd1dc',
    name: 'Jordan',
  },
];

export function AvatarSelector({ open, onOpenChange, onFileSelect }: AvatarSelectorProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [customPreview, setCustomPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { user, updateUser } = useAuth();

  const handleDefaultAvatarSelect = async (avatarUrl: string, avatarId: string) => {
    try {
      setIsUploading(true);
      setSelectedAvatar(avatarId);

      // Convert the SVG URL to a blob and then to a File object
      const response = await fetch(avatarUrl);
      const blob = await response.blob();
      const file = new File([blob], `avatar-${avatarId}.svg`, { type: 'image/svg+xml' });

      // Use the existing upload handler
      onFileSelect(file);

      toast.success('Avatar updated successfully!', {
        description: 'Your new avatar has been set.',
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to set default avatar:', error);
      toast.error('Failed to set avatar', {
        description: 'Please try again or upload a custom image.',
      });
    } finally {
      setIsUploading(false);
      setSelectedAvatar(null);
    }
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setCustomPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Call the upload handler
      onFileSelect(file);
      onOpenChange(false);
    }
  };

  const getUserInitials = (username: string) => {
    return username
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Change Avatar
          </DialogTitle>
          <DialogDescription>
            Choose from our collection or upload your own image
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={customPreview || user?.avatar} alt={user?.username} />
              <AvatarFallback className="text-lg">
                {user?.username ? getUserInitials(user.username) : <User />}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium">Current Avatar</h3>
              <p className="text-sm text-muted-foreground">
                {user?.username}'s profile picture
              </p>
            </div>
            {customPreview && (
              <Badge variant="secondary" className="ml-auto">
                Preview
              </Badge>
            )}
          </div>

          <Separator />

          {/* Default Avatars */}
          <div>
            <h4 className="font-medium mb-3">Choose from Collection</h4>
            <div className="grid grid-cols-4 gap-3">
              {DEFAULT_AVATARS.map((avatar) => (
                <div
                  key={avatar.id}
                  className="relative group cursor-pointer"
                  onClick={() => handleDefaultAvatarSelect(avatar.url, avatar.id)}
                >
                  <div className={`
                    p-2 rounded-lg border-2 transition-all
                    ${selectedAvatar === avatar.id
                      ? 'border-primary bg-primary/10'
                      : 'border-muted hover:border-primary/50'
                    }
                  `}>
                    <Avatar className="h-12 w-12 mx-auto">
                      <AvatarImage src={avatar.url} alt={avatar.name} />
                      <AvatarFallback>{avatar.name[0]}</AvatarFallback>
                    </Avatar>
                    <p className="text-xs text-center mt-1 font-medium">
                      {avatar.name}
                    </p>
                  </div>
                  {selectedAvatar === avatar.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/20 rounded-lg">
                      {isUploading ? (
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Upload Custom */}
          <div>
            <h4 className="font-medium mb-3">Upload Custom Image</h4>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
                id="avatar-upload"
              />
              <label htmlFor="avatar-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="font-medium">Click to upload</p>
                <p className="text-sm text-muted-foreground">
                  JPG, PNG, or GIF • Max 5MB
                </p>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}