'use client'

import { useEffect, useRef, useState } from 'react'
import { type ActionType, ActorType } from '@nusoma/database/schema'
import { supabase } from '@nusoma/database/supabase'
import type { ProfileDto } from '@nusoma/types/dtos/profile-dto'
import type { TaskDto } from '@nusoma/types/dtos/task-dto'
import type {
  ActivityTimelineEventDto,
  BlockExecutionTimelineEventDto,
  CommentTimelineEventDto,
  TimelineEventDto,
} from '@nusoma/types/dtos/timeline-event-dto'
import { TaskActivity } from './task-activity'

interface TaskActivityClientProps {
  task: TaskDto
  profile: ProfileDto
  serverEvents: TimelineEventDto[]
}

export function TaskActivityClient({ task, profile, serverEvents }: TaskActivityClientProps) {
  const [events, setEvents] = useState<(TimelineEventDto | CommentTimelineEventDto)[]>([])
  const subscriptionsRef = useRef<{ activity?: any; comment?: any }>({})

  const activityChannelName = `task-activity-${task.id}`
  const commentChannelName = `task-comment-${task.id}`

  useEffect(() => {
    // Prevent duplicate subscriptions
    if (subscriptionsRef.current.activity || subscriptionsRef.current.comment) {
      return
    }

    const handleActivityRealtimeUpdate = async (payload: any) => {
      if (payload.eventType === 'INSERT') {
        const newRecord = payload.new

        let actorName = 'System'
        let actorImage: string | undefined

        if (newRecord.actorType === ActorType.MEMBER) {
          if (newRecord.actorId === profile.id) {
            actorName = profile.name
            actorImage = profile.image
          } else {
            actorName = 'User'
          }
        }

        let newEvent: ActivityTimelineEventDto | BlockExecutionTimelineEventDto

        if (newRecord.actionType === 'blockExecuted') {
          const metadata = newRecord.metadata as {
            executionId: string
            totalBlocks: number
            failedBlocks: number
            successfulBlocks: number
          }

          newEvent = {
            id: newRecord.id,
            projectId: task.projectId || '',
            type: 'block-execution',
            executionId: metadata.executionId,
            totalBlocks: metadata.totalBlocks,
            failedBlocks: metadata.failedBlocks,
            successfulBlocks: metadata.successfulBlocks,
            occurredAt: new Date(newRecord.occurredAt),
            actor: {
              id: newRecord.actorId,
              name: actorName,
              image: actorImage,
            },
          } as BlockExecutionTimelineEventDto
        } else {
          newEvent = {
            id: newRecord.id,
            projectId: task.projectId || '',
            type: 'activity',
            actionType: newRecord.actionType as ActionType,
            metadata: newRecord.metadata,
            occurredAt: new Date(newRecord.occurredAt),
            actor: {
              id: newRecord.actorId,
              name: actorName,
              image: actorImage,
            },
          } as ActivityTimelineEventDto
        }

        setEvents((currentEvents) => {
          const eventExists = currentEvents.some((e) => e.id === newRecord.id)
          if (eventExists) {
            return currentEvents
          }

          const updatedEvents = [newEvent, ...currentEvents].sort((a, b) => {
            const aTime = a.type === 'comment' ? a.createdAt : a.occurredAt
            const bTime = b.type === 'comment' ? b.createdAt : b.occurredAt
            return new Date(bTime).getTime() - new Date(aTime).getTime()
          })

          return updatedEvents
        })
      } else if (payload.eventType === 'UPDATE') {
        const updatedRecord = payload.new

        setEvents((currentEvents) =>
          currentEvents.map((event) => {
            if (event.id === updatedRecord.id && event.type === 'activity') {
              return {
                ...event,
                actionType: updatedRecord.actionType as ActionType,
                metadata: updatedRecord.metadata,
                occurredAt: new Date(updatedRecord.occurredAt),
              } as ActivityTimelineEventDto
            }
            return event
          })
        )
      } else if (payload.eventType === 'DELETE') {
        const oldRecord = payload.old
        setEvents((currentEvents) => currentEvents.filter((event) => event.id !== oldRecord.id))
      }
    }

    const handleCommentRealtimeUpdate = async (payload: any) => {
      if (payload.eventType === 'INSERT') {
        const newRecord = payload.new

        let senderName = 'User'
        let senderImage: string | undefined

        if (newRecord.userId === profile.id) {
          senderName = profile.name
          senderImage = profile.image
        }

        // Parse timestamp with explicit UTC handling to match server behavior
        // The database returns timestamps without timezone info, so we treat them as UTC
        const createdAtString = newRecord.createdAt
        const updatedAtString = newRecord.updatedAt

        // Add 'Z' suffix to ensure UTC parsing if not already present
        const createdAtUTC = createdAtString.endsWith('Z') ? createdAtString : `${createdAtString}Z`
        const updatedAtUTC = updatedAtString.endsWith('Z') ? updatedAtString : `${updatedAtString}Z`

        const createdAt = new Date(createdAtUTC)
        const updatedAt = new Date(updatedAtUTC)

        const newEvent: CommentTimelineEventDto = {
          id: newRecord.id,
          projectId: task.projectId || '',
          type: 'comment',
          text: newRecord.text,
          edited: false,
          createdAt,
          updatedAt,
          sender: {
            id: newRecord.userId,
            name: senderName,
            image: senderImage,
          },
        }

        setEvents((currentEvents) => {
          const eventExists = currentEvents.some((e) => e.id === newRecord.id)
          if (eventExists) {
            return currentEvents
          }

          const updatedEvents = [newEvent, ...currentEvents].sort((a, b) => {
            const aTime = 'occurredAt' in a ? a.occurredAt : a.createdAt
            const bTime = 'occurredAt' in b ? b.occurredAt : b.createdAt
            return new Date(bTime).getTime() - new Date(aTime).getTime()
          })

          return updatedEvents
        })
      } else if (payload.eventType === 'UPDATE') {
        const updatedRecord = payload.new

        setEvents((currentEvents) =>
          currentEvents.map((event) => {
            if (event.id === updatedRecord.id && event.type === 'comment') {
              const isEdited =
                new Date(updatedRecord.createdAt).getTime() !==
                new Date(updatedRecord.updatedAt).getTime()

              return {
                ...event,
                text: updatedRecord.text,
                edited: isEdited,
                updatedAt: new Date(updatedRecord.updatedAt),
              } as CommentTimelineEventDto
            }
            return event
          })
        )
      } else if (payload.eventType === 'DELETE') {
        const oldRecord = payload.old
        setEvents((currentEvents) => currentEvents.filter((event) => event.id !== oldRecord.id))
      }
    }

    const activityChannel = supabase
      .channel(activityChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'taskActivity',
          filter: `taskId=eq.${task.id}`,
        },
        handleActivityRealtimeUpdate
      )
      .subscribe()

    const commentChannel = supabase
      .channel(commentChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'taskComment',
          filter: `taskId=eq.${task.id}`,
        },
        handleCommentRealtimeUpdate
      )
      .subscribe()

    // Store references to prevent duplicate subscriptions
    subscriptionsRef.current = { activity: activityChannel, comment: commentChannel }

    return () => {
      activityChannel.unsubscribe()
      commentChannel.unsubscribe()
      subscriptionsRef.current = {}
    }
  }, [task.id, task.projectId, profile.id, profile.name, profile.image])

  return <TaskActivity profile={profile} task={task} events={events} />
}
