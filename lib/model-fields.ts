import { Position } from '@xyflow/react';
import type { TableField } from '@/components/nodes/layout';
import { imageModels } from './models/image';
import { speechModels } from './models/speech';
import { textModels } from './models/text';
import { videoModels } from './models/video';

export type MediaType = 'text' | 'image' | 'video' | 'audio' | 'music' | 'code';

// Base fields that are common across models
const getBaseFields = (mediaType: MediaType): TableField[] => {
  const baseFields: TableField[] = [
    {
      name: 'prompt',
      type: 'text',
      isHandle: true,
      handleType: 'target',
      handlePosition: Position.Left,
    },
  ];

  // Add model-specific base fields
  switch (mediaType) {
    case 'image': {
      baseFields.push(
        {
          name: 'size',
          type: 'select',
          value: '1024x1024',
          options: ['1024x1024', '1024x1792', '1792x1024', '512x512'],
        },
        {
          name: 'quality',
          type: 'select',
          value: 'standard',
          options: ['standard', 'hd'],
        }
      );
      break;
    }

    case 'video': {
      baseFields.push(
        {
          name: 'duration',
          type: 'number',
          value: 5,
        },
        {
          name: 'fps',
          type: 'number',
          value: 24,
        },
        {
          name: 'reference_image',
          type: 'image',
          isHandle: true,
          handleType: 'target',
          handlePosition: Position.Left,
        }
      );
      break;
    }

    case 'audio': {
      baseFields.push(
        {
          name: 'voice',
          type: 'select',
          value: 'alloy',
          options: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
        },
        {
          name: 'speed',
          type: 'number',
          value: 1.0,
        }
      );
      break;
    }

    case 'music': {
      baseFields.push(
        {
          name: 'duration',
          type: 'number',
          value: 30,
        },
        {
          name: 'genre',
          type: 'select',
          value: 'ambient',
          options: [
            'ambient',
            'electronic',
            'classical',
            'rock',
            'jazz',
            'folk',
          ],
        },
        {
          name: 'reference_audio',
          type: 'audio',
          isHandle: true,
          handleType: 'target',
          handlePosition: Position.Left,
        }
      );
      break;
    }

    case 'code': {
      baseFields.push(
        {
          name: 'language',
          type: 'select',
          value: 'javascript',
          options: [
            'javascript',
            'typescript',
            'python',
            'java',
            'c++',
            'rust',
            'go',
          ],
        },
        {
          name: 'style',
          type: 'select',
          value: 'clean',
          options: ['clean', 'commented', 'verbose', 'minimal'],
        }
      );
      break;
    }

    default: {
      // No additional fields for other types
      break;
    }
  }

  // Add output field
  baseFields.push({
    name: 'output',
    type: mediaType,
    isHandle: true,
    handleType: 'source',
    handlePosition: Position.Right,
  });

  return baseFields;
};

// Model-specific field generators
export const getImageModelFields = (modelId?: string): TableField[] => {
  const baseFields = getBaseFields('image');

  if (!modelId) {
    return baseFields;
  }

  const model = imageModels[modelId];
  if (!model) {
    return baseFields;
  }

  // Update size options based on model
  const sizeField = baseFields.find((f) => f.name === 'size');
  if (sizeField && model.sizes) {
    sizeField.options = model.sizes;
    sizeField.value = model.sizes[0];
  }

  // Add model-specific fields
  if (model.label.includes('DALL-E')) {
    baseFields.splice(-1, 0, {
      name: 'style',
      type: 'select',
      value: 'vivid',
      options: ['vivid', 'natural'],
    });
  }

  return baseFields;
};

export const getVideoModelFields = (modelId?: string): TableField[] => {
  const baseFields = getBaseFields('video');

  if (!modelId) {
    return baseFields;
  }

  const model = videoModels[modelId];
  if (!model) {
    return baseFields;
  }

  // Add model-specific fields based on model capabilities
  if (model.label.includes('I2V')) {
    // Image-to-video models require reference image
    const refImageField = baseFields.find((f) => f.name === 'reference_image');
    if (refImageField) {
      refImageField.disabled = false;
    }
  }

  if (model.label.includes('Director')) {
    baseFields.splice(-1, 0, {
      name: 'camera_motion',
      type: 'select',
      value: 'static',
      options: ['static', 'pan', 'zoom', 'tilt', 'dolly'],
    });
  }

  return baseFields;
};

export const getAudioModelFields = (modelId?: string): TableField[] => {
  const baseFields = getBaseFields('audio');

  if (!modelId) {
    return baseFields;
  }

  const model = speechModels[modelId];
  if (!model) {
    return baseFields;
  }

  // Update voice options based on model
  const voiceField = baseFields.find((f) => f.name === 'voice');
  if (voiceField && model.voices) {
    voiceField.options = model.voices;
    voiceField.value = model.voices[0];
  }

  return baseFields;
};

export const getMusicModelFields = (modelId?: string): TableField[] => {
  const baseFields = getBaseFields('music');

  if (!modelId) {
    return baseFields;
  }

  // Add common music generation fields
  baseFields.splice(
    -1,
    0,
    {
      name: 'tempo',
      type: 'number',
      value: 120,
    },
    {
      name: 'key',
      type: 'select',
      value: 'C major',
      options: [
        'C major',
        'D major',
        'E major',
        'F major',
        'G major',
        'A major',
        'B major',
        'C minor',
        'D minor',
        'E minor',
        'F minor',
        'G minor',
        'A minor',
        'B minor',
      ],
    }
  );

  return baseFields;
};

export const getTextModelFields = (modelId?: string): TableField[] => {
  const baseFields = getBaseFields('text');

  if (!modelId) {
    return baseFields;
  }

  const model = textModels[modelId];
  if (!model) {
    return baseFields;
  }

  // Add text generation specific fields
  baseFields.splice(
    -1,
    0,
    {
      name: 'max_tokens',
      type: 'number',
      value: 1000,
    },
    {
      name: 'temperature',
      type: 'number',
      value: 0.7,
    }
  );

  return baseFields;
};

export const getCodeModelFields = (modelId?: string): TableField[] => {
  const baseFields = getBaseFields('code');

  if (!modelId) {
    return baseFields;
  }

  // Add code generation specific fields
  baseFields.splice(
    -1,
    0,
    {
      name: 'complexity',
      type: 'select',
      value: 'intermediate',
      options: ['beginner', 'intermediate', 'advanced', 'expert'],
    },
    {
      name: 'comments',
      type: 'boolean',
      value: true,
    }
  );

  return baseFields;
};

// Main function to get fields for any media type
export const getModelFields = (
  mediaType: MediaType,
  modelId?: string
): TableField[] => {
  switch (mediaType) {
    case 'image':
      return getImageModelFields(modelId);
    case 'video':
      return getVideoModelFields(modelId);
    case 'audio':
      return getAudioModelFields(modelId);
    case 'music':
      return getMusicModelFields(modelId);
    case 'text':
      return getTextModelFields(modelId);
    case 'code':
      return getCodeModelFields(modelId);
    default:
      return getBaseFields(mediaType);
  }
};
