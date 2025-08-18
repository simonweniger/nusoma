# InstantDB Migration Checklist

Follow this checklist to complete your migration from Supabase to InstantDB with Clerk authentication.

## Pre-Migration Setup

### 1. Create InstantDB App

- [ ] Visit [instantdb.com](https://instantdb.com) and create an account
- [ ] Create a new app
- [ ] Copy your App ID
- [ ] Generate an admin token for migration

### 2. Set up Clerk Authentication  

- [ ] Visit [clerk.com](https://clerk.com) and create an account
- [ ] Create a new application
- [ ] Configure your desired authentication methods (email/password, OAuth, etc.)
- [ ] **Configure session token**: In Clerk Dashboard → Sessions → Customize session token, add:

  ```json
  {
    "email": "{{user.primary_email_address}}"
  }
  ```

- [ ] **Set up InstantDB in Clerk**: In InstantDB dashboard → Auth tab → Setup Clerk → Add your Clerk Publishable Key
- [ ] Copy your publishable key, secret key, and **Client Name** from InstantDB

### 3. Update Environment Variables

Add these to your `.env.local` file:

```bash
# InstantDB
NEXT_PUBLIC_INSTANT_APP_ID=your_instant_app_id_here
INSTANT_ADMIN_TOKEN=your_admin_token_here

# Clerk  
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_CLERK_CLIENT_NAME=your_client_name_from_instantdb
CLERK_SECRET_KEY=sk_test_...
```

## Migration Process

### 4. Install Dependencies

- [ ] Run: `bun install` to install new dependencies (@instantdb/react, @clerk/nextjs, etc.)

### 5. Run Data Migration

- [ ] Run: `bun run migrate:instantdb` to migrate your data from Supabase to InstantDB
- [ ] Verify the migration completed successfully

### 6. Test New Authentication

- [ ] Test sign-in at `/sign-in`
- [ ] Test sign-up at `/sign-up`  
- [ ] Verify users are created in both Clerk and InstantDB

### 7. Switch to New Components

#### Update Project Page

Replace `app/(authenticated)/projects/[projectId]/page.tsx` with the new version:

- [ ] Backup original file
- [ ] Replace with content from `page-instant.tsx`

#### Update Canvas Component  

Replace `components/canvas.tsx` with the optimized version:

- [ ] Backup original file
- [ ] Replace with content from `canvas-instant.tsx`

#### Update Project Provider

Replace `providers/project.tsx` with the real-time version:

- [ ] Backup original file  
- [ ] Replace with content from `project-instant.tsx`

#### Update Authenticated Layout

Replace `app/(authenticated)/layout.tsx` with the new auth version:

- [ ] Backup original file
- [ ] Replace with content from `layout-instant.tsx`

### 8. Test Core Functionality

- [ ] Test project loading
- [ ] Test project saving (should be much faster now!)
- [ ] Test canvas interactions (node creation, editing, connections)
- [ ] Test real-time updates (open same project in multiple tabs)

## Performance Validation

### 9. Verify Performance Improvements

- [ ] Canvas saves should happen in ~300ms (was 1000ms)
- [ ] Real-time updates should appear across tabs instantly
- [ ] No noticeable lag when editing large canvases
- [ ] Check browser dev tools for any errors

### 10. Test Real-time Collaboration (Optional)

- [ ] Open the same project in multiple browsers/users
- [ ] Verify changes sync in real-time
- [ ] Test presence indicators work
- [ ] Test conflict resolution

## Post-Migration Cleanup

### 11. Update Authentication Flows

- [ ] Update any components that use `useUser()` to use the new auth hook
- [ ] Update any server-side auth checks to use Clerk
- [ ] Remove references to Supabase auth

### 12. Remove Legacy Dependencies (Optional)

If migration is successful and you want to fully commit:

- [ ] Remove `@supabase/supabase-js` from package.json
- [ ] Remove `@supabase/ssr` from package.json  
- [ ] Remove Supabase environment variables
- [ ] Remove legacy auth components in `app/auth/`
- [ ] Remove `lib/supabase/` directory

## Deployment

### 13. Update Production Environment

- [ ] Add InstantDB environment variables to your hosting platform
- [ ] Add Clerk environment variables  
- [ ] Update Clerk allowed domains for production
- [ ] Test authentication flows in production
- [ ] Monitor performance and error rates

## Verification Commands

```bash
# Test the migration
bun run dev

# Check for linting issues  
bun run lint

# Build to ensure no TypeScript errors
bun run build
```

## Rollback Plan

If something goes wrong:

- [ ] Restore original files from backups
- [ ] Remove new environment variables
- [ ] Restart development server
- [ ] Your data is safely preserved in both systems

## Success Criteria

✅ **Migration is successful when:**

- Users can sign in/up with Clerk
- Projects load from InstantDB  
- Canvas performs smoothly with real-time updates
- No console errors or TypeScript issues
- Performance feels noticeably faster

## Need Help?

- 📚 [InstantDB Docs](https://instantdb.com/docs)
- 📚 [Clerk Docs](https://clerk.com/docs)  
- 💬 [InstantDB Discord](https://discord.gg/instantdb)
- 💬 [Clerk Discord](https://discord.gg/clerk)

**Estimated Migration Time:** 30-60 minutes
