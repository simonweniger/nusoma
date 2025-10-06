# InstantDB Authentication Setup

This project now includes complete authentication setup with InstantDB supporting:

- **Magic Code Authentication** (Email-based passwordless login)
- **Google OAuth**
- **Apple Sign In**

## Environment Variables

Add these to your `.env.local` file:

```env
# InstantDB Configuration
NEXT_PUBLIC_INSTANT_APP_ID=your_instant_app_id_here

# Google OAuth Configuration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
NEXT_PUBLIC_GOOGLE_CLIENT_NAME=your_google_client_name_here

# Apple Sign In Configuration
NEXT_PUBLIC_APPLE_CLIENT_ID=your_apple_services_id_here
NEXT_PUBLIC_APPLE_CLIENT_NAME=your_apple_client_name_here
```

## Setup Instructions

### 1. InstantDB Setup

1. Go to [InstantDB Dashboard](https://instantdb.com/dash)
2. Create a new app or use existing one
3. Copy your App ID to `NEXT_PUBLIC_INSTANT_APP_ID`

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `https://api.instantdb.com/runtime/oauth/callback`
4. Copy Client ID to `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
5. In InstantDB dashboard, add Google OAuth client with your Client ID
6. Copy the client name from InstantDB to `NEXT_PUBLIC_GOOGLE_CLIENT_NAME`

### 3. Apple Sign In Setup

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Create a Services ID for Sign in with Apple
3. Add domain and redirect URL: `https://api.instantdb.com/runtime/oauth/callback`
4. Copy Services ID to `NEXT_PUBLIC_APPLE_CLIENT_ID`
5. In InstantDB dashboard, add Apple OAuth client
6. Copy the client name from InstantDB to `NEXT_PUBLIC_APPLE_CLIENT_NAME`

## File Structure

```
src/
├── app/
│   ├── (authenticated)/          # Protected routes
│   │   ├── layout.tsx           # Layout for authenticated pages
│   │   └── dashboard/
│   │       └── page.tsx         # Main dashboard
│   ├── (unauthenticated)/       # Public routes
│   │   ├── layout.tsx           # Layout for public pages
│   │   └── auth/
│   │       ├── signin.tsx       # Sign in page
│   │       └── signup.tsx       # Sign up page
│   └── layout.tsx               # Root layout
├── components/
│   └── ui/
│       └── separator.tsx        # UI separator component
├── lib/
│   └── db.ts                    # InstantDB client instance
└── providers/
    ├── auth-provider.tsx        # Authentication context + routing + InstantDB gating
    └── database-provider.tsx    # Database context
```

## Usage

### Authentication Flow

1. **Integrated auth gating** in `auth-provider.tsx` using `<db.SignedIn>` and `<db.SignedOut>`
2. **Smart routing** - automatic redirects based on authentication status
3. Users can sign in with:
   - Magic code (email)
   - Google OAuth
   - Apple Sign In
4. **Real-time updates** - InstantDB handles auth state changes automatically
5. **Clean architecture** - all auth logic centralized in one provider

### Using Authentication in Components

```tsx
import { useAuth } from "@/providers/auth-provider";

function MyComponent() {
  const { user, profile, isLoading, error } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return <div>Not authenticated</div>;

  return <div>Hello {user.email}!</div>;
}
```

### Database Operations

```tsx
import { useDatabase } from "@/providers/database-provider";

function MyComponent() {
  const { db } = useDatabase();

  // Query data
  const { data } = db.useQuery({
    conversations: {
      $: { where: { "user.id": user.id } },
    },
  });

  // Write data
  const handleCreate = () => {
    db.transact(
      db.tx.conversations[id()]
        .update({
          name: "New Conversation",
          createdAt: new Date(),
        })
        .link({ user: user.id }),
    );
  };
}
```

## Features

- ✅ **InstantDB-native authentication** using `<db.SignedIn>` and `<db.SignedOut>`
- ✅ Magic code authentication (passwordless)
- ✅ Google OAuth integration
- ✅ Apple Sign In integration
- ✅ Automatic user profile creation
- ✅ Real-time auth state updates
- ✅ Session management for unauthenticated users
- ✅ Client-side route protection with redirects
- ✅ TypeScript support
- ✅ Modern UI with Tailwind CSS

## Next Steps

1. Configure your OAuth providers in their respective consoles
2. Set up your environment variables
3. Test the authentication flow
4. Customize the UI and add your app-specific features
