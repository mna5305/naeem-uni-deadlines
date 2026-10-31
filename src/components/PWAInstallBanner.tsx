import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share, PlusSquare, X } from 'lucide-react';

interface PWAInstallBannerProps {
  forceOpenIOSModal?: boolean;
  onCloseIOSModal?: () => void;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  forceOpenIOSModal,
  onCloseIOSModal,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showLocalGuide, setShowLocalGuide] = useState(false);

  const showGuide = forceOpenIOSModal || showLocalGuide;
  const handleCloseGuide = () => {
    setShowLocalGuide(false);
    onCloseIOSModal?.();
  };

  return (
    <>
      {/* Top Banner on mobile offering direct APK Download & PWA Install */}
      <div className="mb-3 bg-linear-to-r from-purple-700 via-pink-600 to-amber-600 p-2.5 rounded-2xl text-white shadow-md flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">🤖</span>
          <div className="min-w-0">
            <p className="font-bold text-xs leading-tight truncate">Android App (APK)</p>
            <p className="text-[11px] opacity-90 leading-tight">Installable offline app (274 KB)</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href="./Naeem-Uni-Deadlines.apk"
            download="Naeem-Uni-Deadlines.apk"
            className="flex items-center gap-1 bg-white text-purple-900 font-bold px-2.5 py-1.5 rounded-xl text-xs shadow-sm hover:bg-white/90 active:scale-95 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Download APK
          </a>
          {isInstallable && (
            <button
              onClick={install}
              className="bg-white/20 hover:bg-white/30 text-white font-bold px-2 py-1.5 rounded-xl text-xs active:scale-95 transition"
            >
              Install
            </button>
          )}
        </div>
      </div>

      {/* iOS Safari Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--card)] text-[var(--text)] p-5 shadow-2xl border border-[var(--line)]">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📱</span>
                <div>
                  <h3 className="text-base font-bold">Install on iPhone / iPad</h3>
                  <p className="text-xs text-[var(--muted)]">Add to Home Screen for offline access</p>
                </div>
              </div>
              <button
                onClick={handleCloseGuide}
                className="text-[var(--muted)] p-1 hover:opacity-80 rounded-lg"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-[var(--text)] my-4">
              <div className="flex items-start gap-3 bg-[var(--bg)] p-3 rounded-xl border border-[var(--line)]">
                <div className="p-2 bg-blue-500/15 text-blue-500 rounded-lg shrink-0">
                  <Share className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold">1. Tap the Share button</p>
                  <p className="text-[var(--muted)] mt-0.5">In Safari's bottom toolbar (the square with an arrow pointing up).</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-[var(--bg)] p-3 rounded-xl border border-[var(--line)]">
                <div className="p-2 bg-purple-500/15 text-purple-500 rounded-lg shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold">2. Tap 'Add to Home Screen'</p>
                  <p className="text-[var(--muted)] mt-0.5">Scroll down the action sheet and select <strong>Add to Home Screen</strong>.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-[var(--bg)] p-3 rounded-xl border border-[var(--line)]">
                <div className="p-2 bg-green-500/15 text-green-500 rounded-lg shrink-0 text-sm">
                  ⚡
                </div>
                <div>
                  <p className="font-bold">3. Works 100% Offline</p>
                  <p className="text-[var(--muted)] mt-0.5">Open directly like a native app anytime, even without internet connection.</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleCloseGuide}
              className="w-full rounded-xl bg-[var(--accent)] py-2.5 text-xs font-bold text-white shadow-md hover:opacity-90 active:scale-98 transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
