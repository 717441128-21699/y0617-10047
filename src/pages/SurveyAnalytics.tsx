import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  BarChart3,
  Users,
  TrendingUp,
  FileText,
  AlertCircle,
  PieChart,
  RefreshCw,
  TrendingDown,
  GitCompareArrows,
  Download,
  ChevronDown,
  BarChart2,
  LineChart,
  Clock,
  Save,
  Copy,
  Trash2,
  X,
  Filter,
  Eye,
  Layers,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart as RePieChart,
  Pie,
  CartesianGrid,
  Line,
  ComposedChart,
  Legend,
} from 'recharts';
import { surveyApi } from '../lib/api.js';
import { useSurveyStore } from '../store/surveyStore.js';
import type {
  SurveyAnalytics,
  QuestionAnalytics,
  MatrixDimension,
  TrendGranularity,
  TrendResult,
  CrossTabResult,
  Segment,
  SavedAnalysisView,
} from '../../shared/types.js';
import { QUESTION_TYPE_LABELS } from '../lib/surveyUtils.js';

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const POLL_INTERVAL = 5000;

type Tab = 'overview' | 'trend' | 'crosstab';

const ALL_SEGMENT_ID = '__all__';

export default function SurveyAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const { currentSurvey, fetchSurvey } = useSurveyStore();

  const [tab, setTab] = useState<Tab>('overview');
  const [data, setData] = useState<SurveyAnalytics | null>(null);
  const [trend, setTrend] = useState<TrendResult | null>(null);
  const [trendGranularity, setTrendGranularity] = useState<TrendGranularity>('day');
  const [trendDays, setTrendDays] = useState(14);

  const [crossTab, setCrossTab] = useState<CrossTabResult | null>(null);
  const [groupQuestionId, setGroupQuestionId] = useState<string>('');
  const [targetQuestionId, setTargetQuestionId] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const prevTotalRef = useRef<number>(-1);

  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>(ALL_SEGMENT_ID);

  const [savedViews, setSavedViews] = useState<SavedAnalysisView[]>([]);
  const [selectedViewId, setSelectedViewId] = useState<string>('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveViewName, setSaveViewName] = useState('');
  const [showSegmentDropdown, setShowSegmentDropdown] = useState(false);
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [viewActionLoading, setViewActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchSurvey(id);
  }, [id, fetchSurvey]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [segs, views] = await Promise.all([
          surveyApi.listSegments(id),
          surveyApi.listSavedViews(id),
        ]);
        setSegments(segs);
        setSavedViews(views);
      } catch {
        /* ignore */
      }
    })();
  }, [id]);

  const currentFilter = {
    segmentId: selectedSegmentId === ALL_SEGMENT_ID ? undefined : selectedSegmentId,
  };

  async function loadAll(silent = false) {
    if (!id) return;
    if (!silent) setRefreshing(true);
    try {
      const result = await surveyApi.getAnalytics(id, currentFilter);
      if (prevTotalRef.current >= 0 && result.totalResponses !== prevTotalRef.current) {
        setLastUpdated(new Date());
      }
      prevTotalRef.current = result.totalResponses;
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadTrend() {
    if (!id) return;
    try {
      const t = await surveyApi.getTrend(id, trendGranularity, trendDays, currentFilter);
      setTrend(t);
    } catch {
      /* ignore */
    }
  }

  async function loadCrossTab() {
    if (!id || !groupQuestionId || !targetQuestionId) return;
    try {
      const r = await surveyApi.getCrossTab(id, groupQuestionId, targetQuestionId, currentFilter);
      setCrossTab(r);
    } catch {
      setCrossTab(null);
    }
  }

  useEffect(() => {
    loadAll();
    setLastUpdated(new Date());
    const t = setInterval(() => loadAll(true), POLL_INTERVAL);
    return () => clearInterval(t);
  }, [id, selectedSegmentId]);

  useEffect(() => {
    if (tab === 'trend') loadTrend();
  }, [tab, id, trendGranularity, trendDays, selectedSegmentId]);

  useEffect(() => {
    if (tab === 'crosstab' && currentSurvey && !groupQuestionId) {
      const firstGroup = currentSurvey.questions.find((q) => ['single', 'dropdown'].includes(q.type));
      if (firstGroup) {
        setGroupQuestionId(firstGroup.id);
        const firstTarget = currentSurvey.questions.find(
          (q) => q.id !== firstGroup.id && ['single', 'dropdown', 'multiple', 'rating'].includes(q.type)
        );
        if (firstTarget) setTargetQuestionId(firstTarget.id);
      }
    }
  }, [tab, currentSurvey, groupQuestionId]);

  useEffect(() => {
    if (tab === 'crosstab' && groupQuestionId && targetQuestionId) {
      loadCrossTab();
    }
  }, [tab, id, groupQuestionId, targetQuestionId, selectedSegmentId]);

  function applyView(view: SavedAnalysisView) {
    setTab(view.tab);
    setSelectedSegmentId(view.segmentId ?? ALL_SEGMENT_ID);
    setTrendGranularity(view.trendGranularity);
    setTrendDays(view.trendDays);
    if (view.groupQuestionId) setGroupQuestionId(view.groupQuestionId);
    if (view.targetQuestionId) setTargetQuestionId(view.targetQuestionId);
  }

  async function handleSaveView() {
    if (!id || !saveViewName.trim()) return;
    setViewActionLoading('save');
    try {
      const newView = await surveyApi.createSavedView(id, {
        name: saveViewName.trim(),
        tab,
        segmentId: selectedSegmentId === ALL_SEGMENT_ID ? null : selectedSegmentId,
        trendGranularity,
        trendDays,
        groupQuestionId: groupQuestionId || null,
        targetQuestionId: targetQuestionId || null,
      });
      setSavedViews((prev) => [...prev, newView]);
      setSelectedViewId(newView.id);
      setShowSaveModal(false);
      setSaveViewName('');
    } catch (e) {
      alert(e instanceof Error ? e.message : '保存失败');
    } finally {
      setViewActionLoading(null);
    }
  }

  async function handleCloneView(view: SavedAnalysisView) {
    setViewActionLoading(`clone:${view.id}`);
    try {
      const cloned = await surveyApi.cloneSavedView(view.id, `${view.name} 副本`);
      setSavedViews((prev) => [...prev, cloned]);
    } catch (e) {
      alert(e instanceof Error ? e.message : '复制失败');
    } finally {
      setViewActionLoading(null);
    }
  }

  async function handleDeleteView(view: SavedAnalysisView, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`确定删除视图「${view.name}」吗？`)) return;
    setViewActionLoading(`delete:${view.id}`);
    try {
      await surveyApi.deleteSavedView(view.id);
      setSavedViews((prev) => prev.filter((v) => v.id !== view.id));
      if (selectedViewId === view.id) setSelectedViewId('');
    } catch (e) {
      alert(e instanceof Error ? e.message : '删除失败');
    } finally {
      setViewActionLoading(null);
    }
  }

  if (loading) return <div className="container py-16 text-center text-slate-400">加载中...</div>;
  if (error) {
    return (
      <div className="container py-16 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <p className="text-slate-500">{error}</p>
      </div>
    );
  }
  if (!data) return null;

  const questions = currentSurvey?.questions ?? [];
  const groupableQuestions = questions.filter((q) => ['single', 'dropdown'].includes(q.type));
  const targetableQuestions = questions.filter((q) => ['single', 'dropdown', 'multiple', 'rating'].includes(q.type));
  const avgSkipped = data.questions.length > 0
    ? data.questions.reduce((s, q) => s + q.skippedCount, 0) / data.questions.length
    : 0;

  const currentSegment = segments.find((s) => s.id === selectedSegmentId);

  return (
    <div className="container py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-serif font-semibold text-slate-800">统计分析</h2>
          </div>
          <p className="text-sm text-slate-500">
            数据每 5 秒自动刷新 ·
            {lastUpdated && (
              <span className="ml-1">
                最后更新: {lastUpdated.toLocaleTimeString('zh-CN')}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadAll(false)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? '刷新中...' : '刷新数据'}
          </button>
        </div>
      </div>

      <div className="card p-4 mb-6 bg-gradient-to-br from-slate-50 to-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
              <Layers className="w-3.5 h-3.5" />
              分析人群包
            </label>
            <div className="relative">
              <button
                onClick={() => { setShowSegmentDropdown(!showSegmentDropdown); setShowViewDropdown(false); }}
                className="w-full text-left px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 flex items-center justify-between hover:border-primary-300 transition-colors shadow-sm"
              >
                <span className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary-600" />
                  <span className="font-medium">
                    {currentSegment ? currentSegment.name : '全部样本'}
                  </span>
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showSegmentDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showSegmentDropdown && (
                <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-72 overflow-y-auto">
                  <button
                    onClick={() => { setSelectedSegmentId(ALL_SEGMENT_ID); setShowSegmentDropdown(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-primary-50 border-b border-slate-100 ${
                      selectedSegmentId === ALL_SEGMENT_ID ? 'bg-primary-50 text-primary-700 font-medium' : 'text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      全部样本
                    </span>
                  </button>
                  {segments.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedSegmentId(s.id); setShowSegmentDropdown(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-primary-50 ${
                        s.id === selectedSegmentId ? 'bg-primary-50 text-primary-700 font-medium' : 'text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{s.name}</span>
                      </div>
                      {s.description && <div className="text-xs text-slate-400 mt-0.5 ml-6">{s.description}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
              <Eye className="w-3.5 h-3.5" />
              已保存视图
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <button
                  onClick={() => { setShowViewDropdown(!showViewDropdown); setShowSegmentDropdown(false); }}
                  className="w-full text-left px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 flex items-center justify-between hover:border-primary-300 transition-colors shadow-sm"
                >
                  <span className="font-medium">
                    {selectedViewId ? savedViews.find((v) => v.id === selectedViewId)?.name : '选择视图...'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showViewDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showViewDropdown && (
                  <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-80 overflow-y-auto">
                    {savedViews.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-slate-400">
                        暂无已保存视图
                      </div>
                    ) : (
                      savedViews.map((v) => (
                        <div
                          key={v.id}
                          className={`group flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-primary-50 cursor-pointer ${
                            v.id === selectedViewId ? 'bg-primary-50 text-primary-700 font-medium' : 'text-slate-700'
                          }`}
                          onClick={() => { setSelectedViewId(v.id); applyView(v); setShowViewDropdown(false); }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="truncate">{v.name}</div>
                            <div className="text-xs text-slate-400 font-normal mt-0.5">
                              {v.tab === 'overview' ? '总览' : v.tab === 'trend' ? '趋势' : '交叉'}
                              {v.segmentId && ' · 人群过滤'}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCloneView(v); }}
                              disabled={viewActionLoading === `clone:${v.id}`}
                              className="p-1.5 rounded-lg hover:bg-white text-slate-500 hover:text-primary-600 transition-colors disabled:opacity-50"
                              title="复制视图"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteView(v, e)}
                              disabled={viewActionLoading === `delete:${v.id}`}
                              className="p-1.5 rounded-lg hover:bg-white text-slate-500 hover:text-red-600 transition-colors disabled:opacity-50"
                              title="删除视图"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => { setSaveViewName(''); setShowSaveModal(true); }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-br from-primary-500 to-primary-700 text-white hover:from-primary-600 hover:to-primary-800 transition-all shadow-soft disabled:opacity-60 whitespace-nowrap"
              >
                <Save className="w-4 h-4" />
                保存当前视图
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-2xl w-fit">
        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')} icon={PieChart}>
          总览分布
        </TabButton>
        <TabButton active={tab === 'trend'} onClick={() => setTab('trend')} icon={TrendingUp}>
          时间趋势
        </TabButton>
        <TabButton active={tab === 'crosstab'} onClick={() => setTab('crosstab')} icon={GitCompareArrows}>
          交叉分析
        </TabButton>
      </div>

      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Users} label="总答卷数" value={data.totalResponses} color="primary" highlight={data.totalResponses > 0} />
            <StatCard
              icon={TrendingUp}
              label="平均答题率"
              value={data.totalResponses > 0 ? `${Math.round((1 - avgSkipped / Math.max(1, data.totalResponses)) * 100)}%` : '-'}
              color="accent"
            />
            <StatCard icon={FileText} label="题目数量" value={data.questions.length} color="violet" />
            <StatCard icon={BarChart2} label="题型种类" value={new Set(data.questions.map(q => q.questionType)).size} color="amber" />
          </div>

          {data.totalResponses === 0 ? (
            <div className="card p-16 text-center">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="font-serif font-semibold text-lg text-slate-700 mb-2">暂无答卷数据</h3>
              <p className="text-slate-500">发布问卷后，这里将展示实时的统计分析</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {data.questions.map((q, idx) => (
                <QuestionChartCard key={q.questionId} question={q} index={idx} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'trend' && (
        <TrendPanel
          trend={trend}
          granularity={trendGranularity}
          days={trendDays}
          onGranularityChange={setTrendGranularity}
          onDaysChange={setTrendDays}
          hasRating={questions.some((q) => q.type === 'rating')}
        />
      )}

      {tab === 'crosstab' && (
        <CrossTabPanel
          surveyId={id ?? ''}
          groupableQuestions={groupableQuestions}
          targetableQuestions={targetableQuestions}
          allQuestions={questions}
          groupQuestionId={groupQuestionId}
          targetQuestionId={targetQuestionId}
          onGroupChange={setGroupQuestionId}
          onTargetChange={setTargetQuestionId}
          crossTab={crossTab}
          segmentId={selectedSegmentId === ALL_SEGMENT_ID ? undefined : selectedSegmentId}
        />
      )}

      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowSaveModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-serif font-semibold text-lg text-slate-800">保存分析视图</h3>
              <button
                onClick={() => setShowSaveModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5">
              <label className="text-sm font-medium text-slate-600 mb-2 block">视图名称</label>
              <input
                type="text"
                value={saveViewName}
                onChange={(e) => setSaveViewName(e.target.value)}
                placeholder="例如：周度满意度趋势"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
                onKeyDown={(e) => e.key === 'Enter' && handleSaveView()}
                autoFocus
              />
              <div className="mt-4 p-3 rounded-xl bg-slate-50 space-y-1.5 text-xs text-slate-500">
                <div className="flex items-center justify-between">
                  <span>分析标签页</span>
                  <span className="font-medium text-slate-700">{tab === 'overview' ? '总览分布' : tab === 'trend' ? '时间趋势' : '交叉分析'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>人群包</span>
                  <span className="font-medium text-slate-700">{currentSegment ? currentSegment.name : '全部样本'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveView}
                disabled={!saveViewName.trim() || viewActionLoading === 'save'}
                className="px-5 py-2 rounded-xl text-sm font-medium bg-gradient-to-br from-primary-500 to-primary-700 text-white hover:from-primary-600 hover:to-primary-800 transition-all shadow-soft disabled:opacity-60"
              >
                {viewActionLoading === 'save' ? '保存中...' : '保存视图'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, children }: {
  active: boolean;
  onClick: () => void;
  icon: typeof PieChart;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
        active
          ? 'bg-white text-primary-700 shadow-sm scale-[1.02]'
          : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      <Icon className="w-4 h-4" />
      {children}
    </button>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  highlight,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  color: 'primary' | 'accent' | 'violet' | 'amber';
  highlight?: boolean;
}) {
  const colorMap = {
    primary: 'from-primary-500 to-primary-700',
    accent: 'from-accent-500 to-accent-700',
    violet: 'from-violet-500 to-violet-700',
    amber: 'from-amber-500 to-amber-700',
  };
  return (
    <div className={`card p-5 flex items-center gap-4 transition-all ${highlight ? 'ring-2 ring-primary-200' : ''}`}>
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center text-white shadow-soft`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-2xl font-serif font-bold text-slate-800">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
      </div>
    </div>
  );
}

function QuestionChartCard({ question, index }: { question: QuestionAnalytics; index: number }) {
  const isMatrix = question.questionType === 'matrix';
  const needTall = isMatrix && question.matrixRows && question.matrixRows.length > 2;

  return (
    <div className={`card p-6 animate-slide-up ${needTall ? 'lg:col-span-2' : ''}`} style={{ animationDelay: `${index * 50}ms` }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 pr-4">
          <div className="text-xs text-slate-400 mb-1">第 {index + 1} 题 · {QUESTION_TYPE_LABELS[question.questionType]}</div>
          <h3 className="font-semibold text-slate-800">{question.questionTitle || '未命名题目'}</h3>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-slate-700">{question.responseCount} 人作答</div>
          <div className="text-xs text-slate-400">{question.skippedCount} 人跳过</div>
        </div>
      </div>

      <div className={isMatrix ? '' : 'h-64'}>
        {question.questionType === 'rating' && question.average !== undefined ? (
          <div className="flex items-center justify-center h-full flex-col gap-4">
            <div className="text-6xl font-serif font-bold bg-gradient-to-br from-amber-400 to-amber-600 bg-clip-text text-transparent">
              {question.average.toFixed(2)}
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <span>最低: {question.min}</span>
              <span>最高: {question.max}</span>
              <span>共 {question.responseCount} 人评分</span>
            </div>
          </div>
        ) : question.options && question.options.length > 0 && !isMatrix ? (
          question.options.length <= 5 ? (
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={question.options.map((o) => ({ name: o.label, value: o.count }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {question.options.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} 票`, '']} />
              </RePieChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={question.options} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number, _name: string, item: { payload: { percentage: number } }) => [
                    `${value} 票 (${item.payload.percentage.toFixed(1)}%)`,
                    '',
                  ]}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {question.options.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )
        ) : isMatrix && question.matrixData && question.matrixRows && question.matrixCols ? (
          <MatrixTable rows={question.matrixRows} cols={question.matrixCols} data={question.matrixData} />
        ) : question.questionType === 'text' ? (
          <div className="text-sm text-slate-500 text-center py-8">
            文本题共收到 {question.responseCount} 条回答，详情请查看答卷管理
          </div>
        ) : null}
      </div>

      {question.options && question.options.length > 0 && !isMatrix && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
          {question.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-sm text-slate-600 flex-1 truncate">{opt.label}</span>
              <span className="text-sm font-medium text-slate-700">{opt.count}</span>
              <span className="text-xs text-slate-400 w-12 text-right">{opt.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MatrixTable({
  rows,
  cols,
  data,
}: {
  rows: MatrixDimension[];
  cols: MatrixDimension[];
  data: Record<string, { label: string; count: number; percentage: number }[]>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left font-medium text-slate-600 bg-slate-50 p-3 border-b border-slate-200 sticky left-0">
              选项
            </th>
            {cols.map((c) => (
              <th key={c.id} className="text-center font-medium text-slate-600 bg-slate-50 p-3 border-b border-slate-200">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const rowData = data[row.id] ?? [];
            const rowTotal = rowData.reduce((s, o) => s + o.count, 0);
            return (
              <tr key={row.id} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                <td className="p-3 border-b border-slate-100 font-medium text-slate-700 sticky left-0 bg-inherit">
                  {row.label}
                  {rowTotal > 0 && (
                    <span className="ml-2 text-xs text-slate-400">({rowTotal})</span>
                  )}
                </td>
                {cols.map((col, ci) => {
                  const d = rowData[ci];
                  const pct = d ? d.percentage : 0;
                  return (
                    <td key={col.id} className="p-3 border-b border-slate-100 text-center align-middle">
                      {d && d.count > 0 ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="relative w-full h-6 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="absolute left-0 top-0 h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                background: COLORS[ci % COLORS.length],
                              }}
                            />
                            <span className="relative z-10 text-xs font-medium text-white mix-blend-difference px-2 leading-6">
                              {d.count}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">{pct.toFixed(1)}%</span>
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TrendPanel({
  trend,
  granularity,
  days,
  onGranularityChange,
  onDaysChange,
  hasRating,
}: {
  trend: TrendResult | null;
  granularity: TrendGranularity;
  days: number;
  onGranularityChange: (g: TrendGranularity) => void;
  onDaysChange: (d: number) => void;
  hasRating: boolean;
}) {
  const dayOptions = [7, 14, 30, 90];

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">提交趋势</h3>
              <p className="text-xs text-slate-500">按{granularity === 'day' ? '天' : '小时'}统计提交量、完成率和评分变化</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {(['day', 'hour'] as TrendGranularity[]).map((g) => (
                <button
                  key={g}
                  onClick={() => onGranularityChange(g)}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
                    granularity === g ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {g === 'day' ? '按天' : '按小时'}
                </button>
              ))}
            </div>
            {granularity === 'day' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">时间范围:</span>
                <div className="relative">
                  <select
                    value={days}
                    onChange={(e) => onDaysChange(Number(e.target.value))}
                    className="appearance-none bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  >
                    {dayOptions.map((d) => (
                      <option key={d} value={d}>最近 {d} 天</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}
          </div>
        </div>

        {!trend || trend.points.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-slate-400">暂无趋势数据</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <MiniStat label="周期内总提交" value={trend.total} icon={Users} color="primary" />
              <MiniStat
                label="平均完成率"
                value={`${trend.avgCompletionRate.toFixed(1)}%`}
                icon={TrendingUp}
                color="accent"
              />
              <MiniStat
                label="峰值日提交"
                value={Math.max(...trend.points.map((p) => p.submissions))}
                icon={TrendingUp}
                color="violet"
              />
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trend.points} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="submissions" name="提交量" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="completionRate"
                    name="完成率(%)"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={false}
                  />
                  {hasRating && (
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="avgRating"
                      name="平均分"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon, color }: {
  label: string;
  value: string | number;
  icon: typeof Users;
  color: 'primary' | 'accent' | 'violet' | 'amber';
}) {
  const colorMap = {
    primary: 'text-primary-600 bg-primary-50',
    accent: 'text-accent-600 bg-accent-50',
    violet: 'text-violet-600 bg-violet-50',
    amber: 'text-amber-600 bg-amber-50',
  };
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-lg font-serif font-bold text-slate-800">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}

function CrossTabPanel({
  surveyId,
  groupableQuestions,
  targetableQuestions,
  allQuestions,
  groupQuestionId,
  targetQuestionId,
  onGroupChange,
  onTargetChange,
  crossTab,
  segmentId,
}: {
  surveyId: string;
  groupableQuestions: { id: string; title: string; type: string }[];
  targetableQuestions: { id: string; title: string; type: string }[];
  allQuestions: { id: string; title: string; type: string }[];
  groupQuestionId: string;
  targetQuestionId: string;
  onGroupChange: (id: string) => void;
  onTargetChange: (id: string) => void;
  crossTab: CrossTabResult | null;
  segmentId?: string;
}) {
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showTargetDropdown, setShowTargetDropdown] = useState(false);

  const groupQ = groupableQuestions.find((q) => q.id === groupQuestionId);
  const targetQ = allQuestions.find((q) => q.id === targetQuestionId);

  const hasData = crossTab && (crossTab as any).hasData !== false;
  const exportUrl = surveyApi.exportCrossTabUrl(surveyId, groupQuestionId, targetQuestionId, { segmentId });
  const canExport = !!crossTab && hasData && !!groupQuestionId && !!targetQuestionId;

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white">
            <GitCompareArrows className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">交叉分析</h3>
            <p className="text-xs text-slate-500">按分组题对比不同人群的答案分布或评分差异</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="text-sm font-medium text-slate-600 mb-2 block">分组题（维度）</label>
            <div className="relative">
              <button
                onClick={() => { setShowGroupDropdown(!showGroupDropdown); setShowTargetDropdown(false); }}
                className="w-full text-left px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 flex items-center justify-between hover:bg-slate-100 transition-colors"
              >
                <span>{groupQ?.title || '请选择分组题'}</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
              {showGroupDropdown && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {groupableQuestions.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => { onGroupChange(q.id); setShowGroupDropdown(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-primary-50 ${
                        q.id === groupQuestionId ? 'bg-primary-50 text-primary-700 font-medium' : 'text-slate-700'
                      }`}
                    >
                      {q.title || '未命名题目'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 mb-2 block">目标题（指标）</label>
            <div className="relative">
              <button
                onClick={() => { setShowTargetDropdown(!showTargetDropdown); setShowGroupDropdown(false); }}
                className="w-full text-left px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 flex items-center justify-between hover:bg-slate-100 transition-colors"
              >
                <span>{targetQ?.title || '请选择目标题'}</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
              {showTargetDropdown && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {targetableQuestions.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-400">
                      暂无可选目标题（需单选/下拉/多选/评分题）
                    </div>
                  ) : (
                    targetableQuestions.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => { onTargetChange(q.id); setShowTargetDropdown(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-primary-50 ${
                          q.id === targetQuestionId ? 'bg-primary-50 text-primary-700 font-medium' : 'text-slate-700'
                        }`}
                      >
                        {q.title || '未命名题目'}
                        <span className="text-xs text-slate-400 ml-2">
                          {QUESTION_TYPE_LABELS[q.type as keyof typeof QUESTION_TYPE_LABELS]}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <a
          href={canExport ? exportUrl : undefined}
          target={canExport ? '_blank' : undefined}
          rel={canExport ? 'noreferrer' : undefined}
          aria-disabled={!canExport}
          onClick={(e) => { if (!canExport) e.preventDefault(); }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            canExport
              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          <Download className="w-4 h-4" />
          导出交叉分析结果
        </a>
      </div>

      {!crossTab ? (
        <div className="card p-16 text-center">
          <BarChart2 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">请选择分组题和目标题以查看交叉分析结果</p>
        </div>
      ) : !hasData ? (
        <div className="card p-16 text-center">
          <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-slate-50 flex items-center justify-center">
            <BarChart2 className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="font-serif font-semibold text-xl text-slate-700 mb-2">暂无数据</h3>
          <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
            当前组合暂无数据，可更换题目或调整筛选条件（如人群包）后重试
          </p>
        </div>
      ) : (
        <div className="card p-6">
          <div className="mb-4">
            <h4 className="font-semibold text-slate-800">{crossTab.targetQuestionTitle}</h4>
            <p className="text-sm text-slate-500">按「{crossTab.groupQuestionTitle}」分组对比</p>
          </div>

          {crossTab.targetType === 'rating' ? (
            <div className="space-y-3">
              {crossTab.groups.map((g, gi) => (
                <div key={g.groupValue} className="p-4 rounded-xl bg-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: COLORS[gi % COLORS.length] }}
                      />
                      <span className="font-medium text-slate-700">{g.groupLabel}</span>
                      <span className="text-xs text-slate-400">({g.totalCount} 人)</span>
                    </div>
                    <span className="text-xl font-serif font-bold text-amber-600">
                      {g.avgRating?.toFixed(2) ?? '-'}
                    </span>
                  </div>
                </div>
              ))}
              {crossTab.overallAvgRating !== undefined && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary-50 to-accent-50">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">总体平均</span>
                    <span className="text-2xl font-serif font-bold text-primary-700">
                      {crossTab.overallAvgRating.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left font-medium text-slate-600 bg-slate-50 p-3 border-b border-slate-200">分组</th>
                    <th className="text-center font-medium text-slate-600 bg-slate-50 p-3 border-b border-slate-200">样本量</th>
                    {(crossTab.groups[0]?.options ?? []).map((opt, i) => (
                      <th
                        key={i}
                        className="text-center font-medium text-slate-600 bg-slate-50 p-3 border-b border-slate-200"
                      >
                        {opt.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {crossTab.groups.map((g, gi) => (
                    <tr key={g.groupValue} className={gi % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="p-3 border-b border-slate-100 font-medium text-slate-700">{g.groupLabel}</td>
                      <td className="p-3 border-b border-slate-100 text-center text-slate-600">{g.totalCount}</td>
                      {g.options.map((opt, oi) => (
                        <td key={oi} className="p-3 border-b border-slate-100 text-center">
                          <div className="text-sm font-medium text-slate-700">{opt.count}</div>
                          <div className="text-xs text-slate-400">{opt.percentage.toFixed(1)}%</div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
