import { useUser } from '@clerk/nextjs';
import { Loader2Icon } from 'lucide-react';
import Image from 'next/image';
import { type FormEventHandler, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { uploadFile } from '@/data/upload';
import { handleError } from '@/lib/error/handle';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from './ui/kibo-ui/dropzone';
import { Label } from './ui/label';

type ProfileProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const Profile = ({ open, setOpen }: ProfileProps) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [image, setImage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? '');
      setLastName(user.lastName ?? '');
      setImage(user.imageUrl ?? '');
    }
  }, [user]);

  const handleUpdateUser: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();

    if (!(firstName.trim() || lastName.trim()) || isUpdating) {
      return;
    }

    setIsUpdating(true);

    try {
      if (!user) {
        throw new Error('User not found');
      }

      await user.update({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });

      toast.success('Profile updated successfully');
      setOpen(false);
    } catch (error) {
      handleError('Error updating profile', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDrop = async (files: File[]) => {
    if (isUpdating) {
      return;
    }

    try {
      if (!files.length) {
        throw new Error('No file selected');
      }

      if (!user) {
        throw new Error('User not found');
      }

      setIsUpdating(true);

      const { url } = await uploadFile(files[0], 'avatars');

      await user.setProfileImage({ file: files[0] });

      toast.success('Avatar updated successfully');
      setImage(url);
    } catch (error) {
      handleError('Error updating avatar', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog modal={false} onOpenChange={setOpen} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
          <DialogDescription>
            Update your profile information.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="avatar">Avatar</Label>
          <Dropzone
            accept={{ 'image/*': [] }}
            className="relative aspect-square h-36 w-auto"
            maxFiles={1}
            maxSize={1024 * 1024 * 10}
            minSize={1024}
            multiple={false}
            onDrop={handleDrop}
            onError={console.error}
            src={[new File([], image)]}
          >
            <DropzoneEmptyState />
            <DropzoneContent>
              {image && (
                <Image
                  alt="Image preview"
                  className="absolute top-0 left-0 h-full w-full object-cover"
                  height={100}
                  src={image}
                  unoptimized
                  width={100}
                />
              )}
              {isUpdating && (
                <div className="absolute inset-0 z-10 flex items-center justify-center">
                  <Loader2Icon className="animate-spin" size={24} />
                </div>
              )}
            </DropzoneContent>
          </Dropzone>
        </div>
        <form
          aria-disabled={isUpdating}
          className="mt-2 grid gap-4"
          onSubmit={handleUpdateUser}
        >
          <div className="grid gap-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              className="text-foreground"
              id="firstName"
              onChange={({ target }) => setFirstName(target.value)}
              placeholder="Jane"
              value={firstName}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              className="text-foreground"
              id="lastName"
              onChange={({ target }) => setLastName(target.value)}
              placeholder="Doe"
              value={lastName}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              className="text-foreground"
              disabled
              id="email"
              placeholder={user?.primaryEmailAddress?.emailAddress ?? 'N/A'}
              readOnly
            />
            <p className="text-muted-foreground text-xs">
              Email changes must be done through Clerk settings
            </p>
          </div>
          <Button
            disabled={
              isUpdating ||
              (firstName.trim().length === 0 && lastName.trim().length === 0)
            }
            type="submit"
          >
            Update
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
