import { adminDb } from './instantdb-admin';

export const uploadFile = async (
  file: Buffer | Uint8Array,
  userId: string,
  fileName?: string,
  contentType?: string
): Promise<{ url: string; path: string; id: string }> => {
  const path = `${userId}/${fileName}`;

  // Convert Buffer/Uint8Array to Buffer if needed
  const buffer = file instanceof Buffer ? file : Buffer.from(file);

  // Upload using InstantDB storage
  await adminDb.storage.uploadFile(path, buffer, {
    contentType: contentType || 'application/octet-stream',
  });

  // Query the file to get metadata including URL
  const { $files } = await adminDb.query({
    $files: {
      $: {
        where: { path },
      },
    },
  });

  const uploadedFile = $files[0];

  if (!uploadedFile) {
    throw new Error('File upload failed - file not found after upload');
  }

  return {
    url: uploadedFile.url,
    path: uploadedFile.path,
    id: uploadedFile.id,
  };
};

export const deleteFile = async (path: string): Promise<void> => {
  await adminDb.storage.delete(path);
};

export const deleteFiles = async (paths: string[]): Promise<void> => {
  await adminDb.storage.deleteMany(paths);
};
