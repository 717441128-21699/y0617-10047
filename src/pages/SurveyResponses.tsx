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
  Tag,
  MessageSquareText,
  Plus,
  Trash2,
  StickyNote,
  Sparkles,
} from 'lucide-react';
import { surveyApi } from '../lib/api.js';
import { useSurveyStore } from '../store/surveyStore.js';
import { formatAnswerForDisplay } from '../lib/surveyUtils.js';
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

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchPanel, setShowBatchPanel] = useState(false);
  const [batchTagInput, setBatchTagInput] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

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
  const duplicateCount = allResponses.filter((r) => r.duplicateCount > 0).length;

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

  function copyBrowserId(respId: string, bid: string) {
    if (!bid) return;
    navigator.clipboard?.writeText(bid).then(() => {
      setCopiedId(respId);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  function toggleSelect(respId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(respId)) next.delete(respId);
      else next.add(respId);
      return next;
    });
  }

  function selectAll() {
    if (selectedIds.size === responses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(responses.map((r) => r.id)));
    }
  }

  async function handleBatchAddTag() {
    if (!id || !batchTagInput.trim()) return;
    const tag = batchTagInput.trim();
    const targetIds =
      selectedIds.size > 0
        ? Array.from(selectedIds)
        : responses.map((r) => r.id);
    try {
      await surveyApi.batchUpdateTags(id, {
        tags: [tag],
        mode: 'add',
        responseIds: targetIds,
      });
      setBatchTagInput('');
      setShowBatchPanel(false);
      setSelectedIds(new Set());
      if (id) {
        const data = await surveyApi.listResponses(id);
        setAllResponses(data);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败');
    }
  }

  async function saveNote(respId: string) {
    try {
      await surveyApi.updateResponseNote(respId, noteDraft);
      setEditingNoteId(null);
      setNoteDraft('');
      if (id) {
        const data = await surveyApi.listResponses(id);
        setAllResponses(data);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : '保存失败');
    }
  }

  async function addTag(respId: string, tag: string) {
    const resp = allResponses.find((r) => r.id === respId);
    if (!resp || !tag.trim()) return;
    const nextTags = [...new Set([...resp.tags, tag.trim()])];
    try {
      await surveyApi.updateResponseTags(respId, nextTags);
      if (id) {
        const data = await surveyApi.listResponses(id);
        setAllResponses(data);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : '保存失败');
    }
  }

  async function removeTag(respId: string, tag: string) {
    const resp = allResponses.find((r) => r.id === respId);
    if (!resp) return;
    const nextTags = resp.tags.filter((t) => t !== tag);
    try {
      await surveyApi.updateResponseTags(respId, nextTags);
      if (id) {
        const data = await surveyApi.listResponses(id);
        setAllResponses(data);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : '保存失败');
    }
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
                {duplicateCount} 份有拦截记录
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
            onClick={() => setShowBatchPanel(!showBatchPanel)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
              showBatchPanel
                ? 'bg-violet-600 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Tag className="w-4 h-4" />
            批量打标
            {selectedIds.size > 0 && (
              <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                已选 {selectedIds.size}
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

      {showBatchPanel && (
        <div className="card p-5 mb-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-medium text-slate-700">
                批量添加标签
                {selectedIds.size > 0 ? `（已选 ${selectedIds.size} 份）` : '（应用于当前筛选结果）'}
              </span>
            </div>
            {responses.length > 0 && (
              <button
                onClick={selectAll}
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                {selectedIds.size === responses.length ? '取消全选' : '全选当前页'}
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={batchTagInput}
              onChange={(e) => setBatchTagInput(e.target.value)}
              placeholder="输入标签名称，如：重点关注、有效样本..."
              className="input flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleBatchAddTag()}
            />
            <button onClick={handleBatchAddTag} className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              添加标签
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            提示：勾选左侧复选框可指定答卷，不勾选则对当前筛选结果全部生效
          </p>
        </div>
      )}

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
              className={`card overflow-hidden animate-slide-up ${resp.duplicateCount > 0 ? 'ring-2 ring-amber-200' : ''}`}
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <button
                onClick={() => setExpandedId(expandedId === resp.id ? null : resp.id)}
                className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(resp.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelect(resp.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div
                    className={`w-9 h-9 rounded-full text-white flex items-center justify-center text-sm font-semibold ${
                      resp.isDuplicate
                        ? 'bg-gradient-to-br from-amber-400 to-amber-600'
                        : 'bg-gradient-to-br from-primary-500 to-primary-700'
                    }`}
                  >
                    {responses.length - idx}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-700 flex items-center gap-2 flex-wrap">
                      答卷 #{resp.id.slice(-6)}
                      {resp.duplicateCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs border border-amber-200">
                          <AlertTriangle className="w-3 h-3" />
                          拦截 {resp.duplicateCount} 次
                        </span>
                      )}
                      {resp.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="inline-flex items-center px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full text-xs border border-violet-200">
                          {tag}
                        </span>
                      ))}
                      {resp.tags.length > 3 && (
                        <span className="text-xs text-slate-400">+{resp.tags.length - 3}</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
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
                      {resp.note && (
                        <>
                          <span>·</span>
                          <StickyNote className="w-3 h-3 text-amber-500" />
                          <span className="truncate max-w-[120px]">{resp.note}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    {Object.keys(resp.answers).filter(
                      (k) => resp.answers[k] !== undefined && resp.answers[k] !== null && resp.answers[k] !== ''
                    ).length} / {questions.length} 题已答
                  </span>
                  {expandedId === resp.id ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </button>

              {expandedId === resp.id && (
                <div className="px-5 pb-5 pt-2 border-t border-slate-100">
                  <div className="mb-5 p-4 bg-amber-50/60 rounded-xl border border-amber-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquareText className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-800">内部备注</span>
                      </div>
                      {editingNoteId !== resp.id && (
                        <button
                          onClick={() => {
                            setEditingNoteId(resp.id);
                            setNoteDraft(resp.note);
                          }}
                          className="text-xs text-amber-600 hover:text-amber-700"
                        >
                          {resp.note ? '编辑' : '添加备注'}
                        </button>
                      )}
                    </div>
                    {editingNoteId === resp.id ? (
                      <div className="mt-3 flex gap-2">
                        <input
                          type="text"
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          className="input flex-1 text-sm"
                          placeholder="输入备注内容..."
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && saveNote(resp.id)}
                        />
                        <button onClick={() => saveNote(resp.id)} className="btn-primary text-sm">
                          保存
                        </button>
                        <button
                          onClick={() => {
                            setEditingNoteId(null);
                            setNoteDraft('');
                          }}
                          className="px-3 py-2 text-slate-500 hover:text-slate-700 text-sm"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-amber-700 mt-2">
                        {resp.note || <span className="text-amber-400/70">暂无备注</span>}
                      </p>
                    )}
                  </div>

                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-violet-500" />
                        <span className="text-sm font-medium text-slate-700">标签</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      {resp.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-50 text-violet-700 rounded-full text-sm border border-violet-200 group"
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(resp.id, tag)}
                            className="opacity-0 group-hover:opacity-100 hover:text-violet-900 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <AddTagInline onAdd={(t) => addTag(resp.id, t)} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {questions.map((q, qIdx) => (
                      <div key={q.id} className="py-2">
                        <div className="text-xs text-slate-400 mb-1">第 {qIdx + 1} 题</div>
                        <div className="text-sm font-medium text-slate-700 mb-1.5">{q.title || '未命名题目'}</div>
                        <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl whitespace-pre-wrap break-words">
                          {formatAnswerForDisplay(q, resp.answers[q.id])}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddTagInline({ onAdd }: { onAdd: (tag: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState('');

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-violet-500 border border-dashed border-violet-300 rounded-full text-sm hover:bg-violet-50"
      >
        <Plus className="w-3 h-3" />
        添加
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-24 px-2 py-1 text-sm border border-violet-300 rounded-full focus:outline-none focus:ring-2 focus:ring-violet-200"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) {
            onAdd(value.trim());
            setValue('');
            setAdding(false);
          } else if (e.key === 'Escape') {
            setAdding(false);
          }
        }}
        onBlur={() => {
          if (value.trim()) onAdd(value.trim());
          setAdding(false);
        }}
      />
    </div>
  );
}
