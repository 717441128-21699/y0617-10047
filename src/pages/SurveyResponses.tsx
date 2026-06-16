import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  FileSpreadsheet,
  Filter,
  Download,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Search,
  X,
} from 'lucide-react';
import { surveyApi } from '../lib/api.js';
import { useSurveyStore } from '../store/surveyStore.js';
import type { SurveyResponse } from '../../shared/types.js';

export default function SurveyResponses() {
  const { id } = useParams<{ id: string }>();
  const { currentSurvey, fetchSurvey } = useSurveyStore();
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchSurvey(id);
  }, [id, fetchSurvey]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const filterObj: Record<string, string | string[]> = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v) filterObj[k] = v;
    });
    surveyApi
      .listResponses(id, Object.keys(filterObj).length > 0 ? filterObj : undefined)
      .then(setResponses)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, filters]);

  if (loading) return <div className="container py-16 text-center text-slate-400">加载中...</div>;
  if (error) {
    return (
      <div className="container py-16 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <p className="text-slate-500">{error}</p>
      </div>
    );
  }

  const questions = currentSurvey?.questions ?? [];
  const filterableQuestions = questions.filter((q) => ['single', 'dropdown', 'multiple'].includes(q.type));

  function formatAnswer(qId: string, value: unknown): string {
    const q = questions.find((qq) => qq.id === qId);
    if (!q || value === undefined || value === null) return '—';
    if (Array.isArray(value)) {
      return value
        .map((v) => q.options?.find((o) => o.value === v)?.label ?? String(v))
        .join('、');
    }
    if (typeof value === 'object') {
      const parts: string[] = [];
      q.rows?.forEach((r) => {
        const v = (value as Record<string, string>)[r.id];
        const col = q.columns?.find((c) => c.value === v);
        parts.push(`${r.label}: ${col?.label ?? '—'}`);
      });
      return parts.join('；');
    }
    if (q.options) {
      return q.options.find((o) => o.value === String(value))?.label ?? String(value);
    }
    return String(value);
  }

  function handleExport() {
    if (!id) return;
    const filterObj: Record<string, string | string[]> = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v) filterObj[k] = v;
    });
    const url = surveyApi.exportResponsesUrl(
      id,
      Object.keys(filterObj).length > 0 ? filterObj : undefined
    );
    window.open(url, '_blank');
  }

  function toggleFilter(qId: string, value: string) {
    setFilters((prev) => {
      const next = { ...prev };
      if (next[qId] === value) delete next[qId];
      else next[qId] = value;
      return next;
    });
  }

  function clearFilters() {
    setFilters({});
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-serif font-semibold text-slate-800">答卷管理</h2>
          <p className="text-sm text-slate-500 mt-1">
            共 {responses.length} 份答卷
            {Object.keys(filters).length > 0 && (
              <span className="ml-2 text-primary-600">（已筛选）</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
              showFilterPanel || Object.keys(filters).length > 0
                ? 'bg-primary-600 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            筛选
            {Object.keys(filters).length > 0 && (
              <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                {Object.keys(filters).length}
              </span>
            )}
          </button>
          <button
            onClick={handleExport}
            disabled={responses.length === 0}
            className="btn-accent inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            导出 Excel
          </button>
        </div>
      </div>

      {showFilterPanel && filterableQuestions.length > 0 && (
        <div className="card p-5 mb-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">按题目选项筛选</span>
            </div>
            {Object.keys(filters).length > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                清除筛选
              </button>
            )}
          </div>
          <div className="space-y-4">
            {filterableQuestions.map((q) => (
              <div key={q.id}>
                <div className="text-sm font-medium text-slate-600 mb-2">{q.title || '未命名题目'}</div>
                <div className="flex flex-wrap gap-2">
                  {q.options?.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => toggleFilter(q.id, opt.value)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        filters[q.id] === opt.value
                          ? 'bg-primary-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {responses.length === 0 ? (
        <div className="card p-16 text-center">
          <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="font-serif font-semibold text-lg text-slate-700 mb-2">暂无答卷</h3>
          <p className="text-slate-500">当用户提交答卷后，将在此处显示</p>
        </div>
      ) : (
        <div className="space-y-3">
          {responses.map((resp, idx) => (
            <div key={resp.id} className="card overflow-hidden animate-slide-up" style={{ animationDelay: `${idx * 30}ms` }}>
              <button
                onClick={() => setExpandedId(expandedId === resp.id ? null : resp.id)}
                className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center text-sm font-semibold">
                    {responses.length - idx}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-slate-700">
                      答卷 #{resp.id.slice(-6)}
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(resp.submittedAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    {Object.keys(resp.answers).filter((k) => resp.answers[k] !== undefined && resp.answers[k] !== null && resp.answers[k] !== '').length} / {questions.length} 题已答
                  </span>
                  {expandedId === resp.id ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </button>
              {expandedId === resp.id && (
                <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-4">
                  {questions.map((q, qIdx) => (
                    <div key={q.id} className="py-2">
                      <div className="text-xs text-slate-400 mb-1">第 {qIdx + 1} 题</div>
                      <div className="text-sm font-medium text-slate-700 mb-1.5">{q.title || '未命名题目'}</div>
                      <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl whitespace-pre-wrap break-words">
                        {formatAnswer(q.id, resp.answers[q.id])}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
