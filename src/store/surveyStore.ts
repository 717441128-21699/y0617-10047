import { create } from 'zustand';
import type { Survey, SurveyListItem, SurveySettings, Question } from '../../shared/types.js';
import { surveyApi } from '../lib/api.js';

interface SurveyState {
  surveys: SurveyListItem[];
  currentSurvey: Survey | null;
  loading: boolean;
  error: string | null;

  fetchSurveys: () => Promise<void>;
  createSurvey: (title: string) => Promise<Survey>;
  fetchSurvey: (id: string) => Promise<void>;
  updateSurveyTitle: (id: string, title: string) => Promise<void>;
  updateSurveyDescription: (id: string, description: string) => Promise<void>;
  updateQuestions: (id: string, questions: Question[]) => Promise<void>;
  updateSettings: (id: string, settings: SurveySettings) => Promise<void>;
  publishSurvey: (id: string) => Promise<void>;
  closeSurvey: (id: string) => Promise<void>;
  deleteSurvey: (id: string) => Promise<void>;
  setCurrentSurvey: (survey: Survey | null) => void;
  clearError: () => void;
}

export const useSurveyStore = create<SurveyState>((set, get) => ({
  surveys: [],
  currentSurvey: null,
  loading: false,
  error: null,

  async fetchSurveys() {
    set({ loading: true, error: null });
    try {
      const data = await surveyApi.list();
      set({ surveys: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败' });
    } finally {
      set({ loading: false });
    }
  },

  async createSurvey(title) {
    set({ loading: true, error: null });
    try {
      const survey = await surveyApi.create(title);
      set({ currentSurvey: survey });
      await get().fetchSurveys();
      return survey;
    } finally {
      set({ loading: false });
    }
  },

  async fetchSurvey(id) {
    set({ loading: true, error: null });
    try {
      const survey = await surveyApi.get(id);
      set({ currentSurvey: survey });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败' });
    } finally {
      set({ loading: false });
    }
  },

  async updateSurveyTitle(id, title) {
    try {
      const updated = await surveyApi.update(id, { title });
      set({ currentSurvey: updated });
      await get().fetchSurveys();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '更新失败' });
    }
  },

  async updateSurveyDescription(id, description) {
    try {
      const updated = await surveyApi.update(id, { description });
      set({ currentSurvey: updated });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '更新失败' });
    }
  },

  async updateQuestions(id, questions) {
    try {
      const updated = await surveyApi.updateQuestions(id, questions);
      set({ currentSurvey: updated });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '保存失败' });
      throw err;
    }
  },

  async updateSettings(id, settings) {
    try {
      const updated = await surveyApi.updateSettings(id, settings);
      set({ currentSurvey: updated });
      await get().fetchSurveys();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '保存失败' });
      throw err;
    }
  },

  async publishSurvey(id) {
    try {
      const updated = await surveyApi.publish(id);
      set({ currentSurvey: updated });
      await get().fetchSurveys();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '发布失败' });
      throw err;
    }
  },

  async closeSurvey(id) {
    try {
      const updated = await surveyApi.close(id);
      set({ currentSurvey: updated });
      await get().fetchSurveys();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '关闭失败' });
      throw err;
    }
  },

  async deleteSurvey(id) {
    try {
      await surveyApi.remove(id);
      set({ currentSurvey: null });
      await get().fetchSurveys();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '删除失败' });
      throw err;
    }
  },

  setCurrentSurvey(survey) {
    set({ currentSurvey: survey });
  },

  clearError() {
    set({ error: null });
  },
}));
