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
  tags: string[];
  note: string;
  duplicateCount: number;
  lastDuplicateAt: string | null;
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

export interface TrendDataPoint {
  time: string;
  submissions: number;
  completionRate: number;
  avgRating?: number;
}

export type TrendGranularity = 'day' | 'hour';

export interface TrendResult {
  points: TrendDataPoint[];
  total: number;
  avgCompletionRate: number;
}

export interface CrossTabOption {
  label: string;
  value: string;
  count: number;
  percentage: number;
  avgRating?: number;
}

export interface CrossTabGroup {
  groupLabel: string;
  groupValue: string;
  totalCount: number;
  options: CrossTabOption[];
  avgRating?: number;
}

export interface CrossTabResult {
  groupQuestionTitle: string;
  targetQuestionTitle: string;
  targetType: QuestionType;
  groups: CrossTabGroup[];
  overallOptions?: CrossTabOption[];
  overallAvgRating?: number;
  hasData: boolean;
}

export interface Segment {
  id: string;
  surveyId: string;
  name: string;
  description: string;
  answerFilters: Record<string, string[]>;
  tagFilters: string[];
  submitFrom: string | null;
  submitTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AnalyticsTab = 'overview' | 'trend' | 'crosstab';

export interface SavedAnalysisView {
  id: string;
  surveyId: string;
  name: string;
  tab: AnalyticsTab;
  segmentId: string | null;
  trendGranularity: TrendGranularity;
  trendDays: number;
  groupQuestionId: string | null;
  targetQuestionId: string | null;
  createdAt: string;
  updatedAt: string;
}
