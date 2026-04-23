import { neon } from '@neondatabase/serverless';
import nodeFetch from 'node-fetch';

if (!globalThis.fetch) {
  (globalThis as unknown as Record<string, unknown>).fetch = nodeFetch;
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const sql = neon(process.env.DATABASE_URL);
