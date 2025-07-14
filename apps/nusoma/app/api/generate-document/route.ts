import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'

export const runtime = 'edge'

export async function POST(req: Request): Promise<Response> {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === '') {
    return new Response('Missing OPENAI_API_KEY - make sure to add it to your .env file.', {
      status: 400,
    })
  }

  try {
    const { prompt, documentType = 'general' } = await req.json()

    const systemPrompts = {
      general: `You are an AI writing assistant that creates well-formatted documents using Markdown syntax. 
                     Use proper headings (# ## ###), lists (- or 1.), **bold**, *italic*, \`code\`, > blockquotes, 
                     and other Markdown formatting to create professional, readable documents. 
                     Structure your response with clear sections and hierarchy.`,

      report: `You are an AI assistant that creates structured reports using Markdown formatting.
                    Include sections like: # Executive Summary, ## Introduction, ## Methodology, ## Findings, ## Conclusions.
                    Use tables, lists, and proper formatting for professional presentation.`,

      article: `You are an AI writing assistant that creates engaging articles using Markdown formatting.
                     Include a compelling title (# Title), introduction, body sections (## Section), and conclusion.
                     Use formatting for emphasis and readability.`,

      documentation: `You are an AI assistant that creates technical documentation using Markdown.
                           Include proper headings, code blocks (\`\`\`), numbered lists for procedures, 
                           and clear structure for technical content.`,
    }

    const system =
      systemPrompts[documentType as keyof typeof systemPrompts] || systemPrompts.general

    const result = await streamText({
      model: openai('gpt-4o-mini'),
      system,
      prompt: prompt,
      temperature: 0.7,
      maxTokens: 2000, // Increased for longer documents
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error('Error in generate-document API:', error)
    return new Response(JSON.stringify({ error: 'Failed to generate document' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
