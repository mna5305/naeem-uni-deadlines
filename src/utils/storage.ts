import { Task, GitHubSyncConfig, BackupData } from '../types';

export const KEY = 'uni-tracker-v1';
export const BK = 'uni-backups-v1';
export const GITHUB_SYNC_KEY = 'uni-github-sync-v1';

export function pad2(n: number): string {
  return n < 10 ? '0' + n : '' + n;
}

export function toLocalDatetime(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function startOfDay(timestamp: number | string | Date): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function stringToHue(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) % 360;
  }
  return h;
}

export function formatRemaining(ms: number, includeSeconds = false): string {
  const abs = Math.abs(ms);
  const d = Math.floor(abs / 864e5);
  const h = Math.floor((abs % 864e5) / 36e5);
  const m = Math.floor((abs % 36e5) / 6e4);
  const s = Math.floor((abs % 6e4) / 1e3);

  let txt = '';
  if (d > 0) {
    txt = `${d}d ${h}h ${m}m`;
  } else if (h > 0) {
    txt = `${h}h ${m}m${includeSeconds ? ` ${s}s` : ''}`;
  } else {
    txt = `${m}m${includeSeconds ? ` ${s}s` : ''}`;
  }

  return ms < 0 ? `Overdue by ${txt}` : `${txt} left`;
}

export function formatDateTime(isoOrLocal: string): string {
  const d = new Date(isoOrLocal);
  return d.toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getTaskGroup(t: Task): 'done' | 'over' | 'today' | 'tom' | 'week' | 'later' | 'none' {
  if (t.done) return 'done';
  if (!t.due) return 'none';
  const dueTime = new Date(t.due).getTime();
  if (dueTime < Date.now()) return 'over';
  const daysDiff = Math.round((startOfDay(dueTime) - startOfDay(Date.now())) / 864e5);
  if (daysDiff === 0) return 'today';
  if (daysDiff === 1) return 'tom';
  if (daysDiff <= 7) return 'week';
  return 'later';
}

export function calculateStreak(tasks: Task[]): number {
  const completedDays: Record<number, boolean> = {};
  tasks.forEach((t) => {
    if (t.doneAt) {
      completedDays[startOfDay(t.doneAt)] = true;
    }
  });

  let current = startOfDay(Date.now());
  let streakCount = 0;
  if (!completedDays[current]) {
    current -= 864e5; // check yesterday
  }

  while (completedDays[current]) {
    streakCount++;
    current -= 864e5;
  }

  return streakCount;
}

export function getAllBackups(): Record<string, Task[]> {
  try {
    const raw = localStorage.getItem(BK);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveSnapshot(tasks: Task[]) {
  try {
    const backups = getAllBackups();
    const dateKey = toLocalDatetime(new Date()).slice(0, 10);
    backups[dateKey] = tasks;

    // Keep last 30 snapshots + before-restore
    const keys = Object.keys(backups)
      .filter((k) => k !== 'before-restore')
      .sort()
      .reverse();

    if (keys.length > 30) {
      keys.slice(30).forEach((k) => delete backups[k]);
    }

    localStorage.setItem(BK, JSON.stringify(backups));
  } catch (e) {
    console.error('Failed to create local snapshot:', e);
  }
}

export function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((t: any) => ({
          ...t,
          type: t.type === 'o' ? 'c' : t.type || 'a',
          label: t.label || (t.type === 'c' ? 'Other' : ''),
          amount: t.type === 'f' ? Number(t.amount || 0) : undefined,
        }));
      }
    }
  } catch (e) {
    console.error('Error loading tasks from localStorage:', e);
  }

  // Seed initial fee installment voucher data if fresh
  const initialVoucher: Task[] = [
    {
      id: 'fee1',
      title: 'Fee installment 1 of 5',
      course: 'VU Accounts',
      type: 'f',
      amount: 6050,
      due: '2026-11-05T23:59',
      note: 'Total voucher: Rs 16,650 in 5 installments (First installment)',
      star: true,
      done: false,
    },
    {
      id: 'fee2',
      title: 'Fee installment 2 of 5',
      course: 'VU Accounts',
      type: 'f',
      amount: 2650,
      due: '2026-11-20T23:59',
      note: 'Installment 2',
      star: true,
      done: false,
    },
    {
      id: 'fee3',
      title: 'Fee installment 3 of 5',
      course: 'VU Accounts',
      type: 'f',
      amount: 2650,
      due: '2026-12-10T23:59',
      note: 'Installment 3',
      star: false,
      done: false,
    },
    {
      id: 'fee4',
      title: 'Fee installment 4 of 5',
      course: 'VU Accounts',
      type: 'f',
      amount: 2650,
      due: '2027-01-11T23:59',
      note: 'Installment 4',
      star: false,
      done: false,
    },
    {
      id: 'fee5',
      title: 'Fee installment 5 of 5',
      course: 'VU Accounts',
      type: 'f',
      amount: 2650,
      due: '2027-02-10T23:59',
      note: 'Final Installment 5',
      star: false,
      done: false,
    },
    {
      id: 'cs101-a1',
      title: 'CS101 Assignment No 1',
      course: 'CS101',
      type: 'a',
      due: '2026-11-08T23:59',
      note: 'MS Word / Flowchart submission on LMS',
      star: true,
      done: false,
    },
    {
      id: 'cs201-q1',
      title: 'CS201 Quiz No 1',
      course: 'CS201',
      type: 'q',
      due: '2026-11-12T23:59',
      note: 'C++ basic syntax and conditional loops',
      star: false,
      done: false,
    },
  ];

  try {
    localStorage.setItem(KEY, JSON.stringify(initialVoucher));
    saveSnapshot(initialVoucher);
  } catch {}

  return initialVoucher;
}

export function saveTasks(tasks: Task[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('Error saving tasks to localStorage:', e);
  }
  saveSnapshot(tasks);
}

export function exportBackupJSON(tasks: Task[]) {
  const d = new Date();
  const filename = `UniTracker-Backup-${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}_${pad2(d.getHours())}-${pad2(d.getMinutes())}.json`;
  const payload: BackupData = {
    app: 'uni-tracker',
    version: 1,
    savedAt: new Date().toISOString(),
    tasks,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// GitHub Gist Cloud Sync
export function loadGitHubConfig(): GitHubSyncConfig {
  try {
    const raw = localStorage.getItem(GITHUB_SYNC_KEY);
    return raw ? JSON.parse(raw) : { token: '', gistId: '' };
  } catch {
    return { token: '', gistId: '' };
  }
}

export function saveGitHubConfig(cfg: GitHubSyncConfig) {
  try {
    localStorage.setItem(GITHUB_SYNC_KEY, JSON.stringify(cfg));
  } catch {}
}

export async function syncToGitHubGist(tasks: Task[], token: string, gistId?: string): Promise<{ gistId: string; gistUrl: string }> {
  if (!token) throw new Error('GitHub Personal Access Token is required');

  const content = JSON.stringify(
    {
      app: 'uni-tracker',
      version: 1,
      updatedAt: new Date().toISOString(),
      tasksCount: tasks.length,
      tasks,
    },
    null,
    2
  );

  const payload = {
    description: `Naeem's Uni Deadlines & Fees Cloud Backup - ${new Date().toLocaleDateString()}`,
    public: false,
    files: {
      'uni-deadlines-backup.json': { content },
    },
  };

  const isUpdate = !!gistId;
  const url = isUpdate ? `https://api.github.com/gists/${gistId}` : 'https://api.github.com/gists';
  const method = isUpdate ? 'PATCH' : 'POST';

  const res = await fetch(url, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `GitHub Gist error (${res.status})`);
  }

  const data = await res.json();
  return {
    gistId: data.id,
    gistUrl: data.html_url,
  };
}

export async function pullFromGitHubGist(token: string, gistId: string): Promise<Task[]> {
  if (!gistId) throw new Error('Gist ID is required to pull data');

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`https://api.github.com/gists/${gistId}`, { headers });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to fetch Gist (${res.status})`);
  }

  const data = await res.json();
  const file = data.files?.['uni-deadlines-backup.json'] || Object.values(data.files || {})[0] as any;
  if (!file || !file.content) throw new Error('No valid deadline file found in this Gist');

  const parsed = JSON.parse(file.content);
  const tasks = Array.isArray(parsed) ? parsed : parsed.tasks;
  if (!Array.isArray(tasks)) throw new Error('Gist contents do not match task format');

  return tasks;
}
