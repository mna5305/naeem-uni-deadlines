export type TaskType = 'a' | 'q' | 'g' | 'f' | 'c';

export interface TaskTypeConfig {
  n: string;
  i: string;
  c: string;
}

export const TASK_TYPES: Record<TaskType, TaskTypeConfig> = {
  a: { n: 'Assignment', i: '📝', c: 'var(--a)' },
  q: { n: 'Quiz', i: '⏱️', c: 'var(--q)' },
  g: { n: 'GDB', i: '💬', c: 'var(--g)' },
  f: { n: 'Fee', i: '💰', c: '#2fb344' },
  c: { n: 'Custom', i: '✏️', c: 'var(--o)' },
};

export interface Task {
  id: string;
  title: string;
  course: string;
  type: TaskType;
  label?: string; // For custom categories
  amount?: number; // In Rs (for fees)
  due: string; // ISO or YYYY-MM-DDTHH:mm
  note?: string;
  star: boolean;
  done: boolean;
  doneAt?: number | null;
}

export interface InstallmentRow {
  no: number | null;
  amount: number;
  due: string; // YYYY-MM-DD
}

export type TaskGroup = 'over' | 'today' | 'tom' | 'week' | 'later' | 'none' | 'done';

export type FilterKey = 'all' | 'today' | 'f' | 'done' | 'a' | 'q' | 'g' | 'c';

export interface BackupData {
  app: string;
  version: number;
  savedAt: string;
  tasks: Task[];
}

