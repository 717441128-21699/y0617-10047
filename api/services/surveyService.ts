import { getDb, persist } from '../db/index.js';
import { generateId, generateToken } from '../utils/id.js';
import type { Survey, SurveyListItem, SurveySettings, Question } from '../../shared/types.js';

export async function getAllSurveys(): Promise<SurveyListItem[]> {
  const db = await getDb();
  return db.data.surveys.map((s) => ({
    id: s.id,
    token: s.token,
    title: s.title,
    status: s.status,
    responseCount: db.data.responses.filter((r) => r.surveyId === s.id).length,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
}

export async function getSurveyById(id: string): Promise<Survey | undefined> {
  const db = await getDb();
  return db.data.surveys.find((s) => s.id === id);
}

export async function getSurveyByToken(token: string): Promise<Survey | undefined> {
  const db = await getDb();
  return db.data.surveys.find((s) => s.token === token);
}

export async function createSurvey(title: string): Promise<Survey> {
  const db = await getDb();
  const now = new Date().toISOString();
  const survey: Survey = {
    id: generateId('survey'),
    token: generateToken(),
    title,
    description: '',
    status: 'draft',
    questions: [],
    settings: {
      startTime: null,
      endTime: null,
      maxResponses: null,
      password: null,
    },
    createdAt: now,
    updatedAt: now,
  };
  db.data.surveys.push(survey);
  await persist();
  return survey;
}

export async function updateSurvey(id: string, updates: Partial<Omit<Survey, 'id' | 'token' | 'createdAt'>>): Promise<Survey | undefined> {
  const db = await getDb();
  const index = db.data.surveys.findIndex((s) => s.id === id);
  if (index === -1) return undefined;

  db.data.surveys[index] = {
    ...db.data.surveys[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await persist();
  return db.data.surveys[index];
}

export async function updateQuestions(id: string, questions: Question[]): Promise<Survey | undefined> {
  return updateSurvey(id, { questions });
}

export async function updateSettings(id: string, settings: SurveySettings): Promise<Survey | undefined> {
  return updateSurvey(id, { settings });
}

export async function publishSurvey(id: string): Promise<Survey | undefined> {
  return updateSurvey(id, { status: 'published' });
}

export async function closeSurvey(id: string): Promise<Survey | undefined> {
  return updateSurvey(id, { status: 'closed' });
}

export async function deleteSurvey(id: string): Promise<boolean> {
  const db = await getDb();
  const beforeCount = db.data.surveys.length;
  db.data.surveys = db.data.surveys.filter((s) => s.id !== id);
  db.data.responses = db.data.responses.filter((r) => r.surveyId !== id);
  const deleted = db.data.surveys.length < beforeCount;
  if (deleted) await persist();
  return deleted;
}
