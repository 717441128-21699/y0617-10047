export type QuestionType = 'single' | 'multiple' | 'dropdown' | 'text' | 'rating' | 'matrix';

export interface Option {
  id: string;
  label: string;
  value: string;
}

export interface MatrixDimension {
  id: string;
  label: string;
  value: string;
}

export type LogicCondition = 'equals' | 'not_equals' | 'contains' | 'not_contains';
export type LogicAction = 'show' | 'skip';

export interface LogicRule {
  id: string;
  questionId: string;
  condition: LogicCondition;
  value: string | string[];
  action: LogicAction;
  targetQuestionId: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  required: boolean;
  options?: Option[];
  maxRating?: number;
  rows?: MatrixDimension[];
  columns?: MatrixDimension[];
  logic?: LogicRule[];
}

export interface SurveySettings {
  startTime: string | null;
  endTime: string | null;
  maxResponses: number | null;
  password: string | null;
}

export type SurveyStatus = 'draft' | 'published' | 'closed';

export interface Survey {
  id: string;
  token: string;
  title: string;
  description: string;
  status: SurveyStatus;
  questions: Question[];
  settings: SurveySettings;
  createdAt: string;
  updatedAt: string;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  answers: Record<string, unknown>;
  submittedAt: string;
  respondentIp: string;
  browserId: string;
  isDuplicate?: boolean;
}

export interface SurveyListItem {
  id: string;
  token: string;
  title: string;
  status: SurveyStatus;
  responseCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsOption {
  label: string;
  count: number;
  percentage: number;
}

export interface QuestionAnalytics {
  questionId: string;
  questionTitle: string;
  questionType: QuestionType;
  responseCount: number;
  skippedCount: number;
  options?: AnalyticsOption[];
  average?: number;
  min?: number;
  max?: number;
  matrixRows?: MatrixDimension[];
  matrixCols?: MatrixDimension[];
  matrixData?: Record<string, AnalyticsOption[]>;
}

export interface SurveyAnalytics {
  totalResponses: number;
  questions: QuestionAnalytics[];
}
