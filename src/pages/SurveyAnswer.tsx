import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Lock, CheckCircle2, AlertCircle, Send, ShieldAlert } from 'lucide-react';
import { surveyApi } from '../lib/api.js';
import type { Survey } from '../../shared/types.js';
import QuestionRenderer from '../components/QuestionRenderer.js';
import {
  evaluateLogic,
  validateAnswer,
  getBrowserId,
  isSurveySubmitted,
  markSurveySubmitted,
} from '../lib/surveyUtils.js';

type Stage = 'loading' | 'password' | 'form' | 'success' | 'error' | 'closed' | 'already';

export default function SurveyAnswer({ embed = false }: { embed?: boolean }) {
  const { token } = useParams<{ token: string }>();
  const [stage, setStage] = useState<Stage>('loading');
  const [survey, setSurvey] = useState<(Survey & { requiresPassword?: boolean }) | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [validated, setValidated] = useState(false);

  useEffect(() => {
    if (!token) return;
    if (isSurveySubmitted(token)) {
      setStage('already');
      return;
    }
    surveyApi
      .getByToken(token)
      .then((s) => {
        setSurvey(s);
        if (s.requiresPassword) {
          setStage('password');
        } else {
          setStage('form');
        }
      })
      .catch((err) => {
        setErrorMsg(err.message ?? '问卷不存在或未发布');
        setStage('error');
      });
  }, [token]);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !survey) return;
    setPasswordError(null);
    try {
      const res = await surveyApi.verifyPassword(token, password);
      if (res.valid) {
        setStage('form');
      }
    } catch {
      setPasswordError('密码错误');
    }
  }

  function setAnswer(qId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
    if (validated) {
      const q = survey?.questions.find((qq) => qq.id === qId);
      if (q) setErrors((prev) => ({ ...prev, [qId]: validateAnswer(q, value) }));
    }
  }

  const allLogic = survey?.questions.flatMap((q) => q.logic ?? []) ?? [];
  const visibleIds = survey ? evaluateLogic(allLogic, answers, survey.questions) : new Set<string>();
  const visibleQuestions = survey?.questions.filter((q) => visibleIds.has(q.id)) ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!survey || !token) return;

    const nextErrors: Record<string, string | null> = {};
    visibleQuestions.forEach((q) => {
      nextErrors[q.id] = validateAnswer(q, answers[q.id]);
    });
    setErrors(nextErrors);
    setValidated(true);

    if (Object.values(nextErrors).some((v) => v)) return;

    setSubmitting(true);
    try {
      await surveyApi.submitByToken(
        token,
        answers,
        survey?.requiresPassword ? password : undefined,
        getBrowserId()
      );
      markSurveySubmitted(token);
      setStage('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '提交失败';
      if (msg.includes('已经提交') || msg.includes('duplicate')) {
        markSurveySubmitted(token);
        setStage('already');
      } else {
        setErrorMsg(msg);
        setStage('error');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (stage === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-400">加载中...</div>
      </div>
    );
  }

  if (stage === 'already') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="card p-8 text-center max-w-md">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="font-serif font-semibold text-xl text-slate-800 mb-2">您已提交过该问卷</h2>
          <p className="text-slate-500">同一浏览器只能提交一次答卷。如需重新作答，请使用其他浏览器或设备。</p>
        </div>
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="card p-8 text-center max-w-md">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="font-serif font-semibold text-xl text-slate-800 mb-2">暂时无法访问</h2>
          <p className="text-slate-500">{errorMsg ?? '问卷不存在或已关闭'}</p>
        </div>
      </div>
    );
  }

  if (stage === 'password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <form onSubmit={handlePasswordSubmit} className="card p-8 w-full max-w-md">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary-50 flex items-center justify-center mb-5">
            <Lock className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="font-serif font-semibold text-center text-xl text-slate-800 mb-1">
            {survey?.title}
          </h2>
          <p className="text-sm text-slate-500 text-center mb-6">此问卷需要访问密码</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
            className="input"
          />
          {passwordError && <p className="text-sm text-red-500 mt-2">{passwordError}</p>}
          <button type="submit" className="btn-primary w-full mt-5">进入问卷</button>
        </form>
      </div>
    );
  }

  if (stage === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="card p-10 text-center max-w-md animate-fade-in">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-5">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="font-serif font-semibold text-2xl text-slate-800 mb-2">提交成功！</h2>
          <p className="text-slate-500">感谢您的参与，您的答卷已记录。</p>
          <p className="text-xs text-slate-400 mt-4">提交后不可修改</p>
        </div>
      </div>
    );
  }

  const wrap = embed ? (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white py-8 px-4">
      <form onSubmit={handleSubmit} className="card max-w-2xl mx-auto animate-fade-in">
        <SurveyFormBody
          survey={survey!}
          visibleQuestions={visibleQuestions}
          answers={answers}
          errors={errors}
          setAnswer={setAnswer}
          submitting={submitting}
        />
      </form>
    </div>
  ) : (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 text-white">
          <h1 className="font-serif font-bold text-3xl mb-2">{survey?.title}</h1>
          {survey?.description && (
            <p className="text-primary-100 text-base">{survey.description}</p>
          )}
        </div>
        <form onSubmit={handleSubmit} className="card p-0 overflow-hidden animate-slide-up">
          <SurveyFormBody
            survey={survey!}
            visibleQuestions={visibleQuestions}
            answers={answers}
            errors={errors}
            setAnswer={setAnswer}
            submitting={submitting}
            compact
          />
        </form>
      </div>
    </div>
  );

  return wrap;
}

function SurveyFormBody({
  survey,
  visibleQuestions,
  answers,
  errors,
  setAnswer,
  submitting,
  compact,
}: {
  survey: Survey;
  visibleQuestions: Survey['questions'];
  answers: Record<string, unknown>;
  errors: Record<string, string | null>;
  setAnswer: (id: string, v: unknown) => void;
  submitting: boolean;
  compact?: boolean;
}) {
  return (
    <>
      {!compact && (
        <div className="bg-gradient-to-r from-primary-700 to-primary-600 text-white p-6 mb-0">
          <h2 className="font-serif font-semibold text-xl">{survey.title}</h2>
          {survey.description && (
            <p className="text-sm text-primary-100 mt-1">{survey.description}</p>
          )}
        </div>
      )}
      <div className="p-6 space-y-8">
        {visibleQuestions.length === 0 ? (
          <p className="text-center text-slate-400 py-8">问卷暂无题目</p>
        ) : (
          visibleQuestions.map((q, idx) => (
            <div key={q.id} className="animate-fade-in">
              <div className="text-xs text-slate-400 mb-2">第 {idx + 1} 题</div>
              <QuestionRenderer
                question={q}
                value={answers[q.id]}
                onChange={(v) => setAnswer(q.id, v)}
                error={errors[q.id]}
              />
            </div>
          ))
        )}
        <div className="pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={submitting || visibleQuestions.length === 0}
            className="btn-primary w-full justify-center inline-flex items-center gap-2 text-base py-3"
          >
            <Send className="w-4 h-4" />
            {submitting ? '提交中...' : '提交答卷'}
          </button>
          <p className="text-xs text-slate-400 text-center mt-3">
            提交后不可修改，请确认答案
          </p>
        </div>
      </div>
    </>
  );
}
