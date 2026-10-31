import React, { useState } from 'react';
import { Task, TaskType, TASK_TYPES } from '../types';
import { toLocalDatetime } from '../utils/storage';
import { Star, X, Sparkles } from 'lucide-react';

interface AddTaskPanelProps {
  existingCourses: string[];
  defaultType?: TaskType;
  onAddTask: (task: Omit<Task, 'id' | 'done'>) => void;
  onClose: () => void;
}

export const AddTaskPanel: React.FC<AddTaskPanelProps> = ({
  existingCourses,
  defaultType = 'a',
  onAddTask,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [selType, setSelType] = useState<TaskType>(defaultType);
  const [customLabel, setCustomLabel] = useState('');
  const [course, setCourse] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [due, setDue] = useState<string>('');
  const [note, setNote] = useState('');
  const [isStar, setIsStar] = useState(false);

  const handleQuickDate = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    d.setHours(23, 59, 0, 0);
    setDue(toLocalDatetime(d));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddTask({
      title: title.trim(),
      course: course.trim(),
      type: selType,
      label: selType === 'c' ? customLabel.trim() || 'Custom' : undefined,
      amount: selType === 'f' ? Number(amount) || 0 : undefined,
      due: due,
      note: note.trim() || undefined,
      star: isStar,
    });

    onClose();
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--line)] rounded-3xl p-4 shadow-lg mb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold flex items-center gap-1.5 text-[var(--text)]">
          <span>➕</span> Add a new deadline
        </h3>
        <button
          onClick={onClose}
          className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] font-semibold"
        >
          Close
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What is it? (e.g. Assignment 2, Quiz 1, Midterm)"
          maxLength={80}
          required
          autoFocus
          className="w-full p-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--text)] text-sm font-medium focus:outline-2 focus:outline-[var(--accent)]"
        />

        {/* Types selector chips */}
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(TASK_TYPES) as TaskType[]).map((key) => {
            const item = TASK_TYPES[key];
            const isSelected = selType === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelType(key)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition active:scale-95 ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {item.i} {key === 'c' ? 'Custom' : item.n}
              </button>
            );
          })}
        </div>

        {/* Custom Category Input if 'c' is selected */}
        {selType === 'c' && (
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="Your custom category (e.g. Presentation, Lab, Final Project)"
            maxLength={30}
            className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--text)] text-xs"
          />
        )}

        {/* Course + Star Row */}
        <div className="flex gap-2">
          <input
            type="text"
            list="course-list"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            placeholder="Course code (e.g. CS101, MTH301)"
            maxLength={40}
            className="flex-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--text)] text-xs font-semibold"
          />
          <datalist id="course-list">
            {existingCourses.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>

          <button
            type="button"
            onClick={() => setIsStar(!isStar)}
            className={`w-11 rounded-xl border flex items-center justify-center text-lg transition ${
              isStar
                ? 'bg-amber-400 border-amber-400 text-white shadow-xs'
                : 'bg-[var(--bg)] border-[var(--line)] text-[var(--muted)]'
            }`}
            title="Mark as important"
          >
            ⭐
          </button>
        </div>

        {/* Amount in Rs if Fee 'f' is selected */}
        {selType === 'f' && (
          <input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Installment amount in Rs (e.g. 2650)"
            className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--text)] text-xs font-bold"
          />
        )}

        {/* Quick Date Shortcuts */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => handleQuickDate(0)}
            className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--bg)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => handleQuickDate(1)}
            className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--bg)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]"
          >
            Tomorrow
          </button>
          <button
            type="button"
            onClick={() => handleQuickDate(3)}
            className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--bg)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]"
          >
            In 3 days
          </button>
          <button
            type="button"
            onClick={() => handleQuickDate(7)}
            className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--bg)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]"
          >
            Next week
          </button>
        </div>

        {/* Due Date & Time */}
        <input
          type="datetime-local"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--text)] text-xs font-medium"
        />

        {/* Note */}
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional): LMS submission link, total marks, instructions..."
          className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--text)] text-xs resize-none"
        />

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-linear-to-r from-purple-600 via-pink-600 to-amber-500 text-white font-bold text-sm shadow-md hover:opacity-95 active:scale-98 transition flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-4 h-4" /> Save it ✨
        </button>
      </form>
    </div>
  );
};
