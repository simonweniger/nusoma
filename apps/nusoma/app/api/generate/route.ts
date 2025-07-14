import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { match } from 'ts-pattern'

export const runtime = 'edge'

export async function POST(req: Request): Promise<Response> {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === '') {
    return new Response('Missing OPENAI_API_KEY - make sure to add it to your .env file.', {
      status: 400,
    })
  }

  try {
    const { prompt, option, command } = await req.json()

    const { system, user } = match(option)
      .with('continue', () => ({
        system:
          'You are an AI writing assistant that continues existing text based on context from prior text. ' +
          'Give more weight/priority to the later characters than the beginning ones. ' +
          'Limit your response to no more than 200 characters, but make sure to construct complete sentences. ' +
          'Write in plain text without any special formatting.',
        user: prompt,
      }))
      .with('improve', () => ({
        system:
          'You are an AI writing assistant that improves existing text. ' +
          'Limit your response to no more than 200 characters, but make sure to construct complete sentences. ' +
          'Write in plain text without any special formatting.',
        user: `The existing text is: ${prompt}`,
      }))
      .with('shorter', () => ({
        system:
          'You are an AI writing assistant that shortens existing text. ' +
          'Write in plain text without any special formatting.',
        user: `The existing text is: ${prompt}`,
      }))
      .with('longer', () => ({
        system:
          'You are an AI writing assistant that lengthens existing text. ' +
          'Write in plain text without any special formatting.',
        user: `The existing text is: ${prompt}`,
      }))
      .with('fix', () => ({
        system:
          'You are an AI writing assistant that fixes grammar and spelling errors in existing text. ' +
          'Limit your response to no more than 200 characters, but make sure to construct complete sentences. ' +
          'Write in plain text without any special formatting.',
        user: `The existing text is: ${prompt}`,
      }))
      .with('zap', () => ({
        system:
          'You are an AI writing assistant that generates text based on a prompt. ' +
          'You take an input from the user and a command for manipulating the text. ' +
          'Write in plain text without any special formatting.',
        user: `For this text: ${prompt}. You have to respect the command: ${command}`,
      }))
      .otherwise(() => ({
        system:
          'You are a helpful AI writing assistant. Write in plain text without any special formatting.',
        user: prompt || 'Continue writing...',
      }))

    const result = await streamText({
      model: openai('gpt-4o-mini'),
      system,
      prompt: user,
      temperature: 0.7,
      maxTokens: 500,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error('Error in generate API:', error)
    return new Response(JSON.stringify({ error: 'Failed to generate text' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
