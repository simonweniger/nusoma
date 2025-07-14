/** biome-ignore-all lint/complexity/noStaticOnlyClass: We need to use static methods */
export enum UserCacheKey {
  Profile = 0,
  Preferences = 1,
  Workspaces = 2,
  ProjectIsInFavorites = 3,
  TaskIsInFavorites = 4,
  Projects = 5,
  ProjectTags = 6,
  Project = 7,
  ProjectNotes = 8,
  ProjectTimelineEvents = 9,
  Workers = 10,
  Worker = 12,
  WorkerIsInFavorites = 13,
  WorkerTimelineEvents = 15,
  WorkerNotes = 16,
  WorkerTasks = 17,
  TaskNotes = 18,
  TaskTags = 19,
  Favorites = 20,
  TaskTimelineEvents = 21,
  TaskActivity = 22,
  UserWorkers = 23,
  Task = 24,
  Tasks = 25,
}

//TODO: Add OrganizationCacheKey
//TODO: Add WorkspaceCacheKey

export class Caching {
  private static readonly USER_PREFIX = 'user'

  private static joinKeyParts(...parts: string[]): string[] {
    return parts.filter((part) => part.length > 0)
  }

  private static joinTagParts(...parts: string[]): string {
    return parts.filter((part) => part.length > 0).join(':')
  }

  public static createUserKeyParts(
    key: UserCacheKey,
    userId: string,
    ...additionalKeyParts: string[]
  ): string[] {
    if (!userId) {
      throw new Error('User ID cannot be empty')
    }
    return Caching.joinKeyParts(
      Caching.USER_PREFIX,
      userId,
      UserCacheKey[key].toLowerCase(),
      ...additionalKeyParts
    )
  }

  public static createUserTag(
    key: UserCacheKey,
    userId: string,
    ...additionalTagParts: string[]
  ): string {
    if (!userId) {
      throw new Error('User ID cannot be empty')
    }
    return Caching.joinTagParts(
      Caching.USER_PREFIX,
      userId,
      UserCacheKey[key].toLowerCase(),
      ...additionalTagParts
    )
  }
}

export const defaultRevalidateTimeInSeconds = process.env.NODE_ENV === 'production' ? 3600 : 120
