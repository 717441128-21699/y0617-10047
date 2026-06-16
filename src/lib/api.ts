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

  listResponses(id: string, filters?: Record<string, string | string[]>): Promise<SurveyResponse[]> {
    const qs = filters ? `?filters=${encodeURIComponent(JSON.stringify(filters))}` : '';
    return request<SurveyResponse[]>(`/${id}/responses${qs}`, { method: 'GET' });
  },

  exportResponsesUrl(id: string, filters?: Record<string, string | string[]>): string {
    const qs = filters ? `?filters=${encodeURIComponent(JSON.stringify(filters))}` : '';
    return `${BASE}/${id}/responses/export${qs}`;
  },

  getAnalytics(id: string): Promise<SurveyAnalytics> {
    return request<SurveyAnalytics>(`/${id}/analytics`, { method: 'GET' });
  },

  getTrend(id: string, granularity: TrendGranularity = 'day', days = 14): Promise<TrendResult> {
    const qs = `?granularity=${granularity}&days=${days}`;
    return request<TrendResult>(`/${id}/trend${qs}`, { method: 'GET' });
  },

  getCrossTab(id: string, groupQuestionId: string, targetQuestionId: string): Promise<CrossTabResult> {
    const qs = `?groupQuestionId=${encodeURIComponent(groupQuestionId)}&targetQuestionId=${encodeURIComponent(targetQuestionId)}`;
    return request<CrossTabResult>(`/${id}/cross-tab${qs}`, { method: 'GET' });
  },

  exportCrossTabUrl(id: string, groupQuestionId: string, targetQuestionId: string): string {
    const qs = `?groupQuestionId=${encodeURIComponent(groupQuestionId)}&targetQuestionId=${encodeURIComponent(targetQuestionId)}`;
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
    data: { tags: string[]; mode: 'add' | 'remove' | 'set'; filters?: Record<string, string | string[]>; responseIds?: string[] }
  ): Promise<{ updated: number }> {
    return request<{ updated: number }>(`/${id}/responses/batch-tags`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateQuestions(id: string, questions: Question[]): Promise<Survey> {
    return this.update(id, { questions });
  },

  updateSettings(id: string, settings: SurveySettings): Promise<Survey> {
    return this.update(id, { settings });
  },
};
