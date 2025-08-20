import { nanoid } from 'nanoid';
import db from '../lib/instantdb';

export const uploadFile = async (
  file: File,
  bucket: 'avatars' | 'files' | 'screenshots',
  filename?: string
) => {
  // Check if user is authenticated through InstantDB
  const { user } = db.useAuth();

  if (!user) {
    throw new Error('You need to be logged in to upload a file!');
  }

  const extension = file.name.split('.').pop();
  const name = filename ?? `${nanoid()}.${extension}`;
  const path = `${bucket}/${user.id}/${name}`;

  // Upload using InstantDB storage
  await db.storage.uploadFile(path, file, {
    contentType: file.type,
  });

  // For client-side uploads, InstantDB doesn't immediately return the URL
  // We'll create a temporary blob URL for immediate use
  const tempUrl = URL.createObjectURL(file);

  // TODO: Replace this with proper InstantDB file URL retrieval
  // For now, we'll use the temporary blob URL

  return {
    url: tempUrl,
    type: file.type,
  };
};
