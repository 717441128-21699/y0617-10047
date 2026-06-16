import { getDb, persist } from '../db/index.js';
import { generateId } from '../utils/id.js';
import type { SurveyResponse, SurveyAnalytics, QuestionAnalytics, AnalyticsOption, Question } from '../../shared/types.js';

export async function submitResponse(
  surveyId: string,
  answers: Record<string, unknown>,
  respondentIp: string
): Promise<SurveyResponse | { error: string }> {
  const db = await getDb();
  const survey = db.data.surveys.find((s) => s.id === surveyId);

  if (!survey) {
    return { error: '问卷不存在' };
  }

  if (survey.status !== 'published') {
    return { error: '问卷未发布' };
  }

  const now = new Date();
  if (survey.settings.startTime && new Date(survey.settings.startTime) > now) {
    return { error: '问卷尚未开始' };
  }
  if (survey.settings.endTime && new Date(survey.settings.endTime) < now) {
    return { error: '问卷已截止' };
  }

  const currentCount = db.data.responses.filter((r) => r.surveyId === surveyId).length;
  if (survey.settings.maxResponses && currentCount >= survey.settings.maxResponses) {
    return { error: '答卷数量已达上限' };
  }

  const response: SurveyResponse = {
    id: generateId('resp'),
    surveyId,
    answers,
    submittedAt: now.toISOString(),
    respondentIp,
  };

  db.data.responses.push(response);
  await persist();
  return response;
}

export async function getResponses(
  surveyId: string,
  filters?: Record<string, string | string[]>
): Promise<SurveyResponse[]> {
  const db = await getDb();
  let responses = db.data.responses.filter((r) => r.surveyId === surveyId);

  if (filters) {
    responses = responses.filter((resp) => {
      return Object.entries(filters).every(([qId, filterValue]) => {
        const answer = resp.answers[qId];
        if (!answer) return false;

        if (Array.isArray(filterValue)) {
          if (Array.isArray(answer)) {
            return filterValue.every((fv) => answer.includes(fv));
          }
          return filterValue.includes(String(answer));
        }

        if (Array.isArray(answer)) {
          return answer.includes(filterValue);
        }
        return String(answer) === filterValue;
      });
    });
  }

  return responses.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export async function getAnalytics(surveyId: string): Promise<SurveyAnalytics | undefined> {
  const db = await getDb();
  const survey = db.data.surveys.find((s) => s.id === surveyId);
  if (!survey) return undefined;

  const responses = db.data.responses.filter((r) => r.surveyId === surveyId);
  const totalResponses = responses.length;

  const questions: QuestionAnalytics[] = survey.questions.map((q) =>
    analyzeQuestion(q, responses)
  );

  return { totalResponses, questions };
}

function analyzeQuestion(question: Question, responses: SurveyResponse[]): QuestionAnalytics {
  const base: QuestionAnalytics = {
    questionId: question.id,
    questionTitle: question.title,
    questionType: question.type,
    responseCount: 0,
    skippedCount: 0,
  };

  const answers = responses
    .map((r) => r.answers[question.id])
    .filter((a) => a !== undefined && a !== null && a !== '');

  base.responseCount = answers.length;
  base.skippedCount = responses.length - answers.length;

  switch (question.type) {
    case 'single':
    case 'dropdown':
      base.options = analyzeOptions(question.options ?? [], answers);
      break;
    case 'multiple':
      base.options = analyzeMultiOptions(question.options ?? [], answers);
      break;
    case 'rating':
      analyzeRating(answers, base);
      break;
    case 'matrix':
      base.matrixData = analyzeMatrix(question, answers);
      break;
  }

  return base;
}

function analyzeOptions(options: { label: string; value: string }[], answers: unknown[]): AnalyticsOption[] {
  const counts = new Map<string, number>();
  options.forEach((o) => counts.set(o.value, 0));
  answers.forEach((a) => {
    const key = String(a);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  const total = answers.length;
  return options.map((o) => ({
    label: o.label,
    count: counts.get(o.value) ?? 0,
    percentage: total > 0 ? ((counts.get(o.value) ?? 0) / total) * 100 : 0,
  }));
}

function analyzeMultiOptions(options: { label: string; value: string }[], answers: unknown[]): AnalyticsOption[] {
  const counts = new Map<string, number>();
  options.forEach((o) => counts.set(o.value, 0));

  let totalSelections = 0;
  answers.forEach((a) => {
    if (Array.isArray(a)) {
      a.forEach((v) => {
        counts.set(v, (counts.get(v) ?? 0) + 1);
        totalSelections++;
      });
    }
  });

  return options.map((o) => ({
    label: o.label,
    count: counts.get(o.value) ?? 0,
    percentage: totalSelections > 0 ? ((counts.get(o.value) ?? 0) / totalSelections) * 100 : 0,
  }));
}

function analyzeRating(answers: unknown[], base: QuestionAnalytics): void {
  const numeric = answers.map((a) => Number(a)).filter((n) => !Number.isNaN(n));
  if (numeric.length === 0) return;

  base.average = numeric.reduce((s, n) => s + n, 0) / numeric.length;
  base.min = Math.min(...numeric);
  base.max = Math.max(...numeric);
}

function analyzeMatrix(
  question: Question,
  answers: unknown[]
): Record<string, AnalyticsOption[]> {
  const result: Record<string, AnalyticsOption[]> = {};
  const rows = question.rows ?? [];
  const columns = question.columns ?? [];

  rows.forEach((row) => {
    const rowAnswers = answers
      .map((a) => (typeof a === 'object' && a ? (a as Record<string, unknown>)[row.id] : undefined))
      .filter((v) => v !== undefined);

    result[row.id] = columns.map((col) => {
      const count = rowAnswers.filter((v) => v === col.value).length;
      return {
        label: col.label,
        count,
        percentage: rowAnswers.length > 0 ? (count / rowAnswers.length) * 100 : 0,
      };
    });
  });

  return result;
}
