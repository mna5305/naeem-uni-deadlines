import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Task, TaskType, FilterKey, InstallmentRow } from './types';
import {
  loadTasks,
  saveTasks,
  getTaskGroup,
  calculateStreak,
  formatRemaining,
  exportBackupJSON,
  getAllBackups,
  toLocalDatetime,
} from './utils/storage';
import { TaskCard } from './components/TaskCard';
import { AddTaskPanel } from './components/AddTaskPanel';
import { FeeScannerModal } from './components/FeeScannerModal';
import { GitHubSyncModal } from './components/GitHubSyncModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { OfflineBadge } from './components/OfflineBadge';
import {
  Plus,
  Search,
  MoreVertical,
  Download,
  Upload,
  Cloud,
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
  'Consistent effort is the key to top grades in university.',
];

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [filter, setFilter] = useState<FilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDone, setShowDone] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [feeModalMode, setFeeModalMode] = useState<'scan' | 'manual' | null>(null);
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [showIOSInstallGuide, setShowIOSInstallGuide] = useState(false);
  const [quote, setQuote] = useState(MOTIVATIONAL_QUOTES[0]);
  const [isDark, setIsDark] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [toastInfo, setToastInfo] = useState<{ message: string; undoAction?: () => void } | null>(null);
  const [backupText, setBackupText] = useState('');
  const [backupsList, setBackupsList] = useState<Record<string, Task[]>>({});

  const toastTimerRef = useRef<any>(null);
  const addPanelRef = useRef<HTMLDivElement>(null);

  // Initialize random quote & theme & backups
  useEffect(() => {
    const q = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    setQuote(q);

    // Initial theme detection
    const savedTheme = document.documentElement.dataset.theme;
    if (savedTheme) {
      setIsDark(savedTheme === 'dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(prefersDark);
    }

    setBackupsList(getAllBackups());
  }, []);

  // Sync dark theme attribute on root
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

  // Save tasks and refresh backups state on change
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
    updateTasks(next, 'Saved deadline ✨');
  };

  // Add multiple fee installments from scanner/manual
  const handleAddInstallments = (installments: InstallmentRow[], totalAmount?: number) => {
    let addedCount = 0;
    const next = [...tasks];
    installments.forEach((row, i) => {
      // Check duplicate
      const exists = next.some(
        (t) => t.type === 'f' && Number(t.amount) === row.amount && (t.due || '').slice(0, 10) === row.due
      );
      if (!exists) {
        next.push({
          id: 'fee_' + Date.now().toString(36) + '_' + i,
          title: `Fee installment ${row.no || i + 1} of ${installments.length}`,
          course: 'VU Accounts',
          type: 'f',
          amount: row.amount,
          due: row.due ? `${row.due}T23:59` : '',
          note:
            addedCount === 0 && totalAmount
              ? `Voucher total: Rs ${totalAmount.toLocaleString()} in ${installments.length} installments`
              : '',
          star: i < 2,
          done: false,
        });
        addedCount++;
      }
    });

    updateTasks(next, addedCount > 0 ? `Added ${addedCount} installments ✅` : 'No new installments to add');
    setFilter('f');
  };

  // Restore snapshot from 30-day backup history
  const handleRestoreSnapshot = (dateKey: string) => {
    const backups = getAllBackups();
    const snapshot = backups[dateKey];
    if (!snapshot) return;

    backups['before-restore'] = tasks;
    try {
      localStorage.setItem('uni-backups-v1', JSON.stringify(backups));
    } catch {}

    updateTasks(snapshot, 'Restored snapshot! Previous list kept as "Before last restore"');
  };

  // File import for backup
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
            id: t.id || `imp_${Date.now()}_${idx}`,
          }));

        const backups = getAllBackups();
        backups['before-restore'] = tasks;
        try {
          localStorage.setItem('uni-backups-v1', JSON.stringify(backups));
        } catch {}

        updateTasks(validTasks, `Restored ${validTasks.length} tasks from file! ✅`);
      } catch {
        showToast('That file is not a valid backup');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Calculated statistics
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

  // Urgent tasks (< 24 hours left and not overdue)
  const urgentTasks = useMemo(() => {
    return pendingTasks
      .filter((t) => {
        if (!t.due) return false;
        const diff = new Date(t.due).getTime() - currentTime;
        return diff > 0 && diff < 864e5;
      })
      .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
  }, [pendingTasks, currentTime]);

  // Next up task
  const nextUpTask = useMemo(() => {
    const sortedDated = pendingTasks
      .filter((t) => t.due)
      .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
    return sortedDated[0] || null;
  }, [pendingTasks]);

  // Filter count helper
  const getFilterCount = (f: FilterKey) => {
    if (f === 'all') return pendingTasks.length;
    if (f === 'done') return completedTasks.length;
    if (f === 'today') return dueTodayCount;
    return pendingTasks.filter((t) => t.type === f).length;
  };

  // Fee summary stats
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

  // Filtered and grouped tasks
  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tasks.filter((t) => {
      // Type / Status filter
      if (filter === 'done') {
        if (!t.done) return false;
      } else if (filter === 'today') {
        const grp = getTaskGroup(t);
        const isUrgent = !!t.due && new Date(t.due).getTime() - currentTime < 864e5;
        if (t.done || !(grp === 'today' || grp === 'over' || isUrgent)) return false;
      } else if (filter !== 'all') {
        if (t.type !== filter) return false;
      }

      // Search query filter
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

  // Greeting based on hour
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning ☀️';
    if (h < 18) return 'Good afternoon 🌤️';
    return 'Good evening 🌙';
  }, []);

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
  }, []);

  // Groups definitions
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
      <OfflineBadge />

      <main className="max-w-[640px] mx-auto px-3.5 pt-3.5 pb-24">
        <PWAInstallBanner
          forceOpenIOSModal={showIOSInstallGuide}
          onCloseIOSModal={() => setShowIOSInstallGuide(false)}
        />

        {/* HEADER */}
        <header className="relative bg-linear-to-br from-[#6a4cff] via-[#ec5fa0] to-[#ff8a3d] text-white rounded-3xl p-4.5 shadow-xl shadow-purple-900/20">
          {/* Top Bar with 3-dot Menu */}
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

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-11 right-0 min-w-56 bg-[var(--card)] text-[var(--text)] border border-[var(--line)] rounded-2xl p-1.5 shadow-2xl z-40 text-left text-xs font-semibold"
              >
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setFeeModalMode('scan');
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[var(--bg)] transition text-left"
                >
                  <Camera className="w-4 h-4 text-purple-500" />
                  <span>Add fees from screenshot</span>
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setFeeModalMode('manual');
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[var(--bg)] transition text-left"
                >
                  <Edit3 className="w-4 h-4 text-emerald-500" />
                  <span>Add fees manually</span>
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setShowGitHubModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[var(--bg)] transition text-left"
                >
                  <Cloud className="w-4 h-4 text-blue-500" />
                  <span>GitHub Sync &amp; Pages</span>
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    exportBackupJSON(tasks);
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[var(--bg)] transition text-left"
                >
                  <Download className="w-4 h-4 text-amber-500" />
                  <span>Backup to JSON file</span>
                </button>
                <label className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[var(--bg)] transition text-left cursor-pointer">
                  <Upload className="w-4 h-4 text-pink-500" />
                  <span>Restore from file</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setShowIOSInstallGuide(true);
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[var(--bg)] transition text-left"
                >
                  <Smartphone className="w-4 h-4 text-purple-500" />
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
                  {isDark ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-indigo-400" />
                  )}
                  <span>Toggle {isDark ? 'Light' : 'Dark'} Mode</span>
                </button>
              </div>
            )}

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
            {/* Circular Progress Ring */}
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
              placeholder="🔍 Search tasks, courses, or notes..."
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
                className="flex-1 py-2.5 px-3 rounded-xl bg-[var(--accent)] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition"
              >
                <Camera className="w-3.5 h-3.5" /> 📸 From screenshot
              </button>
              <button
                onClick={() => setFeeModalMode('manual')}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[var(--card)] border border-[var(--line)] text-[var(--text)] text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs active:scale-98 transition"
              >
                <Edit3 className="w-3.5 h-3.5" /> ✍️ Add manually
              </button>
            </div>
          </div>
        )}

        {/* Tasks List Grouped */}
        <div className="mt-2 space-y-3">
          {groupOrder.map((group) => {
            const groupItems = filteredTasks.filter((t) => getTaskGroup(t) === group.key);
            if (groupItems.length === 0) return null;

            // Sort: Starred first, then by due date ascending
            groupItems.sort((a, b) => {
              if (b.star !== a.star) return b.star ? 1 : -1;
              const aTime = a.due ? new Date(a.due).getTime() : Infinity;
              const bTime = b.due ? new Date(b.due).getTime() : Infinity;
              return aTime - bTime;
            });

            // Completed tasks collapsible
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
              <p className="text-sm font-semibold">Nothing here right now!</p>
              <p className="text-xs">Add your first deadline or task using the + button below.</p>
            </div>
          )}
        </div>

        {/* Backup & Restore Accordion */}
        <details className="mt-8 bg-[var(--card)] border border-[var(--line)] rounded-2xl p-3.5 text-xs shadow-xs">
          <summary className="font-bold cursor-pointer select-none text-[var(--text)]">
            💾 Backup, Restore &amp; History
          </summary>
          <div className="mt-3 space-y-3 pt-2 border-t border-[var(--line)]">
            <p className="text-[var(--muted)]">
              Backup creates a dated <code>.json</code> file on your phone or computer. Restore lets you reload your full task history anytime.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => exportBackupJSON(tasks)}
                className="flex-1 py-2 px-3 rounded-xl bg-[var(--accent)] text-white font-bold flex items-center justify-center gap-1.5 shadow-xs hover:opacity-90 active:scale-98 transition"
              >
                <Download className="w-3.5 h-3.5" /> ⬇️ Backup now
              </button>

              <label className="flex-1 py-2 px-3 rounded-xl bg-[var(--bg)] border border-[var(--line)] font-bold text-[var(--text)] flex items-center justify-center gap-1.5 cursor-pointer shadow-xs hover:opacity-90 active:scale-98 transition">
                <Upload className="w-3.5 h-3.5" /> ⬆️ Restore file
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>

            {/* Direct JSON text backup/restore */}
            <details className="pt-1">
              <summary className="font-semibold text-[var(--muted)] cursor-pointer">
                Text copy &amp; paste options
              </summary>
              <div className="mt-2 space-y-2">
                <textarea
                  rows={3}
                  value={backupText || JSON.stringify(tasks, null, 2)}
                  onChange={(e) => setBackupText(e.target.value)}
                  className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] font-mono text-[10px]"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(tasks, null, 2));
                      showToast('Copied JSON to clipboard 📋');
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--line)] font-semibold text-[11px]"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(backupText);
                        const arr = Array.isArray(parsed) ? parsed : parsed.tasks;
                        if (!Array.isArray(arr)) throw new Error();
                        updateTasks(arr, 'Restored from text ✅');
                      } catch {
                        showToast('That text is not valid backup data');
                      }
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-[var(--accent)] text-white font-semibold text-[11px]"
                  >
                    Restore from text
                  </button>
                </div>
              </div>
            </details>

            {/* Daily Safety Snapshots */}
            <div className="pt-2">
              <p className="font-bold text-[var(--text)] mb-1">
                Daily Automatic Safety Copies (last 30 days):
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
                          className="px-2.5 py-1 rounded-lg bg-[var(--accent)] text-white font-bold text-[10px] hover:opacity-90"
                        >
                          Restore
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
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
        aria-label="Add deadline"
        className="fixed right-4.5 bottom-[calc(20px+env(safe-area-inset-bottom,0px))] w-14 h-14 rounded-full bg-linear-to-br from-[#7c5cff] to-[#ec5fa0] text-white flex items-center justify-center shadow-xl shadow-purple-600/40 text-2xl z-30 active:scale-90 hover:scale-105 transition"
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </button>

      {/* Toast Notification with Undo */}
      {toastInfo && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(20px+env(safe-area-inset-bottom,0px))] z-50 bg-[#2a2540] text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 text-xs border border-white/10 animate-fade-in">
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

      {/* Fee Scanner Modal */}
      {feeModalMode && (
        <FeeScannerModal
          initialMode={feeModalMode}
          existingTasks={tasks}
          onAddInstallments={handleAddInstallments}
          onClose={() => setFeeModalMode(null)}
        />
      )}

      {/* GitHub Sync Modal */}
      {showGitHubModal && (
        <GitHubSyncModal
          tasks={tasks}
          onTasksUpdated={(newTasks, msg) => {
            updateTasks(newTasks, msg);
          }}
          onClose={() => setShowGitHubModal(false)}
        />
      )}
    </div>
  );
}
