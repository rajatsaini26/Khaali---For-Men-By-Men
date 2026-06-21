import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import * as schema from './schema/sqlite';

const dbPath = process.env.SQLITE_DB_PATH ?? './khaali.db';
const resolvedPath = path.resolve(dbPath);

const sqlite = new Database(resolvedPath);

// Enable WAL mode for better concurrent read performance
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

export type DB = typeof db;
