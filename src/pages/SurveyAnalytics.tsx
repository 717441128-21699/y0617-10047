import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  BarChart3,
  Users,
  TrendingUp,
  FileText,
  AlertCircle,
  PieChart,
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
import type { SurveyAnalytics, QuestionAnalytics } from '../../shared/types.js';
import { QUESTION_TYPE_LABELS } from '../lib/surveyUtils.js';

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function SurveyAnalytics() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SurveyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    surveyApi
      .getAnalytics(id)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="总答卷数" value={data.totalResponses} color="primary" />
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
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  color: 'primary' | 'accent' | 'violet' | 'amber';
}) {
  const colorMap = {
    primary: 'from-primary-500 to-primary-700',
    accent: 'from-accent-500 to-accent-700',
    violet: 'from-violet-500 to-violet-700',
    amber: 'from-amber-500 to-amber-700',
  };
  return (
    <div className="card p-5 flex items-center gap-4">
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
  return (
    <div className="card p-6 animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
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

      <div className="h-64">
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
        ) : question.options && question.options.length > 0 && question.questionType !== 'matrix' ? (
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
        ) : question.questionType === 'matrix' && question.matrixData ? (
          <div className="text-sm text-slate-500 text-center py-8">
            矩阵题数据请查看答卷管理页面
          </div>
        ) : question.questionType === 'text' ? (
          <div className="text-sm text-slate-500 text-center py-8">
            文本题共收到 {question.responseCount} 条回答，详情请查看答卷管理
          </div>
        ) : null}
      </div>

      {question.options && question.options.length > 0 && question.questionType !== 'matrix' && (
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
