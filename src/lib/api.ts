import type {
  Survey,
  SurveyListItem,
  SurveySettings,
  Question,
  SurveyResponse,
  SurveyAnalytics,
  TrendResult,
  TrendGranularity,
  CrossTabResult,
  Segment,
  SavedAnalysisView,
} from '../../shared/types.js';

const BASE = '/api/surveys';

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!res.ok) {
    let message = `请求失败 (${res.status})`;
    try {
      const data = await res.json();
      if (data.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface FilterOptions {
  answerFilters?: Record<string, string[]>;
  tagFilters?: string[];
  submitFrom?: string;
  submitTo?: string;
  segmentId?: string;
}

function buildFilterQs(f?: FilterOptions): string {
  if (!f) return '';
  const parts: string[] = [];
  if (f.answerFilters && Object.keys(f.answerFilters).length > 0) parts.push(`answerFilters=${encodeURIComponent(JSON.stringify(f.answerFilters))}`);
  if (f.tagFilters && f.tagFilters.length > 0) parts.push(`tagFilters=${encodeURIComponent(JSON.stringify(f.tagFilters))}`);
  if (f.submitFrom) parts.push(`submitFrom=${encodeURIComponent(f.submitFrom)}`);
  if (f.submitTo) parts.push(`submitTo=${encodeURIComponent(f.submitTo)}`);
  if (f.segmentId) parts.push(`segmentId=${encodeURIComponent(f.segmentId)}`);
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

export const surveyApi = {
  list(): Promise<SurveyListItem[]> {
    return request<SurveyListItem[]>('/', { method: 'GET' });
  },

  create(title: string): Promise<Survey> {
    return request<Survey>('/', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  },

  get(id: string): Promise<Survey> {
    return request<Survey>(`/${id}`, { method: 'GET' });
  },

  update(id: string, updates: Partial<Pick<Survey, 'title' | 'description' | 'status' | 'questions' | 'settings'>>): Promise<Survey> {
    return request<Survey>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  remove(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/${id}`, { method: 'DELETE' });
  },

  publish(id: string): Promise<Survey> {
    return request<Survey>(`/${id}/publish`, { method: 'POST' });
  },

  close(id: string): Promise<Survey> {
    return request<Survey>(`/${id}/close`, { method: 'POST' });
  },

  getByToken(token: string): Promise<Survey & { requiresPassword?: boolean }> {
    return request<Survey & { requiresPassword?: boolean }>(`/token/${token}`, { method: 'GET' });
  },

  verifyPassword(token: string, password: string): Promise<{ valid: boolean }> {
    return request<{ valid: boolean }>(`/token/${token}/verify`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },

  submitByToken(
    token: string,
    answers: Record<string, unknown>,
    providedPassword?: string,
    browserId?: string
  ): Promise<SurveyResponse> {
    return request<SurveyResponse>(`/token/${token}/responses`, {
      method: 'POST',
      body: JSON.stringify({ answers, providedPassword, browserId }),
    });
  },

  listResponses(id: string, f?: FilterOptions): Promise<SurveyResponse[]> {
    return request<SurveyResponse[]>(`/${id}/responses${buildFilterQs(f)}`, { method: 'GET' });
  },

  exportResponsesUrl(id: string, f?: FilterOptions): string {
    return `${BASE}/${id}/responses/export${buildFilterQs(f)}`;
  },

  getAnalytics(id: string, f?: FilterOptions): Promise<SurveyAnalytics> {
    return request<SurveyAnalytics>(`/${id}/analytics${buildFilterQs(f)}`, { method: 'GET' });
  },

  getTrend(id: string, granularity: TrendGranularity = 'day', days = 14, f?: FilterOptions): Promise<TrendResult> {
    const baseQs = `?granularity=${granularity}&days=${days}`;
    const fqs = buildFilterQs(f);
    const qs = fqs ? `${baseQs}&${fqs.slice(1)}` : baseQs;
    return request<TrendResult>(`/${id}/trend${qs}`, { method: 'GET' });
  },

  getCrossTab(id: string, groupQuestionId: string, targetQuestionId: string, f?: FilterOptions): Promise<CrossTabResult> {
    const baseQs = `?groupQuestionId=${encodeURIComponent(groupQuestionId)}&targetQuestionId=${encodeURIComponent(targetQuestionId)}`;
    const fqs = buildFilterQs(f);
    const qs = fqs ? `${baseQs}&${fqs.slice(1)}` : baseQs;
    return request<CrossTabResult>(`/${id}/cross-tab${qs}`, { method: 'GET' });
  },

  exportCrossTabUrl(id: string, groupQuestionId: string, targetQuestionId: string, f?: FilterOptions): string {
    const baseQs = `?groupQuestionId=${encodeURIComponent(groupQuestionId)}&targetQuestionId=${encodeURIComponent(targetQuestionId)}`;
    const fqs = buildFilterQs(f);
    const qs = fqs ? `${baseQs}&${fqs.slice(1)}` : baseQs;
    return `${BASE}/${id}/cross-tab/export${qs}`;
  },

  updateResponseTags(responseId: string, tags: string[]): Promise<SurveyResponse> {
    return request<SurveyResponse>(`/responses/${responseId}/tags`, {
      method: 'PUT',
      body: JSON.stringify({ tags }),
    });
  },

  updateResponseNote(responseId: string, note: string): Promise<SurveyResponse> {
    return request<SurveyResponse>(`/responses/${responseId}/note`, {
      method: 'PUT',
      body: JSON.stringify({ note }),
    });
  },

  batchUpdateTags(
    id: string,
    data: {
      tags: string[];
      mode: 'add' | 'remove' | 'set';
      responseIds?: string[];
    } & FilterOptions
  ): Promise<{ updated: number }> {
    return request<{ updated: number }>(`/${id}/responses/batch-tags`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  batchUpdateNotes(
    id: string,
    data: {
      note: string;
      responseIds?: string[];
    } & FilterOptions
  ): Promise<{ updated: number }> {
    return request<{ updated: number }>(`/${id}/responses/batch-notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  listSegments(id: string): Promise<Segment[]> {
    return request<Segment[]>(`/${id}/segments`, { method: 'GET' });
  },

  createSegment(
    id: string,
    data: {
      name: string;
      description?: string;
      answerFilters?: Record<string, string[]>;
      tagFilters?: string[];
      submitFrom?: string | null;
      submitTo?: string | null;
    }
  ): Promise<Segment> {
    return request<Segment>(`/${id}/segments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateSegment(
    segmentId: string,
    data: Partial<Pick<Segment, 'name' | 'description' | 'answerFilters' | 'tagFilters' | 'submitFrom' | 'submitTo'>>
  ): Promise<Segment> {
    return request<Segment>(`/segments/${segmentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteSegment(segmentId: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/segments/${segmentId}`, { method: 'DELETE' });
  },

  listSavedViews(id: string): Promise<SavedAnalysisView[]> {
    return request<SavedAnalysisView[]>(`/${id}/views`, { method: 'GET' });
  },

  createSavedView(
    id: string,
    data: Omit<SavedAnalysisView, 'id' | 'surveyId' | 'createdAt' | 'updatedAt'>
  ): Promise<SavedAnalysisView> {
    return request<SavedAnalysisView>(`/${id}/views`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateSavedView(
    viewId: string,
    data: Partial<Omit<SavedAnalysisView, 'id' | 'surveyId' | 'createdAt'>>
  ): Promise<SavedAnalysisView> {
    return request<SavedAnalysisView>(`/views/${viewId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  cloneSavedView(viewId: string, name: string): Promise<SavedAnalysisView> {
    return request<SavedAnalysisView>(`/views/${viewId}/clone`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  deleteSavedView(viewId: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/views/${viewId}`, { method: 'DELETE' });
  },

  updateQuestions(id: string, questions: Question[]): Promise<Survey> {
    return this.update(id, { questions });
  },

  updateSettings(id: string, settings: SurveySettings): Promise<Survey> {
    return this.update(id, { settings });
  },
};
