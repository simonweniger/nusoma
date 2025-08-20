import { fal } from './fal';
import type { MediaItem } from './types';
import { resolveMediaUrl } from './utils';

export async function getMediaMetadata(media: MediaItem) {
  const mediaUrl = resolveMediaUrl(media);
  if (!mediaUrl) {
    throw new Error('Media URL not found');
  }

  try {
    const { data: mediaMetadata } = await fal.subscribe(
      'fal-ai/ffmpeg-api/metadata',
      {
        input: {
          media_url: mediaUrl,
          extract_frames: true,
        },
        mode: 'streaming',
      }
    );

    return mediaMetadata;
  } catch (error) {
    console.error(error);
    return {};
  }
}
