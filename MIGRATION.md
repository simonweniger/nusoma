# Migration from Supabase to InstantDB with Clerk Auth

This guide outlines the complete migration process from Supabase with Supabase Auth to InstantDB with Clerk authentication.

## Overview

The migration includes:

- ✅ InstantDB integration with real-time features
- ✅ Clerk authentication setup
- ✅ Optimized ReactFlow canvas performance
- ✅ Real-time collaboration features
- ✅ Data migration scripts

## Prerequisites

1. **InstantDB Account**: Create an account at [instantdb.com](https://instantdb.com)
2. **Clerk Account**: Create an account at [clerk.com](https://clerk.com)
3. **Environment Variables**: Set up the required environment variables

## Environment Variables

Add these to your `.env.local`:

```bash
# InstantDB
NEXT_PUBLIC_INSTANT_APP_ID=your_instant_app_id
INSTANT_ADMIN_TOKEN=your_admin_token_for_migration

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
NEXT_PUBLIC_CLERK_CLIENT_NAME=your_clerk_client_name_from_instantdb
CLERK_SECRET_KEY=your_clerk_secret_key

# Keep existing Supabase vars for migration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Installation

Install new dependencies:

```bash
bun add @instantdb/react @clerk/clerk-react @clerk/nextjs
```

## Migration Steps

### 1. Set up InstantDB App

1. Create an app at [instantdb.com](https://instantdb.com)
2. Copy your App ID to `NEXT_PUBLIC_INSTANT_APP_ID`
3. Generate an admin token for migration to `INSTANT_ADMIN_TOKEN`

### 2. Set up Clerk Authentication

1. Create an app at [clerk.com](https://clerk.com)
2. Configure your authentication methods (email/password, OAuth, etc.)
3. **Configure session token**: In Clerk Dashboard → Sessions → Customize session token, add:

   ```json
   {
     "email": "{{user.primary_email_address}}"
   }
   ```

4. **Connect with InstantDB**: In InstantDB dashboard → Auth tab → Setup Clerk → Add your Clerk Publishable Key
5. Copy your publishable key to `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
6. Copy your secret key to `CLERK_SECRET_KEY`
7. Copy the **Client Name** from InstantDB to `NEXT_PUBLIC_CLERK_CLIENT_NAME`

### 3. Run Data Migration

```bash
node scripts/migrate-to-instantdb.js
```

This script will:

- Export your projects and profiles from Supabase
- Transform the data to match InstantDB schema
- Import the data into InstantDB

### 4. Update Your Code

Replace existing imports and components:

#### Auth Components

- Replace Supabase auth components with Clerk components
- Update authentication hooks to use `useAuth` from `@/hooks/use-auth`

#### Data Operations

- Replace Drizzle queries with InstantDB queries using `db.useQuery`
- Replace database mutations with `db.transact`

#### Real-time Features

- Use InstantDB rooms for presence and real-time collaboration
- Canvas updates are now real-time with optimistic updates

### 5. Switch to New Components

Update your main project page:

```tsx
// Replace
import { Project } from '@/app/(authenticated)/projects/[projectId]/page';

// With
import { Project } from '@/app/(authenticated)/projects/[projectId]/page-instant';
```

Update canvas component:

```tsx
// Replace
import { Canvas } from '@/components/canvas';

// With
import { Canvas } from '@/components/canvas-instant';
```

Update project provider:

```tsx
// Replace
import { ProjectProvider } from '@/providers/project';

// With
import { ProjectProvider } from '@/providers/project-instant';
```

## Key Improvements

### Performance Optimizations

1. **Faster Real-time Updates**: InstantDB provides subsecond latency for data updates
2. **Optimistic Updates**: UI updates immediately, with conflict resolution
3. **Reduced Debounce Time**: Canvas saves every 300ms instead of 1000ms
4. **Efficient Queries**: Only fetch necessary data with InstantDB's query optimization

### Real-time Collaboration

1. **Presence Awareness**: See who's online in real-time
2. **Live Cursors**: See other users' cursors and selections
3. **Collaborative Editing**: Multiple users can edit the same canvas simultaneously
4. **Conflict Resolution**: Automatic handling of concurrent edits

### Enhanced Developer Experience

1. **Type Safety**: Full TypeScript support with generated types
2. **Schema as Code**: Define your data schema in TypeScript
3. **Built-in Devtools**: Debug queries and mutations easily
4. **Auto-generated APIs**: No need to write backend APIs for CRUD operations

## Schema Mapping

| Supabase Table | InstantDB Entity | Changes |
|----------------|------------------|---------|
| `project` | `projects` | Snake_case to camelCase field names |
| `profile` | `profiles` | Snake_case to camelCase field names |
| `auth.users` | `$users` | Managed by InstantDB auth |

## Migration Checklist

- [ ] Set up InstantDB app and copy App ID
- [ ] Set up Clerk app and copy API keys
- [ ] Update environment variables
- [ ] Run data migration script
- [ ] Test authentication flow
- [ ] Test project loading and saving
- [ ] Test real-time collaboration features
- [ ] Update deployment environment variables
- [ ] Remove old Supabase dependencies (optional)

## Testing

1. **Authentication**: Test sign-in, sign-up, and sign-out flows
2. **Project Loading**: Verify projects load correctly from InstantDB
3. **Real-time Updates**: Test that changes sync across browser tabs
4. **Canvas Performance**: Ensure ReactFlow remains responsive
5. **Collaboration**: Test with multiple users editing simultaneously

## Rollback Plan

If you need to rollback:

1. Keep the original files (they're preserved with `-instant` suffixes)
2. Restore original authentication components
3. Switch back to Supabase database queries
4. Update environment variables to remove InstantDB/Clerk

## Support

- [InstantDB Documentation](https://instantdb.com/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [InstantDB Discord](https://discord.gg/instantdb)
- [Clerk Discord](https://discord.gg/clerk)

## Performance Monitoring

Monitor these metrics after migration:

1. **Query Response Time**: Should be <100ms with InstantDB
2. **Real-time Latency**: Updates should appear in <300ms
3. **Canvas Frame Rate**: Should maintain 60fps during editing
4. **Memory Usage**: Monitor for memory leaks in long sessions

## Next Steps

After successful migration:

1. **Remove Old Dependencies**: Clean up Supabase packages
2. **Add Advanced Features**: Implement advanced collaboration features
3. **Optimize Further**: Fine-tune real-time update frequencies
4. **Monitor Performance**: Set up monitoring for the new stack
