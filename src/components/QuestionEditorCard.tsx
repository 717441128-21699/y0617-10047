import { useState } from 'react';
import {
  GripVertical,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Settings,
  GitBranch,
} from 'lucide-react';
import type { Question, LogicRule, LogicCondition, LogicAction } from '../../shared/types.js';
import {
  createOption,
  createMatrixDim,
  generateId,
  QUESTION_TYPE_LABELS,
} from '../lib/surveyUtils.js';
import QuestionRenderer from './QuestionRenderer.js';

interface Props {
  index: number;
  question: Question;
  allQuestions: Question[];
  onChange: (q: Question) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export default function QuestionEditorCard({
  index,
  question,
  allQuestions,
  onChange,
  onDelete,
  onDuplicate,
}: Props) {
  const [showLogic, setShowLogic] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  function updatePatch(patch: Partial<Question>) {
    onChange({ ...question, ...patch });
  }

  function updateOption(optId: string, label: string) {
    if (!question.options) return;
    updatePatch({
      options: question.options.map((o) => (o.id === optId ? { ...o, label } : o)),
    });
  }

  function addOption() {
    if (!question.options) return;
    updatePatch({
      options: [...question.options, createOption(`选项 ${question.options.length + 1}`)],
    });
  }

  function removeOption(optId: string) {
    if (!question.options || question.options.length <= 1) return;
    updatePatch({ options: question.options.filter((o) => o.id !== optId) });
  }

  function updateMatrixDim(kind: 'rows' | 'columns', dimId: string, label: string) {
    const arr = question[kind] ?? [];
    updatePatch({
      [kind]: arr.map((d) => (d.id === dimId ? { ...d, label } : d)),
    } as Partial<Question>);
  }

  function addMatrixDim(kind: 'rows' | 'columns') {
    const arr = question[kind] ?? [];
    updatePatch({
      [kind]: [...arr, createMatrixDim(kind === 'rows' ? `行 ${arr.length + 1}` : `列 ${arr.length + 1}`)],
    } as Partial<Question>);
  }

  function removeMatrixDim(kind: 'rows' | 'columns', dimId: string) {
    const arr = question[kind] ?? [];
    if (arr.length <= 1) return;
    updatePatch({ [kind]: arr.filter((d) => d.id !== dimId) } as Partial<Question>);
  }

  function addLogicRule() {
    const rules = question.logic ?? [];
    const firstOpt = question.options?.[0];
    const laterQ = allQuestions.find((q) => q.id !== question.id);
    const newRule: LogicRule = {
      id: generateId('logic'),
      questionId: question.id,
      condition: 'equals',
      value: firstOpt?.value ?? '',
      action: 'skip',
      targetQuestionId: laterQ?.id ?? '',
    };
    updatePatch({ logic: [...rules, newRule] });
  }

  function updateLogicRule(ruleId: string, patch: Partial<LogicRule>) {
    const rules = question.logic ?? [];
    updatePatch({
      logic: rules.map((r) => (r.id === ruleId ? { ...r, ...patch } : r)),
    });
  }

  function removeLogicRule(ruleId: string) {
    updatePatch({ logic: (question.logic ?? []).filter((r) => r.id !== ruleId) });
  }

  const supportsOptions = ['single', 'multiple', 'dropdown'].includes(question.type);
  const supportsLogic = ['single', 'multiple', 'dropdown'].includes(question.type);

  return (
    <div className="card overflow-hidden animate-slide-up">
      <div className="flex items-center gap-2 px-5 py-3 bg-slate-50/50 border-b border-slate-100">
        <div className="cursor-grab text-slate-400 hover:text-slate-600">
          <GripVertical className="w-5 h-5" />
        </div>
        <span className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-sm font-semibold flex items-center justify-center">
          {index + 1}
        </span>
        <span className="chip bg-white border border-slate-200 text-slate-600">
          {QUESTION_TYPE_LABELS[question.type]}
        </span>
        <div className="flex-1" />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={question.required}
            onChange={(e) => updatePatch({ required: e.target.checked })}
            className="w-4 h-4 text-primary-600 rounded"
          />
          必填
        </label>
        {supportsLogic && (
          <button
            onClick={() => setShowLogic(!showLogic)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              showLogic ? 'bg-primary-100 text-primary-700' : 'hover:bg-slate-100 text-slate-500'
            }`}
            title="逻辑跳转"
          >
            <GitBranch className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onDuplicate}
          className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors"
          title="复制题目"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="w-8 h-8 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-500 flex items-center justify-center transition-colors"
          title="删除题目"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors"
        >
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed && (
        <div className="p-5 space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">题目标题</label>
            <input
              type="text"
              value={question.title}
              onChange={(e) => updatePatch({ title: e.target.value })}
              placeholder="请输入题目内容..."
              className="input text-base"
            />
          </div>

          {supportsOptions && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">选项</label>
              <div className="space-y-2">
                {question.options?.map((opt, i) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <span className="w-6 text-sm text-slate-400 text-right">{i + 1}.</span>
                    <input
                      type="text"
                      value={opt.label}
                      onChange={(e) => updateOption(opt.id, e.target.value)}
                      placeholder={`选项 ${i + 1}`}
                      className="input flex-1"
                    />
                    <button
                      onClick={() => removeOption(opt.id)}
                      disabled={(question.options?.length ?? 0) <= 1}
                      className="w-9 h-9 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addOption}
                className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                添加选项
              </button>
            </div>
          )}

          {question.type === 'rating' && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">最高评分</label>
              <select
                value={question.maxRating ?? 5}
                onChange={(e) => updatePatch({ maxRating: Number(e.target.value) })}
                className="input w-40"
              >
                {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>{n} 分</option>
                ))}
              </select>
            </div>
          )}

          {question.type === 'matrix' && (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">行标签</label>
                <div className="space-y-2">
                  {question.rows?.map((row, i) => (
                    <div key={row.id} className="flex items-center gap-2">
                      <span className="w-6 text-sm text-slate-400 text-right">{i + 1}.</span>
                      <input
                        type="text"
                        value={row.label}
                        onChange={(e) => updateMatrixDim('rows', row.id, e.target.value)}
                        className="input flex-1"
                      />
                      <button
                        onClick={() => removeMatrixDim('rows', row.id)}
                        disabled={(question.rows?.length ?? 0) <= 1}
                        className="w-9 h-9 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => addMatrixDim('rows')}
                  className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> 添加行
                </button>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">列标签</label>
                <div className="space-y-2">
                  {question.columns?.map((col, i) => (
                    <div key={col.id} className="flex items-center gap-2">
                      <span className="w-6 text-sm text-slate-400 text-right">{i + 1}.</span>
                      <input
                        type="text"
                        value={col.label}
                        onChange={(e) => updateMatrixDim('columns', col.id, e.target.value)}
                        className="input flex-1"
                      />
                      <button
                        onClick={() => removeMatrixDim('columns', col.id)}
                        disabled={(question.columns?.length ?? 0) <= 1}
                        className="w-9 h-9 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => addMatrixDim('columns')}
                  className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> 添加列
                </button>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <Settings className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-medium text-slate-500">预览效果</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100">
              <QuestionRenderer
                question={question}
                value={question.type === 'multiple' ? [] : question.type === 'matrix' ? {} : undefined}
                onChange={() => {}}
                preview
                disabled
              />
            </div>
          </div>

          {supportsLogic && showLogic && (
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-primary-500" />
                  <span className="text-sm font-semibold text-slate-700">逻辑跳转规则</span>
                </div>
                <button onClick={addLogicRule} className="btn-accent text-xs py-1.5 px-3 inline-flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> 添加规则
                </button>
              </div>

              {(question.logic?.length ?? 0) === 0 ? (
                <div className="text-center py-6 text-sm text-slate-400 bg-slate-50 rounded-xl">
                  暂无逻辑规则，点击「添加规则」配置条件跳转
                </div>
              ) : (
                <div className="space-y-3">
                  {question.logic?.map((rule) => (
                    <div key={rule.id} className="p-4 rounded-xl bg-primary-50/40 border border-primary-100 space-y-3">
                      <div className="flex items-center flex-wrap gap-2 text-sm">
                        <span className="text-slate-600">当此题目答案</span>
                        <select
                          value={rule.condition}
                          onChange={(e) => updateLogicRule(rule.id, { condition: e.target.value as LogicCondition })}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm"
                        >
                          <option value="equals">等于</option>
                          <option value="not_equals">不等于</option>
                          <option value="contains">包含</option>
                          <option value="not_contains">不包含</option>
                        </select>
                        <select
                          value={String(rule.value)}
                          onChange={(e) => updateLogicRule(rule.id, { value: e.target.value })}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm max-w-[200px]"
                        >
                          {question.options?.map((opt) => (
                            <option key={opt.id} value={opt.value}>{opt.label || '选项'}</option>
                          ))}
                        </select>
                        <span className="text-slate-600">时，</span>
                        <select
                          value={rule.action}
                          onChange={(e) => updateLogicRule(rule.id, { action: e.target.value as LogicAction })}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm"
                        >
                          <option value="show">显示</option>
                          <option value="skip">跳过</option>
                        </select>
                        <select
                          value={rule.targetQuestionId}
                          onChange={(e) => updateLogicRule(rule.id, { targetQuestionId: e.target.value })}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm max-w-[220px]"
                        >
                          {allQuestions
                            .filter((q) => q.id !== question.id)
                            .map((q, i) => (
                              <option key={q.id} value={q.id}>
                                第 {i + 1} 题：{q.title || '未命名'}
                              </option>
                            ))}
                        </select>
                        <div className="flex-1" />
                        <button
                          onClick={() => removeLogicRule(rule.id)}
                          className="w-7 h-7 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-500 flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
