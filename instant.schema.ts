import { type InstaQLEntity, i } from '@instantdb/react';

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
    }),
    profiles: i.entity({
      clerkId: i.string().unique().indexed(),
      customerId: i.string().optional(),
      subscriptionId: i.string().optional(),
      productId: i.string().optional(),
      onboardedAt: i.number().optional(),
    }),
    projects: i.entity({
      name: i.string(),
      transcriptionModel: i.string(),
      visionModel: i.string(),
      createdAt: i.number().indexed(),
      updatedAt: i.number().optional(),
      content: i.json().optional(),
      image: i.string().optional(),
      welcomeProject: i.boolean().optional(),
    }),
  },
  links: {
    userProfiles: {
      forward: { on: 'profiles', has: 'one', label: 'user' },
      reverse: { on: '$users', has: 'one', label: 'profile' },
    },
    projectOwnership: {
      forward: { on: 'projects', has: 'one', label: 'owner' },
      reverse: { on: '$users', has: 'many', label: 'ownedProjects' },
    },
    projectMembership: {
      forward: { on: 'projects', has: 'many', label: 'members' },
      reverse: { on: '$users', has: 'many', label: 'memberProjects' },
    },
  },
  rooms: {
    projects: {
      presence: i.entity({
        cursor: i.json().optional(),
        selection: i.json().optional(),
        isEditing: i.boolean().optional(),
      }),
      topics: {
        canvasUpdate: i.entity({
          type: i.string(),
          nodeId: i.string().optional(),
          edgeId: i.string().optional(),
          data: i.json(),
          timestamp: i.number(),
        }),
      },
    },
  },
});

// This helps TypeScript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

// Export utility types for entities
export type Files = InstaQLEntity<AppSchema, '$files'>;
export type Users = InstaQLEntity<AppSchema, '$users'>;
export type Profiles = InstaQLEntity<AppSchema, 'profiles'>;
export type Projects = InstaQLEntity<AppSchema, 'projects'>;

export type { AppSchema };
export default schema;
