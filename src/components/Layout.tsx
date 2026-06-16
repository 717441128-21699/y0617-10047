import { NavLink, Outlet, useParams } from 'react-router-dom';
import { FileText, Plus, ClipboardList, BarChart3, Settings2, Share2, ArrowLeft } from 'lucide-react';
import { useSurveyStore } from '../store/surveyStore.js';

function SurveyTabs() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  const current = useSurveyStore((s) => s.currentSurvey);

  const tabs = [
    { to: `/survey/${id}/edit`, label: '编辑问卷', icon: ClipboardList, end: false },
    { to: `/survey/${id}/settings`, label: '问卷设置', icon: Settings2, end: true },
    { to: `/survey/${id}/analytics`, label: '统计分析', icon: BarChart3, end: true },
    { to: `/survey/${id}/responses`, label: '答卷管理', icon: FileText, end: true },
    { to: `/survey/${id}/share`, label: '分享问卷', icon: Share2, end: true },
  ];

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="container flex items-center justify-between py-3">
        <div className="flex items-center gap-4">
          <NavLink to="/" className="text-slate-500 hover:text-primary-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </NavLink>
          <div>
            <h2 className="text-lg font-serif font-semibold text-slate-800">
              {current?.title ?? '加载中...'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {current?.status === 'draft' && '草稿'}
              {current?.status === 'published' && '已发布'}
              {current?.status === 'closed' && '已关闭'}
            </p>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `nav-link flex items-center gap-2 text-sm ${isActive ? 'nav-link-active' : ''}`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

export default function Layout() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-gradient-to-r from-primary-900 via-primary-800 to-primary-700 text-white shadow-lg">
        <div className="container flex items-center justify-between py-4">
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <FileText className="w-5 h-5 text-accent-300" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold tracking-wide">问卷云</h1>
              <p className="text-xs text-primary-200/80 -mt-0.5">设计 · 收集 · 分析</p>
            </div>
          </NavLink>
          <NavLink to="/" className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur transition-all text-sm font-medium">
            <Plus className="w-4 h-4" />
            新建问卷
          </NavLink>
        </div>
      </header>

      {id && <SurveyTabs />}

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="container py-6 text-center text-sm text-slate-500">
          © 2025 问卷云 · 让数据说话
        </div>
      </footer>
    </div>
  );
}
