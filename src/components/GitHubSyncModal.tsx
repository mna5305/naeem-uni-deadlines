import React, { useState } from 'react';
import { Task, GitHubSyncConfig } from '../types';
import {
  loadGitHubConfig,
  saveGitHubConfig,
  syncToGitHubGist,
  pullFromGitHubGist,
} from '../utils/storage';
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  ExternalLink,
  Github,
  Key,
  X,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BookOpen,
} from 'lucide-react';

interface GitHubSyncModalProps {
  tasks: Task[];
  onTasksUpdated: (newTasks: Task[], message: string) => void;
  onClose: () => void;
}

export const GitHubSyncModal: React.FC<GitHubSyncModalProps> = ({
  tasks,
  onTasksUpdated,
  onClose,
}) => {
  const [cfg, setCfg] = useState<GitHubSyncConfig>(loadGitHubConfig());
  const [activeTab, setActiveTab] = useState<'gist' | 'deploy'>('gist');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [showTokenHelp, setShowTokenHelp] = useState(false);

  const handlePush = async () => {
    if (!cfg.token.trim()) {
      setStatusMsg({ type: 'err', text: 'Please enter your GitHub Personal Access Token' });
      return;
    }
    setIsSubmitting(true);
    setStatusMsg(null);
    try {
      const result = await syncToGitHubGist(tasks, cfg.token.trim(), cfg.gistId.trim() || undefined);
      const updatedCfg: GitHubSyncConfig = {
        ...cfg,
        token: cfg.token.trim(),
        gistId: result.gistId,
        gistUrl: result.gistUrl,
        lastSyncedAt: new Date().toISOString(),
      };
      setCfg(updatedCfg);
      saveGitHubConfig(updatedCfg);
      setStatusMsg({
        type: 'ok',
        text: `Backed up ${tasks.length} tasks to private GitHub Gist successfully!`,
      });
    } catch (err: any) {
      setStatusMsg({
        type: 'err',
        text: err?.message || 'Failed to sync to GitHub Gist',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePull = async () => {
    if (!cfg.gistId.trim()) {
      setStatusMsg({ type: 'err', text: 'Please enter your Gist ID to pull deadlines from' });
      return;
    }
    setIsSubmitting(true);
    setStatusMsg(null);
    try {
      const fetchedTasks = await pullFromGitHubGist(cfg.token.trim(), cfg.gistId.trim());
      onTasksUpdated(fetchedTasks, `Restored ${fetchedTasks.length} tasks from GitHub Gist!`);
      const updatedCfg = {
        ...cfg,
        lastSyncedAt: new Date().toISOString(),
      };
      setCfg(updatedCfg);
      saveGitHubConfig(updatedCfg);
      setStatusMsg({
        type: 'ok',
        text: `Successfully downloaded ${fetchedTasks.length} tasks from GitHub Gist!`,
      });
    } catch (err: any) {
      setStatusMsg({
        type: 'err',
        text: err?.message || 'Failed to pull from GitHub Gist',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-[var(--card)] text-[var(--text)] p-5 shadow-2xl border border-[var(--line)]">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-purple-600/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">GitHub Sync & Hosting</h3>
              <p className="text-xs text-[var(--muted)]">Sync across devices or host on GitHub Pages</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--muted)] p-1 hover:opacity-80 rounded-lg"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-[var(--bg)] p-1 border border-[var(--line)] mb-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('gist')}
            className={`flex-1 py-1.5 rounded-lg transition ${
              activeTab === 'gist'
                ? 'bg-[var(--accent)] text-white shadow'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            ☁️ Cloud Gist Sync
          </button>
          <button
            onClick={() => setActiveTab('deploy')}
            className={`flex-1 py-1.5 rounded-lg transition ${
              activeTab === 'deploy'
                ? 'bg-[var(--accent)] text-white shadow'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            🚀 GitHub Pages
          </button>
        </div>

        {/* Status alert message */}
        {statusMsg && (
          <div
            className={`p-3 rounded-xl mb-4 text-xs flex items-start gap-2 ${
              statusMsg.type === 'ok'
                ? 'bg-green-500/15 text-green-700 dark:text-green-300 border border-green-500/30'
                : 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30'
            }`}
          >
            {statusMsg.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div>{statusMsg.text}</div>
          </div>
        )}

        {activeTab === 'gist' ? (
          <div className="space-y-3.5 text-xs">
            <p className="text-[var(--muted)]">
              Sync your university deadlines, fees, and streak safely to a private <strong>GitHub Gist</strong> without needing a custom database.
            </p>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-purple-500" /> GitHub Token (classic or fine-grained)
                </label>
                <button
                  onClick={() => setShowTokenHelp(!showTokenHelp)}
                  className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5"
                >
                  <HelpCircle className="w-3 h-3" /> How to get?
                </button>
              </div>
              <input
                type="password"
                value={cfg.token}
                onChange={(e) => setCfg({ ...cfg, token: e.target.value })}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--text)] font-mono text-xs"
              />
            </div>

            {showTokenHelp && (
              <div className="p-3 bg-[var(--bg)] rounded-xl border border-[var(--line)] text-[11px] space-y-1 text-[var(--muted)]">
                <p className="font-bold text-[var(--text)]">Quick 1-minute steps:</p>
                <p>1. Go to <strong>github.com/settings/tokens</strong></p>
                <p>2. Click <strong>Generate new token (classic)</strong></p>
                <p>3. Check only the <strong>gist</strong> box.</p>
                <p>4. Generate and copy the token into this field.</p>
              </div>
            )}

            <div>
              <label className="font-bold block mb-1">
                Gist ID <span className="font-normal text-[var(--muted)]">(auto-generated on first push)</span>
              </label>
              <input
                type="text"
                value={cfg.gistId}
                onChange={(e) => setCfg({ ...cfg, gistId: e.target.value })}
                placeholder="e.g. 8f2c3d4a1b0..."
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--text)] font-mono text-xs"
              />
            </div>

            {cfg.gistUrl && (
              <div className="flex items-center justify-between p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
                <span className="font-semibold text-purple-700 dark:text-purple-300">View your Gist online</span>
                <a
                  href={cfg.gistUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-purple-600 font-bold hover:underline"
                >
                  Open <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {cfg.lastSyncedAt && (
              <p className="text-[11px] text-[var(--muted)]">
                Last synced: {new Date(cfg.lastSyncedAt).toLocaleString()}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={handlePush}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[var(--accent)] text-white font-bold hover:opacity-90 active:scale-98 transition disabled:opacity-50"
              >
                <CloudUpload className="w-4 h-4" />
                {isSubmitting ? 'Syncing...' : 'Push to Gist'}
              </button>
              <button
                onClick={handlePull}
                disabled={isSubmitting || !cfg.gistId}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[var(--bg)] border border-[var(--line)] font-bold text-[var(--text)] hover:opacity-90 active:scale-98 transition disabled:opacity-50"
              >
                <CloudDownload className="w-4 h-4" />
                Pull from Gist
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            <p className="text-[var(--muted)]">
              This app is already prepared with a GitHub Actions workflow (<code>.github/workflows/deploy.yml</code>) so you can host it free on <strong>GitHub Pages</strong>!
            </p>

            <div className="bg-[var(--bg)] p-3 rounded-xl border border-[var(--line)] space-y-2 font-mono text-[11px]">
              <p className="text-[var(--muted)] font-sans font-bold">1. Create a repository on GitHub:</p>
              <div className="bg-black/10 dark:bg-black/40 p-2 rounded-lg select-all">
                git init<br />
                git add .<br />
                git commit -m "Initial commit for Naeem Uni Deadlines PWA"<br />
                git branch -M main<br />
                git remote add origin https://github.com/&lt;your-username&gt;/uni-deadlines.git<br />
                git push -u origin main
              </div>
            </div>

            <div className="bg-[var(--bg)] p-3 rounded-xl border border-[var(--line)] space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-[var(--text)]">
                <BookOpen className="w-3.5 h-3.5 text-purple-500" /> 2. Enable GitHub Pages:
              </p>
              <p className="text-[var(--muted)]">
                In your GitHub repo, go to <strong>Settings &gt; Pages &gt; Build and deployment</strong> and set Source to <strong>GitHub Actions</strong>.
              </p>
              <p className="text-[var(--muted)]">
                GitHub will automatically build and publish your offline PWA to your free custom URL!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
