import type { Request, Response } from 'express';
import * as surveyService from '../services/surveyService.js';
import * as responseService from '../services/responseService.js';
import * as XLSX from 'xlsx';

export async function listSurveys(_req: Request, res: Response): Promise<void> {
  const surveys = await surveyService.getAllSurveys();
  res.json(surveys);
}

export async function getSurvey(req: Request, res: Response): Promise<void> {
  const survey = await surveyService.getSurveyById(req.params.id);
  if (!survey) {
    res.status(404).json({ error: '问卷不存在' });
    return;
  }
  res.json(survey);
}

export async function getSurveyByToken(req: Request, res: Response): Promise<void> {
  const survey = await surveyService.getSurveyByToken(req.params.token);
  if (!survey) {
    res.status(404).json({ error: '问卷不存在' });
    return;
  }
  if (survey.status !== 'published') {
    res.status(403).json({ error: '问卷未发布' });
    return;
  }
  const { password, ...settingsWithoutPassword } = survey.settings;
  res.json({
    ...survey,
    settings: settingsWithoutPassword,
    requiresPassword: !!password,
  });
}

export async function createSurvey(req: Request, res: Response): Promise<void> {
  const { title } = req.body;
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    res.status(400).json({ error: '问卷标题不能为空' });
    return;
  }
  const survey = await surveyService.createSurvey(title.trim());
  res.status(201).json(survey);
}

export async function updateSurvey(req: Request, res: Response): Promise<void> {
  const { questions, settings, title, description, status } = req.body;
  const updates: Partial<typeof req.body> = {};
  if (questions !== undefined) updates.questions = questions;
  if (settings !== undefined) updates.settings = settings;
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (status !== undefined) updates.status = status;

  const survey = await surveyService.updateSurvey(req.params.id, updates);
  if (!survey) {
    res.status(404).json({ error: '问卷不存在' });
    return;
  }
  res.json(survey);
}

export async function deleteSurvey(req: Request, res: Response): Promise<void> {
  const deleted = await surveyService.deleteSurvey(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: '问卷不存在' });
    return;
  }
  res.json({ success: true });
}

export async function publishSurvey(req: Request, res: Response): Promise<void> {
  const survey = await surveyService.publishSurvey(req.params.id);
  if (!survey) {
    res.status(404).json({ error: '问卷不存在' });
    return;
  }
  res.json(survey);
}

export async function closeSurvey(req: Request, res: Response): Promise<void> {
  const survey = await surveyService.closeSurvey(req.params.id);
  if (!survey) {
    res.status(404).json({ error: '问卷不存在' });
    return;
  }
  res.json(survey);
}

export async function verifyPassword(req: Request, res: Response): Promise<void> {
  const survey = await surveyService.getSurveyByToken(req.params.token);
  if (!survey) {
    res.status(404).json({ error: '问卷不存在' });
    return;
  }
  const { password } = req.body;
  if (survey.settings.password && password !== survey.settings.password) {
    res.status(401).json({ error: '密码错误', valid: false });
    return;
  }
  res.json({ valid: true });
}

export async function submitResponse(req: Request, res: Response): Promise<void> {
  const survey = await surveyService.getSurveyByToken(req.params.token);
  if (!survey) {
    res.status(404).json({ error: '问卷不存在' });
    return;
  }
  if (survey.settings.password) {
    const { providedPassword } = req.body;
    if (providedPassword !== survey.settings.password) {
      res.status(401).json({ error: '密码错误' });
      return;
    }
  }
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  const browserId: string = req.body.browserId ?? '';
  const result = await responseService.submitResponse(
    survey.id,
    req.body.answers ?? {},
    ip,
    browserId
  );
  if ('error' in result) {
    res.status(400).json({ error: result.error, duplicate: result.duplicate });
    return;
  }
  res.status(201).json(result);
}

export async function listResponses(req: Request, res: Response): Promise<void> {
  const parseOpt = (key: string) => req.query[key] ? JSON.parse(String(req.query[key])) : undefined;
  const options = {
    answerFilters: parseOpt('answerFilters'),
    tagFilters: parseOpt('tagFilters'),
    submitFrom: req.query.submitFrom ? String(req.query.submitFrom) : undefined,
    submitTo: req.query.submitTo ? String(req.query.submitTo) : undefined,
    segmentId: req.query.segmentId ? String(req.query.segmentId) : undefined,
  };
  const responses = await responseService.getResponses(req.params.id, options);
  res.json(responses);
}

export async function exportResponses(req: Request, res: Response): Promise<void> {
  const survey = await surveyService.getSurveyById(req.params.id);
  if (!survey) {
    res.status(404).json({ error: '问卷不存在' });
    return;
  }
  const parseOpt = (key: string) => req.query[key] ? JSON.parse(String(req.query[key])) : undefined;
  const filterOptions = {
    answerFilters: parseOpt('answerFilters'),
    tagFilters: parseOpt('tagFilters'),
    submitFrom: req.query.submitFrom ? String(req.query.submitFrom) : undefined,
    submitTo: req.query.submitTo ? String(req.query.submitTo) : undefined,
    segmentId: req.query.segmentId ? String(req.query.segmentId) : undefined,
  };
  const filtered = Object.values(filterOptions).some((v) => v !== undefined && !(Array.isArray(v) && v.length === 0) && !(typeof v === 'object' && Object.keys(v).length === 0));
  const responses = await responseService.getResponses(req.params.id, filterOptions);

  const headerRow = ['提交时间', '浏览器ID', '是否重复', '拦截次数', '标签', '备注', ...survey.questions.map((q) => q.title)];
  const dataRows = responses.map((r) => {
    const row: (string | number)[] = [
      r.submittedAt,
      r.browserId ? r.browserId.slice(0, 12) : '',
      r.isDuplicate ? '是' : '',
      r.duplicateCount > 0 ? String(r.duplicateCount) : '',
      r.tags.join('、'),
      r.note,
    ];
    survey.questions.forEach((q) => {
      row.push(formatAnswerForExport(q, r.answers[q.id]));
    });
    return row;
  });

  const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '答卷数据');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  const filename = encodeURIComponent(`${survey.title}_答卷数据${filtered ? '（已筛选）' : ''}.xlsx`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
  res.send(buffer);
}

function formatAnswerForExport(q: {
  id: string;
  type: string;
  options?: { label: string; value: string }[];
  rows?: { id: string; label: string }[];
  columns?: { id: string; label: string; value: string }[];
}, answer: unknown): string {
  if (answer === undefined || answer === null || answer === '') return '';
  if (Array.isArray(answer)) {
    return answer
      .map((v) => q.options?.find((o) => o.value === v)?.label ?? String(v))
      .join('、');
  }
  if (typeof answer === 'object') {
    const parts: string[] = [];
    q.rows?.forEach((rowItem) => {
      const val = (answer as Record<string, string>)[rowItem.id];
      if (val !== undefined && val !== null && val !== '') {
        const colLabel = q.columns?.find((c) => c.value === val)?.label ?? String(val);
        parts.push(`${rowItem.label}: ${colLabel}`);
      } else {
        parts.push(`${rowItem.label}: 未作答`);
      }
    });
    return parts.join('；');
  }
  if (q.options) {
    return q.options.find((o) => o.value === String(answer))?.label ?? String(answer);
  }
  return String(answer);
}

export async function getAnalytics(req: Request, res: Response): Promise<void> {
  const parseOpt = (key: string) => req.query[key] ? JSON.parse(String(req.query[key])) : undefined;
  const options = {
    answerFilters: parseOpt('answerFilters'),
    tagFilters: parseOpt('tagFilters'),
    submitFrom: req.query.submitFrom ? String(req.query.submitFrom) : undefined,
    submitTo: req.query.submitTo ? String(req.query.submitTo) : undefined,
    segmentId: req.query.segmentId ? String(req.query.segmentId) : undefined,
  };
  const analytics = await responseService.getAnalytics(req.params.id, options);
  if (!analytics) {
    res.status(404).json({ error: '问卷不存在' });
    return;
  }
  res.json(analytics);
}

export async function getTrend(req: Request, res: Response): Promise<void> {
  const granularity = (req.query.granularity as 'day' | 'hour') ?? 'day';
  const days = req.query.days ? Number(req.query.days) : 14;
  const parseOpt = (key: string) => req.query[key] ? JSON.parse(String(req.query[key])) : undefined;
  const options = {
    answerFilters: parseOpt('answerFilters'),
    tagFilters: parseOpt('tagFilters'),
    submitFrom: req.query.submitFrom ? String(req.query.submitFrom) : undefined,
    submitTo: req.query.submitTo ? String(req.query.submitTo) : undefined,
    segmentId: req.query.segmentId ? String(req.query.segmentId) : undefined,
  };
  const trend = await responseService.getTrend(req.params.id, granularity, days, options);
  if (!trend) {
    res.status(404).json({ error: '问卷不存在' });
    return;
  }
  res.json(trend);
}

export async function getCrossTab(req: Request, res: Response): Promise<void> {
  const { groupQuestionId, targetQuestionId } = req.query;
  if (!groupQuestionId || !targetQuestionId) {
    res.status(400).json({ error: '缺少分组题或目标题参数' });
    return;
  }
  const parseOpt = (key: string) => req.query[key] ? JSON.parse(String(req.query[key])) : undefined;
  const options = {
    answerFilters: parseOpt('answerFilters'),
    tagFilters: parseOpt('tagFilters'),
    submitFrom: req.query.submitFrom ? String(req.query.submitFrom) : undefined,
    submitTo: req.query.submitTo ? String(req.query.submitTo) : undefined,
    segmentId: req.query.segmentId ? String(req.query.segmentId) : undefined,
  };
  const result = await responseService.getCrossTab(
    req.params.id,
    String(groupQuestionId),
    String(targetQuestionId),
    options
  );
  if (!result) {
    res.status(404).json({ error: '问卷或题目不存在' });
    return;
  }
  res.json(result);
}

export async function exportCrossTab(req: Request, res: Response): Promise<void> {
  const survey = await surveyService.getSurveyById(req.params.id);
  if (!survey) {
    res.status(404).json({ error: '问卷不存在' });
    return;
  }
  const { groupQuestionId, targetQuestionId } = req.query;
  if (!groupQuestionId || !targetQuestionId) {
    res.status(400).json({ error: '缺少分组题或目标题参数' });
    return;
  }
  const parseOpt = (key: string) => req.query[key] ? JSON.parse(String(req.query[key])) : undefined;
  const options = {
    answerFilters: parseOpt('answerFilters'),
    tagFilters: parseOpt('tagFilters'),
    submitFrom: req.query.submitFrom ? String(req.query.submitFrom) : undefined,
    submitTo: req.query.submitTo ? String(req.query.submitTo) : undefined,
    segmentId: req.query.segmentId ? String(req.query.segmentId) : undefined,
  };
  const result = await responseService.getCrossTab(
    req.params.id,
    String(groupQuestionId),
    String(targetQuestionId),
    options
  );
  if (!result) {
    res.status(404).json({ error: '问卷或题目不存在' });
    return;
  }

  if (!result.hasData) {
    const headerRow = ['提示'];
    const dataRows = [['当前交叉分析组合暂无数据，请尝试更换题目或调整筛选条件。']];
    const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '交叉分析');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const filename = encodeURIComponent(`${survey.title}_交叉分析.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    res.send(buffer);
    return;
  }

  const headerRow = ['分组', '样本量', '选项', '选择人数', '占比(%)'];
  const dataRows: (string | number)[][] = [];

  if (result.targetType === 'rating') {
    const ratingHeader = ['分组', '样本量', '平均分'];
    const ratingRows: (string | number)[][] = result.groups.map((g) => [
      g.groupLabel,
      g.totalCount,
      g.avgRating?.toFixed(2) ?? '-',
    ]);
    if (result.overallAvgRating !== undefined) {
      ratingRows.push(['总体', result.groups.reduce((s, g) => s + g.totalCount, 0), result.overallAvgRating.toFixed(2)]);
    }
    const ws = XLSX.utils.aoa_to_sheet([ratingHeader, ...ratingRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '交叉分析');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const filename = encodeURIComponent(`${survey.title}_交叉分析.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    res.send(buffer);
    return;
  }

  result.groups.forEach((g) => {
    g.options.forEach((opt, i) => {
      dataRows.push([
        i === 0 ? g.groupLabel : '',
        i === 0 ? g.totalCount : '',
        opt.label,
        opt.count,
        opt.percentage.toFixed(2),
      ]);
    });
  });

  if (result.overallOptions) {
    const overallTotal = result.groups.reduce((s, g) => s + g.totalCount, 0);
    result.overallOptions.forEach((opt, i) => {
      dataRows.push([
        i === 0 ? '总体' : '',
        i === 0 ? overallTotal : '',
        opt.label,
        opt.count,
        opt.percentage.toFixed(2),
      ]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '交叉分析');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  const filename = encodeURIComponent(`${survey.title}_交叉分析.xlsx`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
  res.send(buffer);
}

export async function updateResponseTags(req: Request, res: Response): Promise<void> {
  const { tags } = req.body;
  if (!Array.isArray(tags)) {
    res.status(400).json({ error: 'tags 必须是数组' });
    return;
  }
  const result = await responseService.updateResponseTags(req.params.responseId, tags);
  if (!result) {
    res.status(404).json({ error: '答卷不存在' });
    return;
  }
  res.json(result);
}

export async function updateResponseNote(req: Request, res: Response): Promise<void> {
  const { note } = req.body;
  if (typeof note !== 'string') {
    res.status(400).json({ error: 'note 必须是字符串' });
    return;
  }
  const result = await responseService.updateResponseNote(req.params.responseId, note);
  if (!result) {
    res.status(404).json({ error: '答卷不存在' });
    return;
  }
  res.json(result);
}

export async function batchUpdateTags(req: Request, res: Response): Promise<void> {
  const { tags, mode, answerFilters, tagFilters, submitFrom, submitTo, segmentId, responseIds } = req.body;
  if (!Array.isArray(tags)) {
    res.status(400).json({ error: 'tags 必须是数组' });
    return;
  }
  const result = await responseService.batchUpdateTags(
    req.params.id,
    { answerFilters, tagFilters, submitFrom, submitTo, segmentId, responseIds },
    tags,
    mode ?? 'add'
  );
  res.json(result);
}

export async function batchUpdateNotes(req: Request, res: Response): Promise<void> {
  const { note, answerFilters, tagFilters, submitFrom, submitTo, segmentId, responseIds } = req.body;
  if (typeof note !== 'string') {
    res.status(400).json({ error: 'note 必须是字符串' });
    return;
  }
  const result = await responseService.batchUpdateNotes(
    req.params.id,
    { answerFilters, tagFilters, submitFrom, submitTo, segmentId, responseIds },
    note
  );
  res.json(result);
}

export async function listSegments(req: Request, res: Response): Promise<void> {
  const segments = await responseService.getSegments(req.params.id);
  res.json(segments);
}

export async function createSegment(req: Request, res: Response): Promise<void> {
  const { name, description, answerFilters, tagFilters, submitFrom, submitTo } = req.body;
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'name 不能为空' });
    return;
  }
  const seg = await responseService.createSegment(req.params.id, {
    name,
    description: description ?? '',
    answerFilters: answerFilters ?? {},
    tagFilters: tagFilters ?? [],
    submitFrom: submitFrom ?? null,
    submitTo: submitTo ?? null,
  });
  res.status(201).json(seg);
}

export async function updateSegment(req: Request, res: Response): Promise<void> {
  const seg = await responseService.updateSegment(req.params.segmentId, req.body);
  if (!seg) {
    res.status(404).json({ error: '人群包不存在' });
    return;
  }
  res.json(seg);
}

export async function deleteSegment(req: Request, res: Response): Promise<void> {
  const ok = await responseService.deleteSegment(req.params.segmentId);
  if (!ok) {
    res.status(404).json({ error: '人群包不存在' });
    return;
  }
  res.json({ success: true });
}

export async function listSavedViews(req: Request, res: Response): Promise<void> {
  const views = await responseService.getSavedViews(req.params.id);
  res.json(views);
}

export async function createSavedView(req: Request, res: Response): Promise<void> {
  const { name, tab, segmentId, trendGranularity, trendDays, groupQuestionId, targetQuestionId } = req.body;
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'name 不能为空' });
    return;
  }
  const v = await responseService.createSavedView(req.params.id, {
    name,
    tab: tab ?? 'overview',
    segmentId: segmentId ?? null,
    trendGranularity: trendGranularity ?? 'day',
    trendDays: trendDays ?? 14,
    groupQuestionId: groupQuestionId ?? null,
    targetQuestionId: targetQuestionId ?? null,
  });
  res.status(201).json(v);
}

export async function updateSavedView(req: Request, res: Response): Promise<void> {
  const v = await responseService.updateSavedView(req.params.viewId, req.body);
  if (!v) {
    res.status(404).json({ error: '视图不存在' });
    return;
  }
  res.json(v);
}

export async function cloneSavedView(req: Request, res: Response): Promise<void> {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'name 不能为空' });
    return;
  }
  const v = await responseService.cloneSavedView(req.params.viewId, name);
  if (!v) {
    res.status(404).json({ error: '视图不存在' });
    return;
  }
  res.status(201).json(v);
}

export async function deleteSavedView(req: Request, res: Response): Promise<void> {
  const ok = await responseService.deleteSavedView(req.params.viewId);
  if (!ok) {
    res.status(404).json({ error: '视图不存在' });
    return;
  }
  res.json({ success: true });
}
