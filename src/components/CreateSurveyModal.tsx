import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, FileText } from 'lucide-react';
import { useSurveyStore } from '../store/surveyStore.js';

interface Props {
  onClose: () => void;
}

export default function CreateSurveyModal({ onClose }: Props) {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const createSurvey = useSurveyStore((s) => s.createSurvey);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const survey = await createSurvey(title.trim());
      navigate(`/survey/${survey.id}/edit`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-md mx-4 animate-slide-up overflow-hidden">
        <div className="bg-gradient-to-r from-primary-700 to-primary-600 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-semibold">创建新问卷</h3>
                <p className="text-xs text-primary-100">开始收集您的数据</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-white/15 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              问卷标题
            </label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：用户满意度调查"
              className="input"
            />
          </div>

          <div className="flex items-center gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!title.trim() || loading}
            >
              {loading ? '创建中...' : '创建问卷'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
