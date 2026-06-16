import { Star } from 'lucide-react';
import type { Question } from '../../shared/types.js';

interface Props {
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string | null;
  disabled?: boolean;
  preview?: boolean;
}

export default function QuestionRenderer({
  question,
  value,
  onChange,
  error,
  disabled,
  preview,
}: Props) {
  const baseInputClass = `w-full px-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all duration-200 ${
    error ? 'border-red-400 bg-red-50' : 'border-slate-200'
  } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`;

  function renderBody() {
    switch (question.type) {
      case 'single':
        return (
          <div className="space-y-2">
            {question.options?.map((opt) => (
              <label
                key={opt.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  value === opt.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-slate-200 hover:bg-slate-50'
                } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={() => onChange(opt.value)}
                  disabled={disabled}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-slate-700">{opt.label || '未命名选项'}</span>
              </label>
            ))}
          </div>
        );

      case 'multiple': {
        const arr = (Array.isArray(value) ? value : []) as string[];
        return (
          <div className="space-y-2">
            {question.options?.map((opt) => {
              const checked = arr.includes(opt.value);
              return (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    checked
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <input
                    type="checkbox"
                    value={opt.value}
                    checked={checked}
                    onChange={() => {
                      if (disabled) return;
                      const next = checked
                        ? arr.filter((v) => v !== opt.value)
                        : [...arr, opt.value];
                      onChange(next);
                    }}
                    disabled={disabled}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  <span className="text-slate-700">{opt.label || '未命名选项'}</span>
                </label>
              );
            })}
          </div>
        );
      }

      case 'dropdown':
        return (
          <select
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value || undefined)}
            disabled={disabled}
            className={baseInputClass}
          >
            <option value="">{preview ? '请选择...' : '-- 请选择 --'}</option>
            {question.options?.map((opt) => (
              <option key={opt.id} value={opt.value}>
                {opt.label || '未命名选项'}
              </option>
            ))}
          </select>
        );

      case 'text':
        return (
          <textarea
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            rows={4}
            placeholder="请输入您的回答..."
            className={baseInputClass + ' resize-y'}
          />
        );

      case 'rating': {
        const max = question.maxRating ?? 5;
        const current = Number(value) || 0;
        return (
          <div className="flex items-center gap-1">
            {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => !disabled && onChange(n)}
                disabled={disabled}
                className={`p-1.5 transition-transform ${
                  disabled ? 'cursor-not-allowed opacity-60' : 'hover:scale-110 cursor-pointer'
                }`}
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    n <= current
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-slate-300'
                  }`}
                />
              </button>
            ))}
            {current > 0 && (
              <span className="ml-3 text-sm text-slate-500">{current} / {max} 分</span>
            )}
          </div>
        );
      }

      case 'matrix': {
        const obj = (value as Record<string, string>) ?? {};
        return (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-3 text-left text-sm font-medium text-slate-600 w-48 border-b border-slate-200"></th>
                  {question.columns?.map((col) => (
                    <th key={col.id} className="p-3 text-center text-sm font-medium text-slate-600 border-b border-slate-200 min-w-[80px]">
                      {col.label || '列'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {question.rows?.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3 text-sm text-slate-700 font-medium">
                      {row.label || '行'}
                    </td>
                    {question.columns?.map((col) => (
                      <td key={col.id} className="p-3 text-center">
                        <input
                          type="radio"
                          name={`${question.id}-${row.id}`}
                          value={col.value}
                          checked={obj[row.id] === col.value}
                          onChange={() => {
                            if (disabled) return;
                            onChange({ ...obj, [row.id]: col.value });
                          }}
                          disabled={disabled}
                          className="w-4 h-4 text-primary-600"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <h3 className="text-base font-medium text-slate-800 flex-1">
          {question.title || '未命名题目'}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </h3>
      </div>
      {renderBody()}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
