import { getDb, persist } from '../db/index.js';
import { generateId } from '../utils/id.js';
import type {
  SurveyResponse,
  SurveyAnalytics,
  QuestionAnalytics,
  AnalyticsOption,
  Question,
  TrendResult,
  TrendGranularity,
  CrossTabResult,
  CrossTabOption,
} from '../../shared/types.js';

export async function submitResponse(
  surveyId: string,
  answers: Record<string, unknown>,
  respondentIp: string,
  browserId: string
): Promise<SurveyResponse | { error: string; duplicate: boolean }> {
  const db = await getDb();
  const survey = db.data.surveys.find((s) => s.id === surveyId);

  if (!survey) {
    return { error: '问卷不存在', duplicate: false };
  }

  if (survey.status !== 'published') {
    return { error: '问卷未发布', duplicate: false };
  }

  const now = new Date();
  if (survey.settings.startTime && new Date(survey.settings.startTime) > now) {
    return { error: '问卷尚未开始', duplicate: false };
  }
  if (survey.settings.endTime && new Date(survey.settings.endTime) < now) {
    return { error: '问卷已截止', duplicate: false };
  }

  const currentCount = db.data.responses.filter((r) => r.surveyId === surveyId).length;
  if (survey.settings.maxResponses && currentCount >= survey.settings.maxResponses) {
    return { error: '答卷数量已达上限', duplicate: false };
  }

  let duplicateCount = 0;
  if (browserId) {
    const existing = db.data.responses.find((r) => r.surveyId === surveyId && r.browserId === browserId);
    if (existing) {
      existing.duplicateCount = (existing.duplicateCount ?? 0) + 1;
      duplicateCount = existing.duplicateCount;
      await persist();
      return { error: '您已经提交过答卷了', duplicate: true };
    }
  }

  const response: SurveyResponse = {
    id: generateId('resp'),
    surveyId,
    answers,
    submittedAt: now.toISOString(),
    respondentIp,
    browserId,
    tags: [],
    note: '',
    duplicateCount: 0,
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
          if (filterValue.length === 0) return true;
          if (Array.isArray(answer)) {
            return filterValue.some((fv) => answer.includes(fv));
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

  const sorted = responses.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const seenBrowserIds = new Set<string>();
  return sorted.map((r) => {
    let isDuplicate = false;
    if (r.browserId) {
      if (seenBrowserIds.has(r.browserId)) {
        isDuplicate = true;
      } else {
        seenBrowserIds.add(r.browserId);
      }
    }
    return { ...r, isDuplicate };
  });
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

export async function getTrend(
  surveyId: string,
  granularity: TrendGranularity = 'day',
  days = 14
): Promise<TrendResult | undefined> {
  const db = await getDb();
  const survey = db.data.surveys.find((s) => s.id === surveyId);
  if (!survey) return undefined;

  const now = new Date();
  const points: TrendResult['points'] = [];
  const totalResponses = db.data.responses.filter((r) => r.surveyId === surveyId);

  const ratingQuestion = survey.questions.find((q) => q.type === 'rating');

  if (granularity === 'day') {
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dayStr = d.toISOString().slice(0, 10);
      points.push({
        time: dayStr,
        submissions: 0,
        completionRate: 0,
        avgRating: undefined,
      });
    }
  } else {
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(d.getHours() - i, 0, 0, 0);
      const hourStr = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:00`;
      points.push({
        time: hourStr,
        submissions: 0,
        completionRate: 0,
        avgRating: undefined,
      });
    }
  }

  const questionCount = survey.questions.length;

  totalResponses.forEach((resp) => {
    const ts = new Date(resp.submittedAt);
    let idx = -1;

    if (granularity === 'day') {
      const dayStr = ts.toISOString().slice(0, 10);
      idx = points.findIndex((p) => p.time === dayStr);
    } else {
      const hourStr = `${ts.getMonth() + 1}/${ts.getDate()} ${String(ts.getHours()).padStart(2, '0')}:00`;
      idx = points.findIndex((p) => p.time === hourStr);
    }

    if (idx >= 0) {
      points[idx].submissions++;
      const answeredCount = Object.values(resp.answers).filter(
        (v) => v !== undefined && v !== null && v !== '' && (!Array.isArray(v) || v.length > 0)
      ).length;
      points[idx].completionRate += questionCount > 0 ? answeredCount / questionCount : 0;
    }
  });

  points.forEach((p) => {
    if (p.submissions > 0) {
      p.completionRate = (p.completionRate / p.submissions) * 100;
    } else {
      p.completionRate = 0;
    }
  });

  if (ratingQuestion) {
    const ratingId = ratingQuestion.id;
    const ratingsByTime = new Map<string, number[]>();
    points.forEach((p) => ratingsByTime.set(p.time, []));

    totalResponses.forEach((resp) => {
      const ts = new Date(resp.submittedAt);
      let timeKey = '';
      if (granularity === 'day') {
        timeKey = ts.toISOString().slice(0, 10);
      } else {
        timeKey = `${ts.getMonth() + 1}/${ts.getDate()} ${String(ts.getHours()).padStart(2, '0')}:00`;
      }
      const val = resp.answers[ratingId];
      if (val !== undefined && val !== null && val !== '') {
        const n = Number(val);
        if (!Number.isNaN(n)) {
          ratingsByTime.get(timeKey)?.push(n);
        }
      }
    });

    points.forEach((p) => {
      const arr = ratingsByTime.get(p.time) ?? [];
      if (arr.length > 0) {
        p.avgRating = arr.reduce((s, n) => s + n, 0) / arr.length;
      }
    });
  }

  const total = points.reduce((s, p) => s + p.submissions, 0);
  const avgCompletionRate =
    total > 0 ? points.reduce((s, p) => s + p.completionRate * p.submissions, 0) / total : 0;

  return { points, total, avgCompletionRate };
}

export async function getCrossTab(
  surveyId: string,
  groupQuestionId: string,
  targetQuestionId: string
): Promise<CrossTabResult | undefined> {
  const db = await getDb();
  const survey = db.data.surveys.find((s) => s.id === surveyId);
  if (!survey) return undefined;

  const groupQ = survey.questions.find((q) => q.id === groupQuestionId);
  const targetQ = survey.questions.find((q) => q.id === targetQuestionId);
  if (!groupQ || !targetQ) return undefined;
  if (!['single', 'dropdown'].includes(groupQ.type)) return undefined;

  const responses = db.data.responses.filter((r) => r.surveyId === surveyId);
  const groupOptions = groupQ.options ?? [];

  const groups = groupOptions.map((opt) => {
    const groupResponses = responses.filter((r) => String(r.answers[groupQuestionId] ?? '') === opt.value);
    return { groupLabel: opt.label, groupValue: opt.value, responses: groupResponses };
  });

  const targetType = targetQ.type;

  const resultGroups: CrossTabResult['groups'] = groups.map((g) => {
    const groupTotal = g.responses.length;
    const options: CrossTabOption[] = [];
    let avgRating: number | undefined;

    if (targetType === 'single' || targetType === 'dropdown') {
      const opts = targetQ.options ?? [];
      opts.forEach((o) => {
        const count = g.responses.filter((r) => String(r.answers[targetQuestionId] ?? '') === o.value).length;
        options.push({
          label: o.label,
          value: o.value,
          count,
          percentage: groupTotal > 0 ? (count / groupTotal) * 100 : 0,
        });
      });
    } else if (targetType === 'multiple') {
      const opts = targetQ.options ?? [];
      let totalSelections = 0;
      const counts = new Map<string, number>();
      opts.forEach((o) => counts.set(o.value, 0));
      g.responses.forEach((r) => {
        const val = r.answers[targetQuestionId];
        if (Array.isArray(val)) {
          val.forEach((v) => {
            counts.set(v, (counts.get(v) ?? 0) + 1);
            totalSelections++;
          });
        }
      });
      opts.forEach((o) => {
        const count = counts.get(o.value) ?? 0;
        options.push({
          label: o.label,
          value: o.value,
          count,
          percentage: totalSelections > 0 ? (count / totalSelections) * 100 : 0,
        });
      });
    } else if (targetType === 'rating') {
      const nums = g.responses
        .map((r) => Number(r.answers[targetQuestionId]))
        .filter((n) => !Number.isNaN(n));
      if (nums.length > 0) {
        avgRating = nums.reduce((s, n) => s + n, 0) / nums.length;
      }
    }

    return {
      groupLabel: g.groupLabel,
      groupValue: g.groupValue,
      totalCount: groupTotal,
      options,
      avgRating,
    };
  });

  let overallOptions: CrossTabOption[] | undefined;
  let overallAvgRating: number | undefined;

  if (targetType === 'single' || targetType === 'dropdown' || targetType === 'multiple') {
    const overall = analyzeQuestion(targetQ, responses);
    const targetOpts = targetQ.options ?? [];
    overallOptions = (overall.options ?? []).map((o) => {
      const opt = targetOpts.find((to) => to.label === o.label);
      return {
        label: o.label,
        value: opt?.value ?? o.label,
        count: o.count,
        percentage: o.percentage,
      };
    });
  } else if (targetType === 'rating') {
    const overall = analyzeQuestion(targetQ, responses);
    overallAvgRating = overall.average;
  }

  return {
    groupQuestionTitle: groupQ.title,
    targetQuestionTitle: targetQ.title,
    targetType,
    groups: resultGroups,
    overallOptions,
    overallAvgRating,
  };
}

export async function updateResponseTags(
  responseId: string,
  tags: string[]
): Promise<SurveyResponse | undefined> {
  const db = await getDb();
  const resp = db.data.responses.find((r) => r.id === responseId);
  if (!resp) return undefined;
  resp.tags = tags;
  await persist();
  return resp;
}

export async function updateResponseNote(
  responseId: string,
  note: string
): Promise<SurveyResponse | undefined> {
  const db = await getDb();
  const resp = db.data.responses.find((r) => r.id === responseId);
  if (!resp) return undefined;
  resp.note = note;
  await persist();
  return resp;
}

export async function batchUpdateTags(
  surveyId: string,
  filterOptions: { filters?: Record<string, string | string[]>; responseIds?: string[] },
  tags: string[],
  mode: 'set' | 'add' | 'remove' = 'add'
): Promise<{ updated: number }> {
  const db = await getDb();
  let targetIds: string[] = [];

  if (filterOptions.responseIds && filterOptions.responseIds.length > 0) {
    targetIds = filterOptions.responseIds;
  } else if (filterOptions.filters) {
    const filtered = await getResponses(surveyId, filterOptions.filters);
    targetIds = filtered.map((r) => r.id);
  }

  let updated = 0;
  db.data.responses.forEach((r) => {
    if (r.surveyId !== surveyId) return;
    if (!targetIds.includes(r.id)) return;

    if (mode === 'set') {
      r.tags = [...tags];
    } else if (mode === 'add') {
      const set = new Set(r.tags);
      tags.forEach((t) => set.add(t));
      r.tags = Array.from(set);
    } else if (mode === 'remove') {
      r.tags = r.tags.filter((t) => !tags.includes(t));
    }
    updated++;
  });

  if (updated > 0) await persist();
  return { updated };
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
    case 'matrix': {
      const { data, rows, cols } = analyzeMatrix(question, answers);
      base.matrixData = data;
      base.matrixRows = rows;
      base.matrixCols = cols;
      break;
    }
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
): { data: Record<string, AnalyticsOption[]>; rows: Question['rows']; cols: Question['columns'] } {
  const data: Record<string, AnalyticsOption[]> = {};
  const rows = question.rows ?? [];
  const columns = question.columns ?? [];

  rows.forEach((row) => {
    const rowAnswers = answers
      .map((a) => (typeof a === 'object' && a ? (a as Record<string, unknown>)[row.id] : undefined))
      .filter((v) => v !== undefined);

    data[row.id] = columns.map((col) => {
      const count = rowAnswers.filter((v) => v === col.value).length;
      return {
        label: col.label,
        count,
        percentage: rowAnswers.length > 0 ? (count / rowAnswers.length) * 100 : 0,
      };
    });
  });

  return { data, rows, cols: columns };
}
