import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Survey, SurveyResponse } from '../../shared/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, '../../data/db.json');

interface DatabaseSchema {
  surveys: Survey[];
  responses: SurveyResponse[];
}

const defaultData: DatabaseSchema = {
  surveys: [],
  responses: [],
};

let db: Low<DatabaseSchema> | null = null;

export async function getDb(): Promise<Low<DatabaseSchema>> {
  if (!db) {
    const adapter = new JSONFile<DatabaseSchema>(file);
    db = new Low(adapter, defaultData);
    await db.read();
  }
  return db;
}

export async function persist(): Promise<void> {
  if (db) {
    await db.write();
  }
}
