import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Clock,
  Users,
  Lock,
  CalendarClock,
  CalendarCheck,
  CalendarX,
  Save,
  AlertCircle,
} from 'lucide-react';
import { useSurveyStore } from '../store/surveyStore.js';
import type { SurveySettings as SurveySettingsType } from '../../shared/types.js';

export default function SurveySettings() {
  const { id } = useParams<{ id: string }>();
  const { currentSurvey, fetchSurvey, updateSettings } = useSurveyStore();
  const [settings, setSettings] = useState<SurveySettingsType>({
    startTime: null,
    endTime: null,
    maxResponses: null,
    password: null,
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id && currentSurvey?.settings) {
      setSettings(currentSurvey.settings);
    }
  }, [id, currentSurvey]);

  useEffect(() => {
    if (id) fetchSurvey(id);
  }, [id, fetchSurvey]);

  async function handleSave() {
    if (!id) return;
    setError(null);
    try {
      await updateSettings(id, settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    }
  }

  function toLocalInput(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function fromLocalInput(val: string): string | null {
    if (!val) return null;
    return new Date(val).toISOString();
  }

  return (
    <div className="container py-8 max-w-3xl">
      <div className="space-y-6">
        <div className="card p-6">
          <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center flex-shrink-0">
            <CalendarClock className="w-6 h-6 text-primary-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-serif font-semibold text-slate-800 text-lg">答题时间</h2>
            <p className="text-sm text-slate-500 mt-1">设置问卷的可填写时间范围，未设置表示不限时间</p>
          </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-16">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2 flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-slate-400" />
                开始时间
              </label>
              <input
                type="datetime-local"
                value={toLocalInput(settings.startTime)}
                onChange={(e) => setSettings({ ...settings, startTime: fromLocalInput(e.target.value) })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2 flex items-center gap-2">
                <CalendarX className="w-4 h-4 text-slate-400" />
                截止时间
              </label>
              <input
                type="datetime-local"
                value={toLocalInput(settings.endTime)}
                onChange={(e) => setSettings({ ...settings, endTime: fromLocalInput(e.target.value) })}
                className="input"
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-accent-50 flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-accent-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-serif font-semibold text-slate-800 text-lg">答卷数量上限</h2>
              <p className="text-sm text-slate-500 mt-1">达到上限后问卷将自动关闭，留空表示不限制</p>
            </div>
          </div>
          <div className="pl-16">
            <input
              type="number"
              min={1}
              value={settings.maxResponses ?? ''}
              placeholder="例如：1000"
              onChange={(e) => {
                const v = e.target.value;
                setSettings({
                  ...settings,
                  maxResponses: v === '' ? null : Math.max(1, Number(v)),
                });
              }}
              className="input max-w-xs"
            />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center flex-shrink-0">
              <Lock className="w-6 h-6 text-violet-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-serif font-semibold text-slate-800 text-lg">访问密码</h2>
              <p className="text-sm text-slate-500 mt-1">设置后答题人需输入密码才能填写问卷，留空表示无需密码</p>
            </div>
          </div>
          <div className="pl-16">
            <input
              type="text"
              value={settings.password ?? ''}
              placeholder="请输入访问密码"
              onChange={(e) => {
                const v = e.target.value;
                setSettings({ ...settings, password: v === '' ? null : v });
              }}
              className="input max-w-xs"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div>
            {error && (
              <p className="text-sm text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
            {saved && (
              <p className="text-sm text-emerald-600 flex items-center gap-1.5">
                ✓ 设置已保存
              </p>
            )}
          </div>
          <button onClick={handleSave} className="btn-primary inline-flex items-center gap-2">
            <Save className="w-4 h-4" />
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
}
