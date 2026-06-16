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
} from 'recharts';
import { surveyApi } from '../lib/api.js';
import type { SurveyAnalytics, QuestionAnalytics, MatrixDimension } from '../../shared/types.js';
import { QUESTION_TYPE_LABELS } from '../lib/surveyUtils.js';

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const POLL_INTERVAL = 5000;

export default function SurveyAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SurveyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const prevTotalRef = useRef<number>(-1);

  async function loadData(silent = false) {
    if (!id) return;
    if (!silent) setRefreshing(true);
    try {
      const result = await surveyApi.getAnalytics(id);
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

  useEffect(() => {
    loadData();
    setLastUpdated(new Date());
    const t = setInterval(() => loadData(true), POLL_INTERVAL);
    return () => clearInterval(t);
  }, [id]);

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

  const avgSkipped = data.questions.length > 0
    ? data.questions.reduce((s, q) => s + q.skippedCount, 0) / data.questions.length
    : 0;

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-serif font-semibold text-slate-800">统计分析</h2>
          <p className="text-sm text-slate-500 mt-1">
            数据每 5 秒自动刷新 ·
            {lastUpdated && (
              <span className="ml-1">
                最后更新: {lastUpdated.toLocaleTimeString('zh-CN')}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => loadData(false)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? '刷新中...' : '刷新数据'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="总答卷数" value={data.totalResponses} color="primary" highlight={data.totalResponses > 0} />
        <StatCard
          icon={TrendingUp}
          label="平均答题率"
          value={data.totalResponses > 0 ? `${Math.round((1 - avgSkipped / Math.max(1, data.totalResponses)) * 100)}%` : '-'}
          color="accent"
        />
        <StatCard icon={FileText} label="题目数量" value={data.questions.length} color="violet" />
        <StatCard icon={PieChart} label="题型种类" value={new Set(data.questions.map(q => q.questionType)).size} color="amber" />
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
    </div>
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
