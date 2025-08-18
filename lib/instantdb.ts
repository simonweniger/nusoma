import { init } from '@instantdb/react';
import schema from '../instant.schema';
import { env } from './env';

const APP_ID = env.NEXT_PUBLIC_INSTANT_APP_ID;

export const db = init({
  appId: APP_ID,
  schema,
  devtool: process.env.NODE_ENV === 'development',
});

export default db;
export type { AppSchema } from '../instant.schema';
