export interface LabelInterface {
  id: string
  name: string
  color: string
}

export const labels: LabelInterface[] = [
  { id: 'research', name: 'Research', color: 'blue' },
  { id: 'planning', name: 'Planning', color: 'indigo' },
  { id: 'development', name: 'Development', color: 'green' },
  { id: 'design', name: 'Design', color: 'pink' },
  { id: 'review', name: 'Review', color: 'purple' },
  { id: 'bug', name: 'Bug Fix', color: 'red' },
  { id: 'content', name: 'Content', color: 'cyan' },
  { id: 'meeting', name: 'Meeting', color: 'yellow' },
  { id: 'maintenance', name: 'Maintenance', color: 'orange' },
  { id: 'admin', name: 'Administrative', color: 'gray' },
  { id: 'customer', name: 'Customer Support', color: 'teal' },
]
