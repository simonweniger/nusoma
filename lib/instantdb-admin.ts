import { init } from '@instantdb/admin';
import schema from '../instant.schema';
import { env } from './env';

// Initialize InstantDB admin client for server-side operations
export const adminDb = init({
  appId: env.NEXT_PUBLIC_INSTANT_APP_ID,
  adminToken: env.INSTANT_ADMIN_TOKEN,
  schema,
});

export default adminDb;
