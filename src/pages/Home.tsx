import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  FileText,
  BarChart3,
  Users,
  MoreVertical,
  Trash2,
  Edit3,
  Share2,
  Sparkles,
  Filter,
} from 'lucide-react';
import { useSurveyStore } from '../store/surveyStore.js';
import type { SurveyListItem, SurveyStatus } from '../../shared/types.js';
import CreateSurveyModal from '../components/CreateSurveyModal.js';

const STATUS_STYLES: Record<SurveyStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  published: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  closed: 'bg-amber-50 text-amber-700 border border-amber-200',
};

const STATUS_LABEL: Record<SurveyStatus, string> = {
  draft: '草稿',
  published: '已发布',
  closed: '已关闭',
};

function SurveyCard({ survey, onDelete }: { survey: SurveyListItem; onDelete: (id: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const coverColors = [
    'from-primary-500 to-primary-700',
    'from-accent-500 to-accent-700',
    'from-violet-500 to-violet-700',
    'from-rose-500 to-rose-700',
    'from-teal-500 to-teal-700',
  ];
  const colorIdx = survey.title.charCodeAt(0) % coverColors.length;

  return (
    <div className="card overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-slide-up">
      <div className={`h-24 bg-gradient-to-br ${coverColors[colorIdx]} relative`}>
        <div className="absolute inset-0 bg-black/5" />
        <div className="absolute top-3 right-3">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center text-white transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-slate-100 py-2 w-40 z-10">
                <button
                  onClick={() => navigate(`/survey/${survey.id}/edit`)}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  编辑问卷
                </button>
                <button
                  onClick={() => navigate(`/survey/${survey.id}/analytics`)}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  查看统计
                </button>
                <button
                  onClick={() => navigate(`/survey/${survey.id}/share`)}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  分享问卷
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={() => onDelete(survey.id)}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  删除问卷
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="absolute bottom-3 left-4 right-12">
          <span className={`chip ${STATUS_STYLES[survey.status]}`}>
            {STATUS_LABEL[survey.status]}
          </span>
        </div>
      </div>

      <Link to={`/survey/${survey.id}/edit`} className="block p-5">
        <h3 className="font-serif font-semibold text-slate-800 text-lg line-clamp-2 group-hover:text-primary-700 transition-colors">
          {survey.title}
        </h3>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              {survey.responseCount} 份
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              {new Date(survey.createdAt).toLocaleDateString('zh-CN')}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

export default function Home() {
  const { surveys, loading, fetchSurveys, deleteSurvey } = useSurveyStore();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SurveyStatus | 'all'>('all');

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  const filtered = surveys.filter((s) => {
    const matchSearch = s.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  async function handleDelete(id: string) {
    if (confirm('确定删除该问卷吗？所有答卷数据也会被删除，此操作不可撤销。')) {
      await deleteSurvey(id);
    }
  }

  return (
    <div className="container py-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 p-10 text-white mb-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-1/2 w-80 h-80 bg-primary-500/30 rounded-full blur-3xl translate-y-1/2" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-sm text-accent-200 mb-4">
            <Sparkles className="w-4 h-4" />
            专业问卷设计平台
          </div>
          <h1 className="text-4xl font-serif font-bold leading-tight mb-4">
            让每一份问卷都<br />
            <span className="text-accent-300">创造价值</span>
          </h1>
          <p className="text-primary-100 mb-8 text-lg">
            灵活的问卷编辑器、丰富的题型、智能的逻辑跳转，
            帮助您快速收集高质量数据，洞察用户心声。
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-primary-800 font-semibold rounded-full shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            创建我的第一份问卷
          </button>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-6 mt-10 max-w-xl">
          {[
            { label: '6 种题型', value: '丰富灵活' },
            { label: '实时统计', value: '可视化分析' },
            { label: '条件筛选', value: '精准导出' },
          ].map((item) => (
            <div key={item.label} className="border-l border-white/20 pl-4">
              <div className="text-2xl font-serif font-bold">{item.label}</div>
              <div className="text-sm text-primary-200">{item.value}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-serif font-semibold text-slate-800">
          我的问卷
          <span className="ml-3 text-base font-normal text-slate-400">
            共 {surveys.length} 份
          </span>
        </h2>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          新建问卷
        </button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索问卷标题..."
            className="input pl-11"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          {(['all', 'draft', 'published', 'closed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {status === 'all' ? '全部' : STATUS_LABEL[status]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-primary-400" />
          </div>
          <h3 className="font-serif font-semibold text-slate-700 text-lg mb-2">
            {surveys.length === 0 ? '还没有问卷' : '没有找到匹配的问卷'}
          </h3>
          <p className="text-slate-500 mb-6">
            {surveys.length === 0
              ? '点击上方按钮，创建您的第一份问卷吧'
              : '尝试修改搜索条件或状态筛选'}
          </p>
          {surveys.length === 0 && (
            <button onClick={() => setShowModal(true)} className="btn-accent">
              创建问卷
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((survey) => (
            <SurveyCard key={survey.id} survey={survey} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showModal && <CreateSurveyModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
