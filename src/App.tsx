import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Task, TaskType, FilterKey, InstallmentRow } from './types';
import {
  loadTasks,
  saveTasks,
  getTaskGroup,
  calculateStreak,
  formatRemaining,
  downloadMobileBackup,
  getAllBackups,
  toLocalDatetime,
} from './utils/storage';
import { TaskCard } from './components/TaskCard';
import { AddTaskPanel } from './components/AddTaskPanel';
import { FeeScannerModal } from './components/FeeScannerModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import {
  Plus,
  Search,
  MoreVertical,
  Download,
  Upload,
  Moon,
  Sun,
  Camera,
  Edit3,
  Smartphone,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const MOTIVATIONAL_QUOTES = [
  'Small steps every day beat last-minute panic.',
  'Future you says thanks for starting today.',
  'Done is better than perfect.',
  'One task at a time. You have got this.',
  'Deadlines are just plans with a date.',
];

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [filter, setFilter] = useState<FilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDone, setShowDone] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [feeModalMode, setFeeModalMode] = useState<'scan' | 'manual' | null>(null);
  const [showIOSInstallGuide, setShowIOSInstallGuide] = useState(false);
  const [quote, setQuote] = useState(MOTIVATIONAL_QUOTES[0]);
  const [isDark, setIsDark] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [toastInfo, setToastInfo] = useState<{ message: string; undoAction?: () => void } | null>(null);
  const [backupText, setBackupText] = useState('');
  const [backupsList, setBackupsList] = useState<Record<string, Task[]>>({});

  const toastTimerRef = useRef<any>(null);
  const addPanelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize theme, quote, and local snapshots
  useEffect(() => {
    const q = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    setQuote(q);

    const savedTheme = document.documentElement.dataset.theme;
    if (savedTheme) {
      setIsDark(savedTheme === 'dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(prefersDark);
    }

    setBackupsList(getAllBackups());
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
  };

  // Timer loop for real-time countdown seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const updateTasks = (newTasks: Task[], notifyMsg?: string, undoCallback?: () => void) => {
    setTasks(newTasks);
    saveTasks(newTasks);
    setBackupsList(getAllBackups());
    if (notifyMsg) {
      showToast(notifyMsg, undoCallback);
    }
  };

  const showToast = (message: string, undoAction?: () => void) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastInfo({ message, undoAction });
    toastTimerRef.current = setTimeout(() => {
      setToastInfo(null);
    }, 4500);
  };

  // Mobile backup handler: saves dated JSON to mobile folder
  const handleBackupNow = async () => {
    try {
      const filename = await downloadMobileBackup(tasks);
      showToast(`Backup saved to mobile (${filename}) ✅`);
    } catch {
      showToast('Backup cancelled or could not save file.');
    }
  };

  // Task actions
  const handleToggleDone = (id: string) => {
    const prevTasks = [...tasks];
    const next = tasks.map((t) => {
      if (t.id === id) {
        const done = !t.done;
        return {
          ...t,
          done,
          doneAt: done ? Date.now() : null,
        };
      }
      return t;
    });

    const isNowDone = next.find((t) => t.id === id)?.done;
    updateTasks(
      next,
      isNowDone ? 'Nice work! 🎉' : 'Marked incomplete',
      () => updateTasks(prevTasks, 'Restored previous state')
    );
  };

  const handleToggleStar = (id: string) => {
    const next = tasks.map((t) => (t.id === id ? { ...t, star: !t.star } : t));
    updateTasks(next);
  };

  const handleSnooze = (id: string) => {
    const prev = [...tasks];
    const next = tasks.map((t) => {
      if (t.id === id) {
        const d = t.due ? new Date(t.due) : new Date();
        d.setDate(d.getDate() + 1);
        return { ...t, due: toLocalDatetime(d) };
      }
      return t;
    });
    updateTasks(next, 'Pushed deadline by 1 day ⏰', () => updateTasks(prev, 'Undone snooze'));
  };

  const handleDelete = (id: string) => {
    const prev = [...tasks];
    const next = tasks.filter((t) => t.id !== id);
    updateTasks(next, 'Task deleted 🗑️', () => updateTasks(prev, 'Task restored'));
  };

  const handleAddNewTask = (newTaskData: Omit<Task, 'id' | 'done'>) => {
    const newTask: Task = {
      ...newTaskData,
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      done: false,
    };
    const next = [newTask, ...tasks];
    updateTasks(next, 'Saved it ✨');
  };

  const handleAddInstallments = (installments: InstallmentRow[], totalAmount?: number) => {
    let addedCount = 0;
    const next = [...tasks];
    installments.forEach((row, i) => {
      const exists = next.some(
        (t) => t.type === 'f' && Number(t.amount) === row.amount && (t.due || '').slice(0, 10) === row.due
      );
      if (!exists) {
        next.push({
          id: 'fee' + Date.now().toString(36) + i,
          title: `Fee installment ${row.no || i + 1} of ${installments.length}`,
          course: '',
          type: 'f',
          amount: row.amount,
          due: row.due ? `${row.due}T23:59` : '',
          note:
            addedCount === 0 && totalAmount
              ? `Total voucher: Rs ${totalAmount.toLocaleString()} in ${installments.length} installments`
              : '',
          star: i < 2,
          done: false,
        });
        addedCount++;
      }
    });

    updateTasks(next, addedCount > 0 ? `Added ${addedCount} installments ✅` : 'Nothing new to add');
    setFilter('f');
  };

  const handleRestoreSnapshot = (dateKey: string) => {
    const backups = getAllBackups();
    const snapshot = backups[dateKey];
    if (!snapshot) return;

    backups['before-restore'] = tasks;
    try {
      localStorage.setItem('uni-backups-v1', JSON.stringify(backups));
    } catch {}

    updateTasks(snapshot, 'Restored. Your previous list is kept as Before last restore.');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        const importedTasks = Array.isArray(parsed) ? parsed : parsed.tasks;
        if (!Array.isArray(importedTasks)) throw new Error('Invalid format');

        const validTasks: Task[] = importedTasks
          .filter((t: any) => t && typeof t.title === 'string')
          .map((t: any, idx: number) => ({
            ...t,
            id: t.id || `r${Date.now().toString(36)}${idx}`,
          }));

        const backups = getAllBackups();
        backups['before-restore'] = tasks;
        try {
          localStorage.setItem('uni-backups-v1', JSON.stringify(backups));
        } catch {}

        updateTasks(validTasks, `Restored ${validTasks.length} tasks ✅`);
      } catch {
        showToast('That file is not a valid backup');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Calculations
  const pendingTasks = useMemo(() => tasks.filter((t) => !t.done), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((t) => t.done), [tasks]);
  const completionPercentage = tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  const overdueCount = useMemo(() => pendingTasks.filter((t) => getTaskGroup(t) === 'over').length, [pendingTasks]);
  const dueTodayCount = useMemo(
    () => pendingTasks.filter((t) => getTaskGroup(t) === 'today' || getTaskGroup(t) === 'over').length,
    [pendingTasks]
  );
  const streakDays = useMemo(() => calculateStreak(tasks), [tasks]);

  const pendingFeeTotal = useMemo(
    () => pendingTasks.reduce((sum, t) => sum + (t.type === 'f' ? Number(t.amount || 0) : 0), 0),
    [pendingTasks]
  );

  const urgentTasks = useMemo(() => {
    return pendingTasks
      .filter((t) => {
        if (!t.due) return false;
        const diff = new Date(t.due).getTime() - currentTime;
        return diff > 0 && diff < 864e5;
      })
      .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
  }, [pendingTasks, currentTime]);

  const nextUpTask = useMemo(() => {
    const sortedDated = pendingTasks
      .filter((t) => t.due)
      .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
    return sortedDated[0] || null;
  }, [pendingTasks]);

  const getFilterCount = (f: FilterKey) => {
    if (f === 'all') return pendingTasks.length;
    if (f === 'done') return completedTasks.length;
    if (f === 'today') return dueTodayCount;
    return pendingTasks.filter((t) => t.type === f).length;
  };

  const feeStats = useMemo(() => {
    const feeTasks = tasks.filter((t) => t.type === 'f');
    let total = 0;
    let paid = 0;
    feeTasks.forEach((t) => {
      const amt = Number(t.amount || 0);
      total += amt;
      if (t.done) paid += amt;
    });
    return {
      hasFees: feeTasks.length > 0,
      remaining: total - paid,
      paid,
      total,
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tasks.filter((t) => {
      if (filter === 'done') {
        if (!t.done) return false;
      } else if (filter === 'today') {
        const grp = getTaskGroup(t);
        const isUrgent = !!t.due && new Date(t.due).getTime() - currentTime < 864e5;
        if (t.done || !(grp === 'today' || grp === 'over' || isUrgent)) return false;
      } else if (filter !== 'all') {
        if (t.type !== filter) return false;
      }

      if (!query) return true;
      const haystack = `${t.title} ${t.course || ''} ${t.label || ''} ${t.note || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [tasks, filter, searchQuery, currentTime]);

  const existingCourses = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.course) set.add(t.course);
    });
    return Array.from(set);
  }, [tasks]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning ☀️';
    if (h < 18) return 'Good afternoon 🌤️';
    return 'Good evening 🌙';
  }, []);

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
  }, []);

  const groupOrder: { key: string; label: string }[] = [
    { key: 'over', label: '⚠️ Overdue' },
    { key: 'today', label: '🔥 Today' },
    { key: 'tom', label: '⏰ Tomorrow' },
    { key: 'week', label: '📅 This week' },
    { key: 'later', label: '🗓️ Later' },
    { key: 'none', label: '📭 No date' },
    { key: 'done', label: '✅ Completed' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-200">
      <main className="max-w-[640px] mx-auto px-3.5 pt-3.5 pb-24">
        <PWAInstallBanner
          forceOpenIOSModal={showIOSInstallGuide}
          onCloseIOSModal={() => setShowIOSInstallGuide(false)}
        />

        {/* HEADER */}
        <header className="relative bg-linear-to-br from-[#6a4cff] via-[#ec5fa0] to-[#ff8a3d] text-white rounded-3xl p-4.5 shadow-xl shadow-purple-900/20">
          <div className="relative text-center pt-1 px-8 pb-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
              }}
              aria-label="Menu"
              className="absolute top-0 right-0 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-xs flex items-center justify-center text-lg font-bold transition active:scale-90"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Exact Original Dropdown Menu */}
            {isMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-11 right-0 min-w-52 bg-[var(--card)] text-[var(--text)] border border-[var(--line)] rounded-2xl p-1.5 shadow-2xl z-40 text-left text-xs font-semibold"
              >
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setFeeModalMode('scan');
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[var(--bg)] transition text-left"
                >
                  <span>📸</span>
                  <span>Add fees from screenshot</span>
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setFeeModalMode('manual');
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[var(--bg)] transition text-left"
                >
                  <span>✍️</span>
                  <span>Add fees manually</span>
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleBackupNow();
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[var(--bg)] transition text-left"
                >
                  <span>💾</span>
                  <span>Backup now</span>
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[var(--bg)] transition text-left"
                >
                  <span>📂</span>
                  <span>Restore from file</span>
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setShowIOSInstallGuide(true);
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[var(--bg)] transition text-left"
                >
                  <span>📲</span>
                  <span>Install App Guide</span>
                </button>
                <div className="my-1 border-t border-[var(--line)]" />
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    toggleTheme();
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[var(--bg)] transition text-left"
                >
                  <span>🌓</span>
                  <span>Light / Dark</span>
                </button>
              </div>
            )}

            {/* Hidden File Input for Restore */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportFile}
              className="hidden"
            />

            {/* Logo */}
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-white/22 flex items-center justify-center text-2xl shadow-inner border-2 border-white/35">
              🎓
            </div>

            {/* Title */}
            <h1 className="m-0 text-2xl font-extrabold tracking-tight drop-shadow-xs">
              <em className="not-italic block text-[11px] font-bold tracking-widest uppercase opacity-90 mb-0.5">
                Naeem’s
              </em>
              Uni Deadlines
            </h1>
            <div className="w-11 h-1 rounded-full bg-white/70 mx-auto my-2" />
            <div className="text-xs opacity-95">
              <span>{greeting}</span> · <span>{todayFormatted}</span>
            </div>
          </div>

          {/* Hero Statistics Section */}
          <div className="flex items-center gap-3.5 mt-3.5">
            <div className="relative w-18 h-18 shrink-0">
              <svg viewBox="0 0 76 76" className="w-18 h-18 -rotate-90">
                <circle cx="38" cy="38" r="31" fill="none" strokeWidth="8" stroke="rgba(255,255,255,0.25)" />
                <circle
                  cx="38"
                  cy="38"
                  r="31"
                  fill="none"
                  strokeWidth="8"
                  stroke="#ffffff"
                  strokeLinecap="round"
                  strokeDasharray="194.8"
                  strokeDashoffset={194.8 * (1 - completionPercentage / 100)}
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <b className="absolute inset-0 flex items-center justify-center text-sm font-extrabold">
                {completionPercentage}%
              </b>
            </div>

            {/* Status Pills */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setFilter('all')}
                className="bg-white/22 hover:bg-white/30 backdrop-blur-xs rounded-full px-2.5 py-1 text-xs font-bold transition active:scale-95"
              >
                📋 {pendingTasks.length} pending
              </button>
              <button
                onClick={() => setFilter('today')}
                className="bg-white/22 hover:bg-white/30 backdrop-blur-xs rounded-full px-2.5 py-1 text-xs font-bold transition active:scale-95"
              >
                {overdueCount > 0 ? `⚠️ ${overdueCount} overdue` : `🔥 ${dueTodayCount} due today`}
              </button>
              <button
                onClick={() => setFilter('done')}
                className="bg-white/22 hover:bg-white/30 backdrop-blur-xs rounded-full px-2.5 py-1 text-xs font-bold transition active:scale-95"
              >
                🏆 {completedTasks.length} done
              </button>
              {streakDays > 0 && (
                <span className="bg-white/22 rounded-full px-2.5 py-1 text-xs font-bold">
                  🔥 {streakDays}-day streak
                </span>
              )}
              {pendingFeeTotal > 0 && (
                <button
                  onClick={() => setFilter('f')}
                  className="bg-white/22 hover:bg-white/30 rounded-full px-2.5 py-1 text-xs font-bold"
                >
                  💰 Rs {pendingFeeTotal.toLocaleString()} fees left
                </button>
              )}
            </div>
          </div>

          {/* Urgent Alert Banner (< 24 hours) */}
          {urgentTasks.length > 0 ? (
            <div
              onClick={() => setFilter('today')}
              className="mt-3.5 rounded-2xl p-3 text-white alert-urgent cursor-pointer shadow-lg"
            >
              <small className="font-extrabold tracking-wider text-[11px] uppercase block">
                ⏰ DUE WITHIN 24 HOURS · {urgentTasks.length}
              </small>
              <div className="space-y-1 mt-1.5 text-xs font-bold">
                {urgentTasks.slice(0, 3).map((t) => {
                  const msLeft = new Date(t.due).getTime() - currentTime;
                  return (
                    <div key={t.id} className="flex justify-between items-center gap-2">
                      <span className="truncate">{t.title}</span>
                      <span className="shrink-0 font-mono text-[11px] tabular-nums">
                        {formatRemaining(msLeft, false)}
                      </span>
                    </div>
                  );
                })}
                {urgentTasks.length > 3 && (
                  <div className="text-[11px] opacity-90">+ {urgentTasks.length - 3} more</div>
                )}
              </div>
            </div>
          ) : (
            /* Next Up Box */
            <div className="mt-3.5 bg-black/20 rounded-2xl p-3">
              <small className="opacity-85 tracking-widest text-[10px] font-bold block">
                NEXT UP
              </small>
              {nextUpTask ? (
                <>
                  <div className="font-bold text-sm mt-0.5 break-words">
                    {nextUpTask.title}
                    {nextUpTask.course && ` · ${nextUpTask.course}`}
                  </div>
                  <div className="text-xl font-extrabold font-mono tabular-nums mt-0.5 text-white/95">
                    {formatRemaining(new Date(nextUpTask.due).getTime() - currentTime, true)}
                  </div>
                </>
              ) : (
                <div className="font-bold text-sm mt-0.5">
                  Nothing urgent. Enjoy the calm 🎉
                </div>
              )}
            </div>
          )}
        </header>

        {/* Motivational Quote */}
        <p className="text-center text-xs text-[var(--muted)] my-3 italic px-2">
          "{quote}"
        </p>

        {/* Add Task Panel */}
        {showAddPanel && (
          <div ref={addPanelRef}>
            <AddTaskPanel
              existingCourses={existingCourses}
              defaultType={filter !== 'all' && filter !== 'done' && filter !== 'today' ? (filter as TaskType) : 'a'}
              onAddTask={handleAddNewTask}
              onClose={() => setShowAddPanel(false)}
            />
          </div>
        )}

        {/* Filter Chips Bar */}
        <div className="sticky top-[env(safe-area-inset-top,0px)] z-20 bg-[var(--bg)]/90 backdrop-blur-md py-2 my-1">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {[
              { key: 'all', label: 'All' },
              { key: 'today', label: '🔥 Today' },
              { key: 'f', label: '💰 Fees' },
              { key: 'done', label: '✅ Done' },
              { key: 'a', label: '📝 Assignment' },
              { key: 'q', label: '⏱️ Quiz' },
              { key: 'g', label: '💬 GDB' },
              { key: 'c', label: '✏️ Custom' },
            ].map((item) => {
              const isSelected = filter === item.key;
              const count = getFilterCount(item.key as FilterKey);
              return (
                <button
                  key={item.key}
                  onClick={() => setFilter(item.key as FilterKey)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 active:scale-95 ${
                    isSelected
                      ? 'bg-[var(--accent)] text-white shadow-xs'
                      : 'bg-[var(--card)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className={`text-[10px] ${isSelected ? 'opacity-90' : 'opacity-70'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="relative mt-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search tasks or courses"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--card)] text-[var(--text)] text-xs focus:outline-2 focus:outline-[var(--accent)]"
            />
          </div>
        </div>

        {/* Fees Summary Card (when Fees filter is active) */}
        {filter === 'f' && (
          <div className="my-3 space-y-2">
            {feeStats.hasFees && (
              <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-3 flex justify-around text-center shadow-xs">
                <div>
                  <b className="block text-sm font-extrabold text-amber-600 dark:text-amber-400">
                    Rs {feeStats.remaining.toLocaleString()}
                  </b>
                  <span className="text-[11px] text-[var(--muted)]">Remaining</span>
                </div>
                <div className="w-px bg-[var(--line)]" />
                <div>
                  <b className="block text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                    Rs {feeStats.paid.toLocaleString()}
                  </b>
                  <span className="text-[11px] text-[var(--muted)]">Paid</span>
                </div>
                <div className="w-px bg-[var(--line)]" />
                <div>
                  <b className="block text-sm font-extrabold text-[var(--text)]">
                    Rs {feeStats.total.toLocaleString()}
                  </b>
                  <span className="text-[11px] text-[var(--muted)]">Total</span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setFeeModalMode('scan')}
                className="flex-1 py-3 px-3 rounded-xl bg-[var(--accent)] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition"
              >
                <span>📸</span> From screenshot
              </button>
              <button
                onClick={() => setFeeModalMode('manual')}
                className="flex-1 py-3 px-3 rounded-xl bg-[var(--accent)] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition"
              >
                <span>✍️</span> Add manually
              </button>
            </div>
          </div>
        )}

        {/* Tasks List Grouped */}
        <div className="mt-2 space-y-3">
          {groupOrder.map((group) => {
            const groupItems = filteredTasks.filter((t) => getTaskGroup(t) === group.key);
            if (groupItems.length === 0) return null;

            groupItems.sort((a, b) => {
              if (b.star !== a.star) return b.star ? 1 : -1;
              const aTime = a.due ? new Date(a.due).getTime() : Infinity;
              const bTime = b.due ? new Date(b.due).getTime() : Infinity;
              return aTime - bTime;
            });

            if (group.key === 'done') {
              return (
                <div key={group.key} className="pt-2">
                  <div className="flex justify-between items-center px-1 mb-1.5 text-xs font-bold text-[var(--muted)]">
                    <span>{group.label}</span>
                    <button
                      onClick={() => setShowDone(!showDone)}
                      className="flex items-center gap-1 text-[var(--accent)] hover:underline"
                    >
                      <span>
                        {groupItems.length} · {showDone ? 'Hide' : 'Show'}
                      </span>
                      {showDone ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {(showDone || filter === 'done' || filter === 'f') && (
                    <div className="space-y-2">
                      {groupItems.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onToggleDone={handleToggleDone}
                          onToggleStar={handleToggleStar}
                          onSnooze={handleSnooze}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div key={group.key}>
                <div className="flex justify-between items-center px-1 mb-1.5 text-xs font-bold text-[var(--text)]">
                  <span>{group.label}</span>
                  <span className="text-[11px] text-[var(--muted)]">{groupItems.length}</span>
                </div>
                <div className="space-y-2">
                  {groupItems.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggleDone={handleToggleDone}
                      onToggleStar={handleToggleStar}
                      onSnooze={handleSnooze}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {filteredTasks.length === 0 && (
            <div className="text-center py-12 text-[var(--muted)] space-y-2">
              <span className="text-4xl block">🎉</span>
              <p className="text-sm font-semibold">Nothing here yet.</p>
              <p className="text-xs">Add your first task above!</p>
            </div>
          )}
        </div>

        {/* Exact Backup & Restore Details Component from Original HTML */}
        <details className="mt-8 bg-[var(--card)] border border-[var(--line)] rounded-2xl p-3.5 text-xs shadow-xs">
          <summary className="font-bold cursor-pointer select-none text-[var(--text)] text-sm">
            💾 Backup &amp; restore
          </summary>
          <div className="mt-3 space-y-3 pt-2 border-t border-[var(--line)]">
            <p className="text-[var(--muted)] leading-relaxed">
              Backup saves a dated <code>.json</code> file to your phone (usually the Downloads folder). Restore lets you pick that file again whenever you need it. The 💾 and 📂 buttons at the top do the same.
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleBackupNow}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[var(--accent)] text-white font-bold flex items-center justify-center gap-1.5 shadow-xs hover:opacity-90 active:scale-98 transition text-xs"
              >
                ⬇️ Backup now
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[var(--accent)] text-white font-bold flex items-center justify-center gap-1.5 shadow-xs hover:opacity-90 active:scale-98 transition text-xs"
              >
                ⬆️ Restore from file
              </button>
            </div>

            {/* More options nested details */}
            <details className="mt-3 pt-1 border-t border-[var(--line)]">
              <summary className="font-bold text-[var(--muted)] cursor-pointer py-1">
                More options
              </summary>
              <div className="mt-2 space-y-2">
                <textarea
                  rows={4}
                  value={backupText || JSON.stringify(tasks, null, 2)}
                  onChange={(e) => setBackupText(e.target.value)}
                  spellCheck={false}
                  className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] font-mono text-[10px]"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(tasks, null, 2));
                      showToast('Copied 📋');
                    }}
                    className="flex-1 py-2 rounded-xl bg-[var(--accent)] text-white font-bold text-xs"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(backupText);
                        const arr = Array.isArray(parsed) ? parsed : parsed.tasks;
                        if (!Array.isArray(arr)) throw new Error();
                        updateTasks(arr, 'Restored ✅');
                      } catch {
                        showToast('That text is not valid backup data');
                      }
                    }}
                    className="flex-1 py-2 rounded-xl bg-[var(--accent)] text-white font-bold text-xs"
                  >
                    Restore from text
                  </button>
                </div>

                <p className="text-[var(--muted)] pt-2 font-medium">
                  Automatic safety copies kept inside this browser (one per day, last 30 days):
                </p>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {Object.keys(backupsList)
                    .sort()
                    .reverse()
                    .map((k) => {
                      const snapTasks = backupsList[k] || [];
                      const pendingCount = snapTasks.filter((t) => !t.done).length;
                      const label =
                        k === 'before-restore'
                          ? '↩️ Before last restore'
                          : new Date(`${k}T12:00`).toLocaleDateString([], {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            });

                      return (
                        <div
                          key={k}
                          className="flex justify-between items-center p-2 rounded-xl bg-[var(--bg)] border border-[var(--line)]"
                        >
                          <div>
                            <b className="block text-[11px] font-bold text-[var(--text)]">{label}</b>
                            <span className="text-[10px] text-[var(--muted)]">
                              {snapTasks.length} tasks · {pendingCount} pending
                            </span>
                          </div>
                          <button
                            onClick={() => handleRestoreSnapshot(k)}
                            className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white font-bold text-[10px] hover:opacity-90"
                          >
                            Restore
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            </details>
          </div>
        </details>
      </main>

      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => {
          setShowAddPanel(true);
          setTimeout(() => {
            addPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 50);
        }}
        aria-label="Add task"
        className="fixed right-4.5 bottom-[calc(18px+env(safe-area-inset-bottom,0px))] w-14 h-14 rounded-full bg-linear-to-br from-[#7c5cff] to-[#ec5fa0] text-white flex items-center justify-center shadow-xl shadow-purple-600/40 text-3xl z-30 active:scale-90 hover:scale-105 transition"
      >
        +
      </button>

      {/* Floating Toast Notification with Undo */}
      {toastInfo && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(18px+env(safe-area-inset-bottom,0px))] z-50 bg-[#2a2540] text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 text-xs border border-white/10 max-w-[92%]">
          <span>{toastInfo.message}</span>
          {toastInfo.undoAction && (
            <button
              onClick={() => {
                toastInfo.undoAction?.();
                setToastInfo(null);
              }}
              className="text-[#ffd54a] font-bold hover:underline"
            >
              Undo
            </button>
          )}
        </div>
      )}

      {/* Fee Scanner & Manual Installment Modal */}
      {feeModalMode && (
        <FeeScannerModal
          initialMode={feeModalMode}
          existingTasks={tasks}
          onAddInstallments={handleAddInstallments}
          onClose={() => setFeeModalMode(null)}
        />
      )}
    </div>
  );
}
