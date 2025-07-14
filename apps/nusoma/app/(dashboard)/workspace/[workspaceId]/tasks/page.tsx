import { TasksClient } from './components/tasks-client'

export default async function WorkspaceTasksPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params

  return <TasksClient workspaceId={workspaceId} />
}
