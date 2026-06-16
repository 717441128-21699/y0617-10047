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
    res.status(400).json({ error: result.error, duplicate: result.error === '您已经提交过答卷了' });
    return;
  }
  res.status(201).json(result);
}

export async function listResponses(req: Request, res: Response): Promise<void> {
  const filters = req.query.filters ? (JSON.parse(String(req.query.filters)) as Record<string, string | string[]>) : undefined;
  const responses = await responseService.getResponses(req.params.id, filters);
  res.json(responses);
}

export async function exportResponses(req: Request, res: Response): Promise<void> {
  const survey = await surveyService.getSurveyById(req.params.id);
  if (!survey) {
    res.status(404).json({ error: '问卷不存在' });
    return;
  }
  const filters = req.query.filters ? (JSON.parse(String(req.query.filters)) as Record<string, string | string[]>) : undefined;
  const responses = await responseService.getResponses(req.params.id, filters);

  const headerRow = ['提交时间', '浏览器ID', '是否重复', ...survey.questions.map((q) => q.title)];
  const dataRows = responses.map((r) => {
    const row: (string | number)[] = [
      r.submittedAt,
      r.browserId ? r.browserId.slice(0, 12) : '',
      r.isDuplicate ? '是' : '',
    ];
    survey.questions.forEach((q) => {
      const answer = r.answers[q.id];
      if (answer === undefined || answer === null) {
        row.push('');
      } else if (Array.isArray(answer)) {
        const labels = answer
          .map((v) => q.options?.find((o) => o.value === v)?.label ?? String(v))
          .join('、');
        row.push(labels);
      } else if (typeof answer === 'object') {
        const parts: string[] = [];
        q.rows?.forEach((rowItem) => {
          const val = (answer as Record<string, string>)[rowItem.id];
          const colLabel = q.columns?.find((c) => c.value === val)?.label ?? String(val ?? '');
          parts.push(`${rowItem.label}: ${colLabel}`);
        });
        row.push(parts.join('；'));
      } else {
        if (q.options) {
          row.push(q.options.find((o) => o.value === String(answer))?.label ?? String(answer));
        } else {
          row.push(String(answer));
        }
      }
    });
    return row;
  });

  const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '答卷数据');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  const filename = encodeURIComponent(`${survey.title}_答卷数据${filters ? '（已筛选）' : ''}.xlsx`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
  res.send(buffer);
}

export async function getAnalytics(req: Request, res: Response): Promise<void> {
  const analytics = await responseService.getAnalytics(req.params.id);
  if (!analytics) {
    res.status(404).json({ error: '问卷不存在' });
    return;
  }
  res.json(analytics);
}
