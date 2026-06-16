import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Users,
  Save,
  Calendar,
  ListChecks,
  Edit3,
} from 'lucide-react';
import { surveyApi, type FilterOptions } from '../lib/api.js';
import { useSurveyStore } from '../store/surveyStore.js';
import { formatAnswerForDisplay } from '../lib/surveyUtils.js';
import type { SurveyResponse, Segment } from '../../shared/types.js';

type FilterMap = Record<string, string[]>;

function formatDateTimeShort(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${mi}`;
}

export default function SurveyResponses() {
  const { id } = useParams<{ id: string }>();
  const { currentSurvey, fetchSurvey } = useSurveyStore();

  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [allResponses, setAllResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answerFilters, setAnswerFilters] = useState<FilterMap>({});
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [submitFrom, setSubmitFrom] = useState('');
  const [submitTo, setSubmitTo] = useState('');
  const [segmentId, setSegmentId] = useState<string>('');
  const [segments, setSegments] = useState<Segment[]>([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchPanel, setShowBatchPanel] = useState(false);
  const [batchTab, setBatchTab] = useState<'tags' | 'notes'>('tags');
  const [batchTagInput, setBatchTagInput] = useState('');
  const [batchNote, setBatchNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  const [showSegmentModal, setShowSegmentModal] = useState(false);
  const [segmentName, setSegmentName] = useState('');
  const [segmentDescription, setSegmentDescription] = useState('');
  const [savingSegment, setSavingSegment] = useState(false);

  const questions = currentSurvey?.questions ?? [];
  const filterableQuestions = questions.filter((q) => ['single', 'dropdown', 'multiple'].includes(q.type));
  const totalActiveAnswerFilters = Object.values(answerFilters).reduce((s, arr) => s + (arr?.length ?? 0), 0);
  const totalActiveFilters = totalActiveAnswerFilters + tagFilters.length + (submitFrom ? 1 : 0) + (submitTo ? 1 : 0);
  const duplicateCount = allResponses.filter((r) => r.duplicateCount > 0).length;

  const allTags = useMemo(() => {
    const set = new Set<string>();
    allResponses.forEach((r) => r.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [allResponses]);

  const buildFilterOptions = useCallback((): FilterOptions => {
    const activeAnswerFilters: Record<string, string[]> = {};
    Object.entries(answerFilters).forEach(([k, v]) => {
      if (v && v.length > 0) activeAnswerFilters[k] = v;
    });
    const opts: FilterOptions = {};
    if (Object.keys(activeAnswerFilters).length > 0) opts.answerFilters = activeAnswerFilters;
    if (tagFilters.length > 0) opts.tagFilters = [...tagFilters];
    if (submitFrom) opts.submitFrom = submitFrom;
    if (submitTo) opts.submitTo = submitTo;
    if (segmentId) opts.segmentId = segmentId;
    return opts;
  }, [answerFilters, tagFilters, submitFrom, submitTo, segmentId]);

  const loadSegments = useCallback(async () => {
    if (!id) return;
    try {
      const data = await surveyApi.listSegments(id);
      setSegments(data);
    } catch (e) {
      console.error('加载人群包失败', e);
    }
  }, [id]);

  const refreshResponses = useCallback(async () => {
    if (!id) return;
    const opts = buildFilterOptions();
    const data = await surveyApi.listResponses(id, opts);
    setAllResponses(data);
    setResponses(data);
  }, [id, buildFilterOptions]);

  useEffect(() => {
    if (id) fetchSurvey(id);
  }, [id, fetchSurvey]);

  useEffect(() => {
    loadSegments();
  }, [loadSegments]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const opts = buildFilterOptions();
    surveyApi
      .listResponses(id, opts)
      .then((data) => {
        setAllResponses(data);
        setResponses(data);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, buildFilterOptions]);

  useEffect(() => {
    if (segmentId) {
      const seg = segments.find((s) => s.id === segmentId);
      if (seg) {
        setAnswerFilters(seg.answerFilters || {});
        setTagFilters(seg.tagFilters || []);
        setSubmitFrom(seg.submitFrom || '');
        setSubmitTo(seg.submitTo || '');
      }
    }
  }, [segmentId, segments]);

  if (loading) return <div className="container py-16 text-center text-slate-400">加载中...</div>;
  if (error) {
    return (
      <div className="container py-16 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <p className="text-slate-500">{error}</p>
      </div>
    );
  }

  function handleExport() {
    if (!id) return;
    const opts = buildFilterOptions();
    const url = surveyApi.exportResponsesUrl(id, Object.keys(opts).length > 0 ? opts : undefined);
    window.open(url, '_blank');
  }

  function toggleAnswerFilter(qId: string, value: string) {
    setAnswerFilters((prev) => {
      const current = prev[qId] ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [qId]: next };
    });
  }

  function clearQuestionFilter(qId: string) {
    setAnswerFilters((prev) => {
      const next = { ...prev };
      delete next[qId];
      return next;
    });
  }

  function clearFilters() {
    setAnswerFilters({});
    setTagFilters([]);
    setSubmitFrom('');
    setSubmitTo('');
  }

  function toggleTagFilter(tag: string) {
    setTagFilters((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
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
        : undefined;
    const opts = buildFilterOptions();
    try {
      await surveyApi.batchUpdateTags(id, {
        tags: [tag],
        mode: 'add',
        responseIds: targetIds,
        ...opts,
      });
      setBatchTagInput('');
      setShowBatchPanel(false);
      setSelectedIds(new Set());
      await refreshResponses();
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败');
    }
  }

  async function handleBatchUpdateNotes() {
    if (!id) return;
    const targetIds =
      selectedIds.size > 0
        ? Array.from(selectedIds)
        : undefined;
    const opts = buildFilterOptions();
    try {
      await surveyApi.batchUpdateNotes(id, {
        note: batchNote,
        responseIds: targetIds,
        ...opts,
      });
      setBatchNote('');
      setShowBatchPanel(false);
      setSelectedIds(new Set());
      await refreshResponses();
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败');
    }
  }

  async function saveNote(respId: string) {
    try {
      await surveyApi.updateResponseNote(respId, noteDraft);
      setEditingNoteId(null);
      setNoteDraft('');
      await refreshResponses();
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
      await refreshResponses();
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
      await refreshResponses();
    } catch (e) {
      alert(e instanceof Error ? e.message : '保存失败');
    }
  }

  function openSegmentModal() {
    setSegmentName('');
    setSegmentDescription('');
    setShowSegmentModal(true);
  }

  async function handleCreateSegment() {
    if (!id || !segmentName.trim()) return;
    setSavingSegment(true);
    try {
      const activeAnswerFilters: Record<string, string[]> = {};
      Object.entries(answerFilters).forEach(([k, v]) => {
        if (v && v.length > 0) activeAnswerFilters[k] = v;
      });
      await surveyApi.createSegment(id, {
        name: segmentName.trim(),
        description: segmentDescription.trim() || undefined,
        answerFilters: Object.keys(activeAnswerFilters).length > 0 ? activeAnswerFilters : undefined,
        tagFilters: tagFilters.length > 0 ? [...tagFilters] : undefined,
        submitFrom: submitFrom || null,
        submitTo: submitTo || null,
      });
      setShowSegmentModal(false);
      setSegmentName('');
      setSegmentDescription('');
      await loadSegments();
    } catch (e) {
      alert(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSavingSegment(false);
    }
  }

  async function handleDeleteSegment(segId: string) {
    if (!confirm('确定删除此人群包吗？')) return;
    try {
      await surveyApi.deleteSegment(segId);
      if (segmentId === segId) setSegmentId('');
      await loadSegments();
    } catch (e) {
      alert(e instanceof Error ? e.message : '删除失败');
    }
  }

  const currentSegment = segments.find((s) => s.id === segmentId);

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
            {currentSegment && (
              <span className="ml-2 inline-flex items-center gap-1 text-indigo-600">
                <Users className="w-3.5 h-3.5" />
                人群包: {currentSegment.name}
              </span>
            )}
            {duplicateCount > 0 && (
              <span className="ml-3 inline-flex items-center gap-1 text-amber-600">
                <AlertTriangle className="w-3.5 h-3.5" />
                {duplicateCount} 份有拦截记录
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <select
              value={segmentId}
              onChange={(e) => setSegmentId(e.target.value)}
              className="appearance-none pl-10 pr-10 py-2.5 rounded-full text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 min-w-[160px]"
            >
              <option value="">全部样本</option>
              {segments.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
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
            {batchTab === 'tags' ? <Tag className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            批量操作
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
            <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1">
              <button
                onClick={() => setBatchTab('tags')}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  batchTab === 'tags'
                    ? 'bg-white text-violet-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                批量打标
              </button>
              <button
                onClick={() => setBatchTab('notes')}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  batchTab === 'notes'
                    ? 'bg-white text-amber-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <StickyNote className="w-4 h-4" />
                批量备注
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                {selectedIds.size > 0 ? `已选 ${selectedIds.size} 份` : '应用于当前筛选结果'}
              </span>
              {responses.length > 0 && (
                <button
                  onClick={selectAll}
                  className="text-xs text-primary-600 hover:text-primary-700"
                >
                  {selectedIds.size === responses.length ? '取消全选' : '全选当前页'}
                </button>
              )}
            </div>
          </div>
          {batchTab === 'tags' ? (
            <>
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
            </>
          ) : (
            <>
              <div className="space-y-3">
                <textarea
                  value={batchNote}
                  onChange={(e) => setBatchNote(e.target.value)}
                  placeholder="输入备注内容，将批量写入所有目标答卷的内部备注（支持多行）..."
                  className="input min-h-[100px] resize-y w-full"
                />
                <div className="flex justify-end">
                  <button onClick={handleBatchUpdateNotes} className="btn-accent inline-flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    确认写入备注
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                提示：勾选左侧复选框可指定答卷，不勾选则对当前筛选结果全部生效；会覆盖原有备注内容
              </p>
            </>
          )}
        </div>
      )}

      {showFilterPanel && (
        <div className="card p-5 mb-6 animate-slide-up space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">筛选条件</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={openSegmentModal}
                className="text-sm text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                保存为人群包
              </button>
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
          </div>

          {allTags.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-violet-500" />
                  标签筛选
                  {tagFilters.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-full text-xs">
                      已选 {tagFilters.length}（全部包含）
                    </span>
                  )}
                </div>
                {tagFilters.length > 0 && (
                  <button
                    onClick={() => setTagFilters([])}
                    className="text-xs text-slate-400 hover:text-slate-600 inline-flex items-center gap-0.5"
                  >
                    <X className="w-3 h-3" />清除
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => {
                  const active = tagFilters.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTagFilter(tag)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors border ${
                        active
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {active && <Check className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />}
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-500" />
                提交时间范围
              </div>
              {(submitFrom || submitTo) && (
                <button
                  onClick={() => { setSubmitFrom(''); setSubmitTo(''); }}
                  className="text-xs text-slate-400 hover:text-slate-600 inline-flex items-center gap-0.5"
                >
                  <X className="w-3 h-3" />清除
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">从</span>
                <input
                  type="datetime-local"
                  value={submitFrom}
                  onChange={(e) => setSubmitFrom(e.target.value)}
                  className="input text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">到</span>
                <input
                  type="datetime-local"
                  value={submitTo}
                  onChange={(e) => setSubmitTo(e.target.value)}
                  className="input text-sm"
                />
              </div>
            </div>
          </div>

          {filterableQuestions.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
                <ListChecks className="w-4 h-4 text-primary-500" />
                按题目选项筛选（多题叠加，同题多值为或）
              </div>
              {filterableQuestions.map((q) => {
                const selected = answerFilters[q.id] ?? [];
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
                            onClick={() => toggleAnswerFilter(q.id, opt.value)}
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
          )}
        </div>
      )}

      {showSegmentModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md animate-slide-up p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="font-serif font-semibold text-lg text-slate-800">保存为人群包</h3>
              </div>
              <button
                onClick={() => setShowSegmentModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  名称 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={segmentName}
                  onChange={(e) => setSegmentName(e.target.value)}
                  placeholder="如：高意向用户、一线城市受访者..."
                  className="input w-full"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  描述（可选）
                </label>
                <textarea
                  value={segmentDescription}
                  onChange={(e) => setSegmentDescription(e.target.value)}
                  placeholder="简要描述该人群包的筛选条件或用途..."
                  className="input w-full min-h-[80px] resize-y"
                />
              </div>
              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 space-y-1">
                <p className="font-medium text-slate-600 mb-1">将保存以下当前筛选条件：</p>
                {totalActiveAnswerFilters > 0 && <p>• 题目答案筛选：{totalActiveAnswerFilters} 个条件</p>}
                {tagFilters.length > 0 && <p>• 标签筛选：{tagFilters.join(', ')}</p>}
                {submitFrom && <p>• 提交开始时间：{submitFrom}</p>}
                {submitTo && <p>• 提交结束时间：{submitTo}</p>}
                {totalActiveAnswerFilters === 0 && tagFilters.length === 0 && !submitFrom && !submitTo && (
                  <p className="text-slate-400">（当前无任何自定义筛选条件，将保存为全部样本）</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowSegmentModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                取消
              </button>
              <button
                onClick={handleCreateSegment}
                disabled={!segmentName.trim() || savingSegment}
                className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
              >
                {savingSegment ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                保存
              </button>
            </div>
            {segments.length > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-100">
                <p className="text-sm font-medium text-slate-600 mb-3">已有 / 可删除人群包</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {segments.map((seg) => (
                    <div
                      key={seg.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-700 truncate">{seg.name}</p>
                        {seg.description && (
                          <p className="text-xs text-slate-400 truncate mt-0.5">{seg.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteSegment(seg.id)}
                        className="ml-3 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                        <span className="inline-flex flex-col sm:flex-row sm:items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs border border-amber-200">
                          <span className="inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            拦截 {resp.duplicateCount} 次
                          </span>
                          {resp.lastDuplicateAt && (
                            <span className="text-amber-600/80 sm:before:content-['·'] sm:before:mx-1">
                              最近: {formatDateTimeShort(resp.lastDuplicateAt)}
                            </span>
                          )}
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
                          className="text-xs text-amber-600 hover:text-amber-700 inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          {resp.note ? '编辑' : '添加备注'}
                        </button>
                      )}
                    </div>
                    {editingNoteId === resp.id ? (
                      <div className="mt-3 space-y-3">
                        <textarea
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          className="input w-full min-h-[90px] resize-y text-sm"
                          placeholder="输入备注内容（支持多行）..."
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingNoteId(null);
                              setNoteDraft('');
                            }}
                            className="px-3 py-2 text-slate-500 hover:text-slate-700 text-sm"
                          >
                            取消
                          </button>
                          <button onClick={() => saveNote(resp.id)} className="btn-primary text-sm inline-flex items-center gap-1.5">
                            <Save className="w-3.5 h-3.5" />
                            保存
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-amber-700 mt-2 whitespace-pre-wrap break-words">
                        {resp.note || <span className="text-amber-400/70">暂无备注</span>}
                      </p>
                    )}
                  </div>

                  {resp.duplicateCount > 0 && (
                    <div className="mb-5 p-4 bg-amber-50/30 rounded-xl border border-amber-100">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-800">拦截记录</span>
                      </div>
                      <div className="text-sm text-amber-700 space-y-0.5">
                        <p>累计拦截次数：<span className="font-semibold">{resp.duplicateCount} 次</span></p>
                        <p>最近拦截时间：<span className="font-semibold">{resp.lastDuplicateAt ? new Date(resp.lastDuplicateAt).toLocaleString('zh-CN') : '—'}</span></p>
                      </div>
                    </div>
                  )}

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
