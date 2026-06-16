import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Share2,
  Link,
  Copy,
  Check,
  Code,
  ExternalLink,
  Send,
  XCircle,
  PlayCircle,
} from 'lucide-react';
import { useSurveyStore } from '../store/surveyStore.js';

export default function SurveyShare() {
  const { id } = useParams<{ id: string }>();
  const { currentSurvey, fetchSurvey, publishSurvey, closeSurvey } = useSurveyStore();
  const [copied, setCopied] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (id) fetchSurvey(id);
  }, [id, fetchSurvey]);

  const token = currentSurvey?.token ?? '';
  const answerUrl = typeof window !== 'undefined' ? `${window.location.origin}/s/${token}` : '';
  const embedCode = `<iframe src="${answerUrl.replace('/s/', '/embed/')}" width="100%" height="800" frameborder="0" allowfullscreen></iframe>`;

  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      alert('复制失败，请手动复制');
    }
  }

  async function handlePublish() {
    if (!id) return;
    if (!confirm('发布后用户即可通过链接填写问卷，确定发布吗？')) return;
    setPublishing(true);
    try {
      await publishSurvey(id);
    } catch (e) {
      alert(e instanceof Error ? e.message : '发布失败');
    } finally {
      setPublishing(false);
    }
  }

  async function handleClose() {
    if (!id) return;
    if (!confirm('关闭后用户将无法继续填写，确定关闭此问卷吗？')) return;
    setClosing(true);
    try {
      await closeSurvey(id);
    } catch (e) {
      alert(e instanceof Error ? e.message : '关闭失败');
    } finally {
      setClosing(false);
    }
  }

  const isPublished = currentSurvey?.status === 'published';
  const isClosed = currentSurvey?.status === 'closed';

  return (
    <div className="container py-8 max-w-4xl">
      <div className="card p-8 mb-6">
        <div className="flex items-start gap-5">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${
            isPublished ? 'bg-emerald-50' : isClosed ? 'bg-amber-50' : 'bg-primary-50'
          }`}>
            <Share2 className={`w-8 h-8 ${
              isPublished ? 'text-emerald-600' : isClosed ? 'text-amber-600' : 'text-primary-600'
            }`} />
          </div>
          <div className="flex-1">
            <h2 className="font-serif font-semibold text-xl text-slate-800 mb-1">分享您的问卷</h2>
            <p className="text-sm text-slate-500">
              当前状态：
              <span className={`ml-1 font-medium ${
                isPublished ? 'text-emerald-600' : isClosed ? 'text-amber-600' : 'text-primary-600'
              }`}>
                {currentSurvey?.status === 'draft' && '草稿（未发布）'}
                {isPublished && '已发布，正在收集中'}
                {isClosed && '已关闭收集'}
              </span>
            </p>
          </div>
          <div>
            {!isPublished && !isClosed && (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="btn-primary inline-flex items-center gap-2"
              >
                <PlayCircle className="w-4 h-4" />
                {publishing ? '发布中...' : '发布问卷'}
              </button>
            )}
            {isPublished && (
              <button
                onClick={handleClose}
                disabled={closing}
                className="btn-danger inline-flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                {closing ? '关闭中...' : '关闭收集'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <Link className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">独立答题链接</h3>
              <p className="text-xs text-slate-500">直接分享此链接给答题人</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <input
              readOnly
              value={answerUrl}
              className="input flex-1 text-sm bg-slate-50"
            />
            <button
              onClick={() => copyText('link', answerUrl)}
              disabled={!isPublished}
              className="btn-secondary shrink-0 inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {copied === 'link' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  复制
                </>
              )}
            </button>
          </div>
          <a
            href={isPublished ? answerUrl : undefined}
            target={isPublished ? '_blank' : undefined}
            rel="noreferrer"
            className={`inline-flex items-center gap-2 text-sm font-medium ${
              isPublished ? 'text-primary-600 hover:text-primary-700' : 'text-slate-400 cursor-not-allowed'
            }`}
          >
            <ExternalLink className="w-4 h-4" />
            在新窗口打开预览
          </a>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent-50 flex items-center justify-center">
              <Code className="w-5 h-5 text-accent-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">iframe 嵌入代码</h3>
              <p className="text-xs text-slate-500">嵌入到您的网站或博客中</p>
            </div>
          </div>
          <div className="bg-slate-900 rounded-xl p-4 mb-4 overflow-x-auto">
            <code className="text-xs text-emerald-300 whitespace-pre-wrap break-all font-mono">
              {embedCode}
            </code>
          </div>
          <button
            onClick={() => copyText('embed', embedCode)}
            disabled={!isPublished}
            className="btn-secondary w-full justify-center inline-flex items-center gap-2 disabled:opacity-50"
          >
            {copied === 'embed' ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                代码已复制到剪贴板
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                复制嵌入代码
              </>
            )}
          </button>
        </div>
      </div>

      {!isPublished && (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
          <Send className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">问卷尚未发布</p>
            <p className="text-xs text-amber-700 mt-0.5">请先发布问卷后，用户才能通过链接或嵌入页面访问并填写问卷。</p>
          </div>
        </div>
      )}
    </div>
  );
}
