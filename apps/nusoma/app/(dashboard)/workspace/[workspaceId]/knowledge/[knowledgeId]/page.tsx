import { KnowledgeBase } from './base'

interface PageProps {
  params: Promise<{
    knowledgeId: string
    workspaceId: string
  }>
  searchParams: Promise<{
    kbName?: string
  }>
}

export default async function KnowledgeBasePage({ params, searchParams }: PageProps) {
  const { knowledgeId } = await params
  const { kbName } = await searchParams

  return <KnowledgeBase id={knowledgeId} knowledgeBaseName={kbName || 'Knowledge Base'} />
}
