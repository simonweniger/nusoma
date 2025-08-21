import { generateText } from 'ai';
import { visionModels } from './models/vision';

export async function describeImageForVideo(imageUrl: string): Promise<string> {
  try {
    // Use GPT-4o Mini for fast and cost-effective image description
    const model = visionModels['openai-gpt-4o-mini'];

    if (!model?.providers?.[0]) {
      throw new Error('Vision model not available');
    }

    const { text } = await generateText({
      model: model.providers[0].model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Describe this image in detail for video generation. Focus on:
- Visual elements (objects, people, scenery, colors, lighting)
- Mood and atmosphere 
- Composition and style
- Potential motion or animation possibilities

Provide a concise but vivid description that would help an AI create an engaging video from this image. Keep it under 100 words.`,
            },
            {
              type: 'image',
              image: imageUrl,
            },
          ],
        },
      ],
      maxTokens: 150,
      temperature: 0.7,
    });

    return text.trim();
  } catch (error) {
    console.error('Error describing image:', error);
    // Fallback to a generic prompt
    return 'Create a dynamic video with natural motion and camera movement based on this image';
  }
}
