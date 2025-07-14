/** biome-ignore-all lint/performance/noImgElement: need it here */
'use client'

import { Badge } from '@nusoma/design-system/components/ui/badge'
import { Card } from '@nusoma/design-system/components/ui/card'
import {
  CalendarIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  FileIcon,
  ImageIcon,
  LinkIcon,
  MailIcon,
  MessageSquareIcon,
  SearchIcon,
  TableIcon,
  XCircleIcon,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface BlockOutputRendererProps {
  blockType: string
  output: any
  blockName?: string
}

interface FileItem {
  name: string
  type?: string
  size?: number
  url?: string
  content?: string
}

interface SearchResult {
  title: string
  link?: string
  url?: string
  snippet?: string
  description?: string
}

interface CalendarEvent {
  id?: string
  title?: string
  summary?: string
  start?: string
  end?: string
  location?: string
  attendees?: Array<{ email: string; name?: string }>
}

interface APIResponse {
  data: any
  status: number
  headers?: Record<string, string>
}

export function BlockOutputRenderer({ blockType, output, blockName }: BlockOutputRendererProps) {
  if (!output) {
    return <div className='text-muted-foreground text-sm italic'>No output generated</div>
  }

  // Agent Block
  if (blockType === 'agent') {
    // Handle wrapped response format
    const agentData = output.response || output

    if (typeof output === 'string') {
      return (
        <div className='space-y-3'>
          <div className='flex items-center gap-2'>
            <MessageSquareIcon className='size-4 text-blue-500' />
            <span className='font-medium text-sm'>Agent Response</span>
          </div>
          <div className='prose prose-sm dark:prose-invert max-w-none'>
            <ReactMarkdown>{output}</ReactMarkdown>
          </div>
        </div>
      )
    }

    if (agentData && (agentData.content || typeof agentData === 'string')) {
      const content = typeof agentData === 'string' ? agentData : agentData.content
      return (
        <div className='space-y-3'>
          <div className='flex items-center gap-2'>
            <MessageSquareIcon className='size-4 text-blue-500' />
            <span className='font-medium text-sm'>Agent Response</span>
            {agentData.model && (
              <Badge variant='outline' className='text-xs'>
                {agentData.model}
              </Badge>
            )}
          </div>
          <div className='prose prose-sm dark:prose-invert max-w-none'>
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
          {agentData.tokens && (
            <div className='flex items-center gap-4 text-muted-foreground text-xs'>
              {/* <span>Tokens: {agentData.tokens.total || (agentData.tokens.prompt + agentData.tokens.completion)}</span> */}
              {agentData.cost?.total && <span>Cost: ${agentData.cost.total.toFixed(4)}</span>}
            </div>
          )}
        </div>
      )
    }

    // If we have cost/token info but no content, show the metadata
    if (agentData && (agentData.cost || agentData.tokens || agentData.model)) {
      return (
        <div className='space-y-3'>
          <div className='flex items-center gap-2'>
            <MessageSquareIcon className='size-4 text-blue-500' />
            <span className='font-medium text-sm'>Agent Execution</span>
            {agentData.model && (
              <Badge variant='outline' className='text-xs'>
                {agentData.model}
              </Badge>
            )}
          </div>
          <div className='space-y-2'>
            {agentData.cost && (
              <div className='text-muted-foreground text-sm'>
                <span className='font-medium'>Cost:</span> $
                {agentData.cost.total?.toFixed(4) || 'N/A'}
                {agentData.cost.input && (
                  <span className='ml-2'>Input: ${agentData.cost.input.toFixed(4)}</span>
                )}
                {agentData.cost.output && (
                  <span className='ml-2'>Output: ${agentData.cost.output.toFixed(4)}</span>
                )}
              </div>
            )}
            {/* {agentData.tokens && (
                            <div className="text-muted-foreground text-sm">
                                <span className="font-medium">Tokens:</span> {agentData.tokens.total || (agentData.tokens.prompt + agentData.tokens.completion)}
                            </div>
                        )} */}
          </div>
        </div>
      )
    }
  }

  // API Block
  if (blockType === 'api') {
    const apiOutput = output as APIResponse
    return (
      <div className='space-y-3'>
        <div className='flex items-center gap-2'>
          <ExternalLinkIcon className='size-4 text-green-500' />
          <span className='font-medium text-sm'>API Response</span>
          <Badge
            variant={apiOutput.status >= 200 && apiOutput.status < 300 ? 'default' : 'destructive'}
          >
            {apiOutput.status}
          </Badge>
        </div>
        <div className='rounded bg-muted p-3'>
          <pre className='max-h-60 overflow-auto text-xs'>
            {JSON.stringify(apiOutput.data, null, 2)}
          </pre>
        </div>
      </div>
    )
  }

  // File Block
  if (blockType === 'file') {
    if (output.files && Array.isArray(output.files)) {
      return (
        <div className='space-y-3'>
          <div className='flex items-center gap-2'>
            <FileIcon className='size-4 text-orange-500' />
            <span className='font-medium text-sm'>Processed Files</span>
            <Badge variant='outline'>{output.files.length} files</Badge>
          </div>
          {output.combinedContent && (
            <div className='prose prose-sm dark:prose-invert max-w-none'>
              <ReactMarkdown>{`${output.combinedContent.substring(0, 500)}...`}</ReactMarkdown>
            </div>
          )}
        </div>
      )
    }
  }

  // Image Generator Block
  if (blockType === 'image_generator') {
    if (output.image) {
      return (
        <div className='space-y-3'>
          <div className='flex items-center gap-2'>
            <ImageIcon className='size-4 text-purple-500' />
            <span className='font-medium text-sm'>Generated Image</span>
          </div>
          <img
            src={output.image}
            alt='Generated image'
            className='h-auto max-w-full rounded-lg shadow-sm'
          />
        </div>
      )
    }
  }

  // Search blocks (Google, Exa, etc.)
  if (['google_search', 'exa', 'tavily'].includes(blockType)) {
    const results = output.items || output.results || []
    if (Array.isArray(results) && results.length > 0) {
      return (
        <div className='space-y-3'>
          <div className='flex items-center gap-2'>
            <SearchIcon className='size-4 text-blue-500' />
            <span className='font-medium text-sm'>Search Results</span>
            <Badge variant='outline'>{results.length} results</Badge>
          </div>
          <div className='space-y-2'>
            {results.slice(0, 3).map((item: any, index: number) => (
              <Card key={index} className='p-3'>
                <div className='space-y-1'>
                  <h4 className='line-clamp-1 font-medium text-sm'>{item.title}</h4>
                  <p className='line-clamp-2 text-muted-foreground text-xs'>
                    {item.snippet || item.description}
                  </p>
                  {(item.link || item.url) && (
                    <p className='truncate text-blue-600 text-xs'>{item.link || item.url}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )
    }
  }

  // Gmail/Email blocks
  if (['gmail', 'outlook'].includes(blockType)) {
    return (
      <div className='space-y-3'>
        <div className='flex items-center gap-2'>
          <MailIcon className='size-4 text-red-500' />
          <span className='font-medium text-sm'>Email</span>
          <CheckCircleIcon className='size-4 text-green-500' />
        </div>
        <div className='text-muted-foreground text-sm'>
          {output.content || 'Email operation completed successfully'}
        </div>
      </div>
    )
  }

  // Calendar blocks
  if (['google_calendar'].includes(blockType)) {
    return (
      <div className='space-y-3'>
        <div className='flex items-center gap-2'>
          <CalendarIcon className='size-4 text-blue-500' />
          <span className='font-medium text-sm'>Calendar Event</span>
          <CheckCircleIcon className='size-4 text-green-500' />
        </div>
        <div className='text-muted-foreground text-sm'>
          {output.content || 'Calendar operation completed successfully'}
        </div>
      </div>
    )
  }

  // Spreadsheet blocks
  if (['google_sheets', 'airtable', 'microsoft_excel'].includes(blockType)) {
    return (
      <div className='space-y-3'>
        <div className='flex items-center gap-2'>
          <TableIcon className='size-4 text-green-500' />
          <span className='font-medium text-sm'>Spreadsheet</span>
          <CheckCircleIcon className='size-4 text-green-500' />
        </div>
        {output.updatedRows && (
          <div className='text-muted-foreground text-sm'>Updated {output.updatedRows} rows</div>
        )}
        {output.data && Array.isArray(output.data) && (
          <div className='text-muted-foreground text-sm'>
            Retrieved {output.data.length} records
          </div>
        )}
      </div>
    )
  }

  // Function Block
  if (blockType === 'function') {
    return (
      <div className='space-y-3'>
        <div className='flex items-center gap-2'>
          <span className='text-orange-500'>⚡</span>
          <span className='font-medium text-sm'>Function Result</span>
        </div>
        <div className='rounded bg-muted p-3'>
          <pre className='max-h-40 overflow-auto text-xs'>
            {typeof output.result === 'string'
              ? output.result
              : JSON.stringify(output.result, null, 2)}
          </pre>
        </div>
      </div>
    )
  }

  // Web scraping blocks
  if (['firecrawl', 'jina'].includes(blockType)) {
    const content = output.content || output.markdown
    if (content) {
      return (
        <div className='space-y-3'>
          <div className='flex items-center gap-2'>
            <LinkIcon className='size-4 text-green-500' />
            <span className='font-medium text-sm'>Web Content</span>
          </div>
          <div className='prose prose-sm dark:prose-invert max-w-none'>
            <ReactMarkdown>{`${content.substring(0, 500)}...`}</ReactMarkdown>
          </div>
        </div>
      )
    }
  }

  // Knowledge blocks
  if (blockType === 'knowledge') {
    if (output.results && Array.isArray(output.results)) {
      return (
        <div className='space-y-3'>
          <div className='flex items-center gap-2'>
            <SearchIcon className='size-4 text-teal-500' />
            <span className='font-medium text-sm'>Knowledge Search</span>
            <Badge variant='outline'>{output.results.length} results</Badge>
          </div>
          <div className='space-y-2'>
            {output.results.slice(0, 2).map((result: any, index: number) => (
              <Card key={index} className='p-3'>
                <div className='space-y-1'>
                  <div className='flex items-center justify-between'>
                    <span className='font-medium text-sm'>
                      Score: {(result.score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className='line-clamp-3 text-muted-foreground text-xs'>{result.content}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )
    }
  }

  // Generic success/failure
  if (typeof output.success === 'boolean') {
    return (
      <div className='space-y-3'>
        <div className='flex items-center gap-2'>
          {output.success ? (
            <CheckCircleIcon className='size-4 text-green-500' />
          ) : (
            <XCircleIcon className='size-4 text-red-500' />
          )}
          <span className='font-medium text-sm'>
            {blockName || blockType} - {output.success ? 'Success' : 'Failed'}
          </span>
        </div>
        {output.message && <div className='text-muted-foreground text-sm'>{output.message}</div>}
      </div>
    )
  }

  // Default fallback
  if (typeof output === 'string') {
    return (
      <div className='prose prose-sm dark:prose-invert max-w-none'>
        <ReactMarkdown>{output}</ReactMarkdown>
      </div>
    )
  }

  if (output.content && typeof output.content === 'string') {
    return (
      <div className='prose prose-sm dark:prose-invert max-w-none'>
        <ReactMarkdown>{output.content}</ReactMarkdown>
      </div>
    )
  }

  // Final fallback to JSON
  return (
    <div className='rounded bg-muted p-3'>
      <pre className='max-h-60 overflow-auto text-xs'>{JSON.stringify(output, null, 2)}</pre>
    </div>
  )
}
