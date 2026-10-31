import React from 'react';
import { Task, TASK_TYPES } from '../types';
import {
  formatRemaining,
  formatDateTime,
  getTaskGroup,
  stringToHue,
  toLocalDatetime,
} from '../utils/storage';
import { spawnConfetti } from '../utils/confetti';
import { Check, Star, Clock, Trash2 } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onToggleDone: (taskId: string) => void;
  onToggleStar: (taskId: string) => void;
  onSnooze: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleDone,
  onToggleStar,
  onSnooze,
  onDelete,
}) => {
  const typeCfg = TASK_TYPES[task.type] || TASK_TYPES.c;
  const group = getTaskGroup(task);
  const isUrgent =
    !task.done &&
    !!task.due &&
    new Date(task.due).getTime() - Date.now() < 864e5 &&
    new Date(task.due).getTime() > Date.now();

  const handleTick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!task.done) {
      const rect = e.currentTarget.getBoundingClientRect();
      spawnConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
    onToggleDone(task.id);
  };

  const dueMs = task.due ? new Date(task.due).getTime() - Date.now() : 0;
  const isLate = group === 'over';
  const isSoon = group === 'today' || group === 'tom';

  const courseHue = task.course ? stringToHue(task.course) : 260;

  return (
    <div
      className={`relative flex items-start gap-3 p-3 rounded-2xl border transition-all ${
        task.done
          ? 'opacity-55 bg-[var(--card)] border-[var(--line)]'
          : isUrgent
          ? 'bg-[var(--card)] border-red-500 task-urgent'
          : 'bg-[var(--card)] border-[var(--line)] shadow-xs'
      }`}
      style={{
        borderLeftWidth: '6px',
        borderLeftColor: typeCfg.c.startsWith('var') ? undefined : typeCfg.c,
      }}
    >
      {/* Checkbox Tick Button */}
      <button
        onClick={handleTick}
        aria-label={task.done ? 'Mark incomplete' : 'Mark complete'}
        className={`shrink-0 w-7 h-7 mt-0.5 rounded-full border-2 flex items-center justify-center transition active:scale-90 ${
          task.done
            ? 'bg-purple-600 border-purple-600 text-white'
            : 'border-purple-400/60 dark:border-purple-300/40 hover:border-purple-600 text-transparent'
        }`}
      >
        <Check className="w-4 h-4 stroke-[3]" />
      </button>

      {/* Task Content Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1">
          {task.star && <span className="text-amber-400 text-sm">⭐</span>}
          <h4
            className={`font-bold text-sm text-[var(--text)] break-words leading-snug ${
              task.done ? 'line-through opacity-70' : ''
            }`}
          >
            {task.title}
          </h4>
        </div>

        {/* Tags Row */}
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {/* Type Badge */}
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300">
            {typeCfg.i} {task.type === 'c' ? task.label || 'Custom' : typeCfg.n}
          </span>

          {/* Course Badge with dynamic hue */}
          {task.course && (
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `hsl(${courseHue}, 75%, 90%)`,
                color: `hsl(${courseHue}, 70%, 30%)`,
              }}
            >
              {task.course}
            </span>
          )}

          {/* Amount Badge */}
          {task.amount !== undefined && task.amount > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              💰 Rs {Number(task.amount).toLocaleString()}
            </span>
          )}

          {/* Due date text */}
          {task.due && (
            <span className="text-[11px] text-[var(--muted)]">
              {formatDateTime(task.due)}
            </span>
          )}
        </div>

        {/* Note snippet */}
        {task.note && (
          <p className="text-xs text-[var(--muted)] mt-1.5 break-words line-clamp-2">
            {task.note}
          </p>
        )}

        {/* Countdown / Remaining Badge */}
        {!task.done && task.due && (
          <div className="mt-2">
            <span
              className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                isLate
                  ? 'bg-red-600 text-white animate-pulse'
                  : isSoon
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                  : 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
              }`}
            >
              {isLate ? '⚠️ ' : isSoon ? '🔥 ' : ''}
              {formatRemaining(dueMs, false)}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons Column */}
      <div className="shrink-0 flex flex-col items-center gap-1">
        {/* Star */}
        <button
          onClick={() => onToggleStar(task.id)}
          aria-label="Toggle importance"
          className={`p-1.5 rounded-lg text-sm transition ${
            task.star ? 'text-amber-400' : 'text-[var(--muted)] hover:text-amber-400'
          }`}
        >
          <Star className={`w-4 h-4 ${task.star ? 'fill-amber-400 text-amber-400' : ''}`} />
        </button>

        {/* Snooze +1d if not done */}
        {!task.done && (
          <button
            onClick={() => onSnooze(task.id)}
            title="Push deadline by 1 day"
            className="p-1 rounded-lg text-[10px] font-bold text-[var(--muted)] hover:text-purple-600 hover:bg-purple-500/10"
          >
            +1d
          </button>
        )}

        {/* Delete */}
        <button
          onClick={() => onDelete(task.id)}
          aria-label="Delete task"
          className="p-1.5 rounded-lg text-[var(--muted)] hover:text-red-500 hover:bg-red-500/10 transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
