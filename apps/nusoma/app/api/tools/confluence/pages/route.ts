import { NextResponse } from 'next/server'
import { getConfluenceCloudId } from '@/tools/confluence/utils'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const {
      domain,
      accessToken,
      title,
      cloudId: providedCloudId,
      limit = 50,
    } = await request.json()

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 })
    }

    // Use provided cloudId or fetch it if not provided
    const cloudId = providedCloudId || (await getConfluenceCloudId(domain, accessToken))

    // Build the URL with query parameters
    const baseUrl = `https://api.atlassian.com/ex/confluence/${cloudId}/wiki/api/v2/pages`
    const queryParams = new URLSearchParams()

    if (limit) {
      queryParams.append('limit', limit.toString())
    }

    if (title) {
      queryParams.append('title', title)
    }

    const queryString = queryParams.toString()
    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl

    // Make the request to Confluence API with OAuth Bearer token
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      let errorMessage

      try {
        const errorData = await response.json()
        errorMessage = errorData.message || `Failed to fetch Confluence pages (${response.status})`
      } catch (_e) {
        // Try to get the response text for more context
        try {
          const _text = await response.text()
          errorMessage = `Failed to fetch Confluence pages: ${response.status} ${response.statusText}`
        } catch (_textError) {
          errorMessage = `Failed to fetch Confluence pages: ${response.status} ${response.statusText}`
        }
      }

      return NextResponse.json({ error: errorMessage }, { status: response.status })
    }

    const data = await response.json()

    if (data.results && data.results.length > 0) {
      for (const _page of data.results.slice(0, 3)) {
      }
    }

    return NextResponse.json({
      files: data.results.map((page: any) => ({
        id: page.id,
        name: page.title,
        mimeType: 'confluence/page',
        url: page._links?.webui || '',
        modifiedTime: page.version?.createdAt || '',
        spaceId: page.spaceId,
        webViewLink: page._links?.webui || '',
      })),
    })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    )
  }
}
