import type {
  Question,
  QuestionType,
  Option,
  MatrixDimension,
  LogicRule,
} from '../../shared/types.js';

export function generateId(prefix = 'q'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function createOption(label = ''): Option {
  return { id: generateId('opt'), label, value: generateId('val') };
}

export function createMatrixDim(label = ''): MatrixDimension {
  const value = generateId('val');
  return { id: generateId('dim'), label, value };
}

export function createQuestion(type: QuestionType): Question {
  const base: Question = {
    id: generateId('q'),
    type,
    title: '',
    required: true,
  };

  switch (type) {
    case 'single':
    case 'multiple':
    case 'dropdown':
      base.options = [createOption('选项 1'), createOption('选项 2')];
      break;
    case 'rating':
      base.maxRating = 5;
      break;
    case 'matrix':
      base.rows = [createMatrixDim('行 1'), createMatrixDim('行 2')];
      base.columns = [createMatrixDim('列 1'), createMatrixDim('列 2')];
      break;
  }

  return base;
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single: '单选题',
  multiple: '多选题',
  dropdown: '下拉选择',
  text: '文本填空',
  rating: '评分量表',
  matrix: '矩阵题',
};

export function evaluateLogic(
  rules: LogicRule[],
  answers: Record<string, unknown>,
  questions: Question[]
): Set<string> {
  const visible = new Set<string>(questions.map((q) => q.id));
  const skipTargets = new Set<string>();

  rules.forEach((rule) => {
    const answer = answers[rule.questionId];
    let conditionMet = false;
    const ruleValue = rule.value;

    switch (rule.condition) {
      case 'equals':
        if (Array.isArray(answer)) {
          conditionMet = answer.includes(String(ruleValue));
        } else {
          conditionMet = String(answer) === String(ruleValue);
        }
        break;
      case 'not_equals':
        if (Array.isArray(answer)) {
          conditionMet = !answer.includes(String(ruleValue));
        } else {
          conditionMet = String(answer) !== String(ruleValue);
        }
        break;
      case 'contains':
        if (Array.isArray(answer)) {
          const vals = Array.isArray(ruleValue) ? ruleValue : [String(ruleValue)];
          conditionMet = vals.every((v) => answer.includes(v));
        } else {
          conditionMet = String(answer).includes(String(ruleValue));
        }
        break;
      case 'not_contains':
        if (Array.isArray(answer)) {
          const vals = Array.isArray(ruleValue) ? ruleValue : [String(ruleValue)];
          conditionMet = !vals.some((v) => answer.includes(v));
        } else {
          conditionMet = !String(answer).includes(String(ruleValue));
        }
        break;
    }

    if (conditionMet) {
      if (rule.action === 'show') {
        visible.add(rule.targetQuestionId);
      } else if (rule.action === 'skip') {
        skipTargets.add(rule.targetQuestionId);
      }
    } else {
      if (rule.action === 'show') {
        visible.delete(rule.targetQuestionId);
      }
    }
  });

  skipTargets.forEach((id) => visible.delete(id));
  return visible;
}

export function validateAnswer(question: Question, value: unknown): string | null {
  if (!question.required) return null;

  if (value === undefined || value === null) {
    return '此题为必填项';
  }

  if (typeof value === 'string' && value.trim() === '') {
    return '此题为必填项';
  }

  if (Array.isArray(value) && value.length === 0) {
    return '此题为必填项';
  }

  if (question.type === 'matrix') {
    const obj = value as Record<string, string> | undefined;
    if (!obj) return '此题为必填项';
    const rows = question.rows ?? [];
    const allFilled = rows.every((r) => obj[r.id]);
    if (!allFilled) return '请填写所有行';
  }

  return null;
}
