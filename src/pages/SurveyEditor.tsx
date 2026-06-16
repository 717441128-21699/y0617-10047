import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CircleDot,
  CheckSquare,
  ChevronDown,
  AlignLeft,
  Star,
  Grid3x3,
  Save,
  Eye,
  Send,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { useSurveyStore } from '../store/surveyStore.js';
import type { Question, QuestionType } from '../../shared/types.js';
import { createQuestion, QUESTION_TYPE_LABELS, generateId } from '../lib/surveyUtils.js';
import QuestionEditorCard from '../components/QuestionEditorCard.js';

const TYPE_ITEMS: { type: QuestionType; icon: typeof CircleDot; desc: string }[] = [
  { type: 'single', icon: CircleDot, desc: '单选一个选项' },
  { type: 'multiple', icon: CheckSquare, desc: '选择多个选项' },
  { type: 'dropdown', icon: ChevronDown, desc: '下拉列表选择' },
  { type: 'text', icon: AlignLeft, desc: '自由文本输入' },
  { type: 'rating', icon: Star, desc: '星级评分' },
  { type: 'matrix', icon: Grid3x3, desc: '矩阵表格选择' },
];

export default function SurveyEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentSurvey,
    fetchSurvey,
    updateQuestions,
    updateSurveyTitle,
    updateSurveyDescription,
    publishSurvey,
    loading,
  } = useSurveyStore();

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchSurvey(id);
  }, [id, fetchSurvey]);

  if (!currentSurvey && !loading) {
    return (
      <div className="container py-16 text-center text-slate-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
        问卷不存在
      </div>
    );
  }

  const questions = currentSurvey?.questions ?? [];

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  function addQuestion(type: QuestionType) {
    if (!id || !currentSurvey) return;
    const q = createQuestion(type);
    const next = [...questions, q];
    updateQuestions(id, next);
  }

  function updateQuestion(qId: string, patch: Question) {
    if (!id) return;
    const next = questions.map((q) => (q.id === qId ? patch : q));
    updateQuestions(id, next);
  }

  function deleteQuestion(qId: string) {
    if (!id) return;
    const next = questions.filter((q) => q.id !== qId);
    updateQuestions(id, next);
  }

  function duplicateQuestion(qId: string) {
    if (!id) return;
    const idx = questions.findIndex((q) => q.id === qId);
    if (idx < 0) return;
    const original = questions[idx];
    const copy: Question = JSON.parse(JSON.stringify(original));
    copy.id = generateId('q');
    if (copy.options) copy.options = copy.options.map((o) => ({ ...o, id: generateId('opt'), value: generateId('val') }));
    if (copy.rows) copy.rows = copy.rows.map((r) => ({ ...r, id: generateId('dim') }));
    if (copy.columns) copy.columns = copy.columns.map((c) => ({ ...c, id: generateId('dim') }));
    if (copy.logic) copy.logic = copy.logic.map((l) => ({ ...l, id: generateId('logic') }));
    const next = [...questions.slice(0, idx + 1), copy, ...questions.slice(idx + 1)];
    updateQuestions(id, next);
  }

  function moveQuestion(qId: string, direction: -1 | 1) {
    if (!id) return;
    const idx = questions.findIndex((q) => q.id === qId);
    const newIdx = idx + direction;
    if (idx < 0 || newIdx < 0 || newIdx >= questions.length) return;
    const next = [...questions];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    updateQuestions(id, next);
  }

  async function handleSave() {
    if (!id) return;
    setSaving(true);
    try {
      await updateQuestions(id, questions);
      showToast('已保存');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!id) return;
    if (questions.length === 0) {
      alert('请至少添加一道题目后再发布');
      return;
    }
    if (!confirm('发布后答卷数据将开始收集，确定发布此问卷吗？')) return;
    try {
      await publishSurvey(id);
      showToast('发布成功');
      navigate(`/survey/${id}/share`);
    } catch (e) {
      alert(e instanceof Error ? e.message : '发布失败');
    }
  }

  function handlePreview() {
    if (!currentSurvey) return;
    window.open(`/s/${currentSurvey.token}`, '_blank');
  }

  return (
    <div className="container py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1">
          <input
            value={currentSurvey?.title ?? ''}
            onChange={(e) => id && updateSurveyTitle(id, e.target.value)}
            placeholder="输入问卷标题..."
            className="text-3xl font-serif font-bold text-slate-800 bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-primary-500 focus:outline-none py-2 w-full transition-colors"
          />
          <textarea
            value={currentSurvey?.description ?? ''}
            onChange={(e) => id && updateSurveyDescription(id, e.target.value)}
            placeholder="添加问卷描述（选填）..."
            rows={2}
            className="w-full mt-2 text-slate-500 bg-transparent border-0 focus:outline-none resize-none placeholder:text-slate-300"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        <aside className="space-y-4">
          <div className="card p-5 sticky top-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              添加题目
            </h3>
            <div className="space-y-2">
              {TYPE_ITEMS.map(({ type, icon: Icon, desc }) => (
                <button
                  key={type}
                  onClick={() => addQuestion(type)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-primary-50 hover:border-primary-200 border border-slate-200 group transition-all"
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-primary-100 flex items-center justify-center text-slate-500 group-hover:text-primary-700 transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-700 group-hover:text-primary-700">
                      {QUESTION_TYPE_LABELS[type]}
                    </div>
                    <div className="text-xs text-slate-400 truncate">{desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">操作</h3>
            <button onClick={handleSave} disabled={saving} className="btn-secondary w-full justify-center inline-flex items-center gap-2">
              <Save className="w-4 h-4" />
              {saving ? '保存中...' : '保存更改'}
            </button>
            <button onClick={handlePreview} className="btn-secondary w-full justify-center inline-flex items-center gap-2">
              <Eye className="w-4 h-4" />
              预览问卷
            </button>
            {currentSurvey?.status !== 'published' ? (
              <button onClick={handlePublish} className="btn-primary w-full justify-center inline-flex items-center gap-2">
                <Send className="w-4 h-4" />
                发布问卷
              </button>
            ) : (
              <div className="text-center text-sm text-emerald-600 py-2 bg-emerald-50 rounded-xl border border-emerald-200">
                ✓ 问卷已发布
              </div>
            )}
          </div>
        </aside>

        <section className="space-y-4">
          {questions.length === 0 ? (
            <div className="card p-16 text-center">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center mb-5">
                <Grid3x3 className="w-10 h-10 text-primary-600" />
              </div>
              <h3 className="font-serif font-semibold text-xl text-slate-800 mb-2">开始设计您的问卷</h3>
              <p className="text-slate-500 mb-6">从左侧选择题型，开始添加第一道题目</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {TYPE_ITEMS.slice(0, 3).map(({ type, icon: Icon }) => (
                  <button
                    key={type}
                    onClick={() => addQuestion(type)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors text-sm font-medium"
                  >
                    <Icon className="w-4 h-4" />
                    添加{QUESTION_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            questions.map((q, idx) => (
              <div key={q.id} className="relative group">
                <QuestionEditorCard
                  index={idx}
                  question={q}
                  allQuestions={questions}
                  onChange={(patch) => updateQuestion(q.id, patch)}
                  onDelete={() => deleteQuestion(q.id)}
                  onDuplicate={() => duplicateQuestion(q.id)}
                />
                <div className="absolute right-4 top-16 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => moveQuestion(q.id, -1)}
                    disabled={idx === 0}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                    title="上移"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveQuestion(q.id, 1)}
                    disabled={idx === questions.length - 1}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                    title="下移"
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </div>

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-5 py-3 bg-slate-900 text-white rounded-full shadow-xl animate-slide-up text-sm z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
