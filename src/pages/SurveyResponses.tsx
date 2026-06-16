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
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { surveyApi } from '../lib/api.js';
import { useSurveyStore } from '../store/surveyStore.js';
import type { SurveyResponse } from '../../shared/types.js';

type FilterMap = Record<string, string[]>;

export default function SurveyResponses() {
  const { id } = useParams<{ id: string }>();
  const { currentSurvey, fetchSurvey } = useSurveyStore();
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [allResponses, setAllResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterMap>({});
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchSurvey(id);
  }, [id, fetchSurvey]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    surveyApi
      .listResponses(id)
      .then((data) => {
        setAllResponses(data);
        setResponses(data);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const activeFilter: Record<string, string[]> = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v && v.length > 0) activeFilter[k] = v;
    });

    if (Object.keys(activeFilter).length === 0) {
      setResponses(allResponses);
      return;
    }

    const filtered = allResponses.filter((resp) =>
      Object.entries(activeFilter).every(([qId, filterValues]) => {
        const answer = resp.answers[qId];
        if (!answer) return false;

        if (Array.isArray(answer)) {
          return filterValues.some((fv) => answer.includes(fv));
        }
        return filterValues.includes(String(answer));
      })
    );
    setResponses(filtered);
  }, [filters, allResponses]);

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
  const totalActiveFilters = Object.values(filters).reduce((s, arr) => s + (arr?.length ?? 0), 0);
  const duplicateCount = allResponses.filter((r) => r.isDuplicate).length;

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
    const activeFilter: Record<string, string[]> = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v && v.length > 0) activeFilter[k] = v;
    });
    const url = surveyApi.exportResponsesUrl(
      id,
      Object.keys(activeFilter).length > 0 ? activeFilter : undefined
    );
    window.open(url, '_blank');
  }

  function toggleFilter(qId: string, value: string) {
    setFilters((prev) => {
      const current = prev[qId] ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [qId]: next };
    });
  }

  function clearQuestionFilter(qId: string) {
    setFilters((prev) => {
      const next = { ...prev };
      delete next[qId];
      return next;
    });
  }

  function clearFilters() {
    setFilters({});
  }

  function copyBrowserId(id: string, bid: string) {
    if (!bid) return;
    navigator.clipboard?.writeText(bid).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  return (
    <div className="container py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-serif font-semibold text-slate-800">答卷管理</h2>
          <p className="text-sm text-slate-500 mt-1">
            显示 <span className="font-medium text-slate-700">{responses.length}</span> / {allResponses.length} 份答卷
            {totalActiveFilters > 0 && (
              <span className="ml-2 text-primary-600">（{totalActiveFilters} 个筛选条件）</span>
            )}
            {duplicateCount > 0 && (
              <span className="ml-3 inline-flex items-center gap-1 text-amber-600">
                <AlertTriangle className="w-3.5 h-3.5" />
                检测到 {duplicateCount} 份疑似重复
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
              showFilterPanel || totalActiveFilters > 0
                ? 'bg-primary-600 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            筛选
            {totalActiveFilters > 0 && (
              <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                {totalActiveFilters}
              </span>
            )}
          </button>
          <button
            onClick={handleExport}
            disabled={responses.length === 0}
            className="btn-accent inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            导出 Excel ({responses.length})
          </button>
        </div>
      </div>

      {showFilterPanel && filterableQuestions.length > 0 && (
        <div className="card p-5 mb-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">按题目选项筛选（多题叠加，同题多值为或）</span>
            </div>
            {totalActiveFilters > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                清除全部
              </button>
            )}
          </div>
          <div className="space-y-4">
            {filterableQuestions.map((q) => {
              const selected = filters[q.id] ?? [];
              return (
                <div key={q.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-slate-600">
                      {q.title || '未命名题目'}
                      {selected.length > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs">
                          已选 {selected.length}
                        </span>
                      )}
                    </div>
                    {selected.length > 0 && (
                      <button
                        onClick={() => clearQuestionFilter(q.id)}
                        className="text-xs text-slate-400 hover:text-slate-600 inline-flex items-center gap-0.5"
                      >
                        <X className="w-3 h-3" />清除
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {q.options?.map((opt) => {
                      const active = selected.includes(opt.value);
                      return (
                        <button
                          key={opt.id}
                          onClick={() => toggleFilter(q.id, opt.value)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-colors border ${
                            active
                              ? 'bg-primary-600 text-white border-primary-600'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {active && <Check className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />}
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {responses.length === 0 ? (
        <div className="card p-16 text-center">
          <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="font-serif font-semibold text-lg text-slate-700 mb-2">
            {allResponses.length === 0 ? '暂无答卷' : '没有符合筛选条件的答卷'}
          </h3>
          <p className="text-slate-500">
            {allResponses.length === 0 ? '当用户提交答卷后，将在此处显示' : '请调整或清除筛选条件'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {responses.map((resp, idx) => (
            <div
              key={resp.id}
              className={`card overflow-hidden animate-slide-up ${resp.isDuplicate ? 'ring-2 ring-amber-200' : ''}`}
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <button
                onClick={() => setExpandedId(expandedId === resp.id ? null : resp.id)}
                className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-9 h-9 rounded-full text-white flex items-center justify-center text-sm font-semibold ${
                      resp.isDuplicate
                        ? 'bg-gradient-to-br from-amber-400 to-amber-600'
                        : 'bg-gradient-to-br from-primary-500 to-primary-700'
                    }`}
                  >
                    {responses.length - idx}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      答卷 #{resp.id.slice(-6)}
                      {resp.isDuplicate && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs border border-amber-200">
                          <AlertTriangle className="w-3 h-3" />
                          疑似重复
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <span>{new Date(resp.submittedAt).toLocaleString('zh-CN')}</span>
                      <span>·</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyBrowserId(resp.id, resp.browserId);
                        }}
                        className="inline-flex items-center gap-1 hover:text-slate-600"
                      >
                        {copiedId === resp.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-600">已复制</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>浏览器: {resp.browserId ? resp.browserId.slice(0, 8) : '未知'}</span>
                          </>
                        )}
                      </button>
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
