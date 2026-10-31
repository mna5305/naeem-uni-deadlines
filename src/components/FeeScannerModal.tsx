import React, { useState } from 'react';
import { Task, InstallmentRow } from '../types';
import { Camera, Plus, Trash2, X, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface FeeScannerModalProps {
  initialMode: 'scan' | 'manual';
  existingTasks: Task[];
  onAddInstallments: (installments: InstallmentRow[], totalAmount?: number) => void;
  onClose: () => void;
}

export const FeeScannerModal: React.FC<FeeScannerModalProps> = ({
  initialMode,
  existingTasks,
  onAddInstallments,
  onClose,
}) => {
  const isOnline = useOnlineStatus();
  const [mode, setMode] = useState<'scan' | 'manual' | 'review' | 'loading'>(
    initialMode === 'scan' && isOnline ? 'scan' : 'manual'
  );
  const [manualRows, setManualRows] = useState<InstallmentRow[]>([
    { no: 1, amount: 6050, due: '' },
    { no: 2, amount: 2650, due: '' },
  ]);
  const [scannedRows, setScannedRows] = useState<InstallmentRow[]>([]);
  const [scannedTotal, setScannedTotal] = useState<number | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isOnline) {
      setErrorMessage('You are offline. Please enter installment details manually below.');
      setMode('manual');
      return;
    }

    setMode('loading');
    setStatusMessage('Reading voucher screenshot with Gemini AI…');
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = (reader.result as string) || '';
        const response = await fetch('/api/scan-voucher', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: file.type || 'image/jpeg',
          }),
        });

        if (!response.ok) {
          throw new Error('Could not analyze the voucher image.');
        }

        const data = await response.json();
        const installments: InstallmentRow[] = (data.installments || [])
          .map((item: any, idx: number) => ({
            no: item.no || idx + 1,
            amount: Math.round(Number(item.amount) || 0),
            due: typeof item.due === 'string' ? item.due.slice(0, 10) : '',
          }))
          .filter((r: InstallmentRow) => r.amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(r.due));

        if (installments.length === 0) {
          setErrorMessage('Could not locate an installment table in this photo. You can type them manually below.');
          setMode('manual');
        } else {
          setScannedRows(installments);
          setScannedTotal(data.total ? Math.round(Number(data.total)) : undefined);
          setMode('review');
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to read image. You can enter installments manually.');
        setMode('manual');
      }
    };

    reader.onerror = () => {
      setErrorMessage('Error reading file. Please enter manually.');
      setMode('manual');
    };

    reader.readAsDataURL(file);
  };

  const handleAddManualRow = () => {
    setManualRows([
      ...manualRows,
      { no: manualRows.length + 1, amount: 2650, due: '' },
    ]);
  };

  const handleRemoveManualRow = (index: number) => {
    const next = manualRows.filter((_, i) => i !== index);
    setManualRows(next.map((r, i) => ({ ...r, no: i + 1 })));
  };

  const handleUpdateManualRow = (index: number, field: 'amount' | 'due', value: any) => {
    const next = [...manualRows];
    next[index] = { ...next[index], [field]: value };
    setManualRows(next);
  };

  const handleReviewManual = () => {
    const valid = manualRows
      .filter((r) => r.amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(r.due))
      .sort((a, b) => (a.due < b.due ? -1 : 1))
      .map((r, i) => ({ ...r, no: i + 1 }));

    if (valid.length === 0) {
      setErrorMessage('Please enter at least one valid amount and date (YYYY-MM-DD)');
      return;
    }

    setScannedRows(valid);
    setScannedTotal(valid.reduce((sum, r) => sum + r.amount, 0));
    setErrorMessage(null);
    setMode('review');
  };

  const isDuplicate = (r: InstallmentRow) => {
    return existingTasks.some(
      (t) => t.type === 'f' && Number(t.amount) === r.amount && (t.due || '').slice(0, 10) === r.due
    );
  };

  const handleConfirmAdd = () => {
    onAddInstallments(scannedRows, scannedTotal);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-[var(--card)] text-[var(--text)] p-5 shadow-2xl border border-[var(--line)]">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <div>
              <h3 className="text-base font-bold">
                {mode === 'scan'
                  ? 'Scan Fee Voucher'
                  : mode === 'manual'
                  ? 'Add Installments Manually'
                  : mode === 'review'
                  ? 'Review Installments'
                  : 'Processing Screenshot'}
              </h3>
              <p className="text-xs text-[var(--muted)]">Pakistan / VU Fee installment tracker</p>
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

        {errorMessage && (
          <div className="p-3 bg-red-500/15 border border-red-500/30 text-red-700 dark:text-red-300 rounded-xl text-xs flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Loading state */}
        {mode === 'loading' && (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold">{statusMessage}</p>
            <p className="text-xs text-[var(--muted)]">Detecting voucher tables, installment dates and amounts...</p>
          </div>
        )}

        {/* Scan Mode */}
        {mode === 'scan' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-[var(--line)] rounded-2xl p-6 text-center hover:border-[var(--accent)] transition cursor-pointer relative bg-[var(--bg)]">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <Camera className="w-10 h-10 mx-auto text-purple-500 mb-2" />
              <p className="text-sm font-bold">Upload screenshot or snap photo</p>
              <p className="text-xs text-[var(--muted)] mt-1">
                Virtual University challan, LMS installment table, or voucher slip
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 bg-purple-500/15 px-3 py-1 rounded-full font-semibold">
                <Sparkles className="w-3.5 h-3.5" /> Powered by Gemini AI
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setMode('manual')}
                className="w-full py-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] font-bold text-xs text-[var(--muted)] hover:text-[var(--text)]"
              >
                ✍️ Or type installments manually
              </button>
            </div>
          </div>
        )}

        {/* Manual Mode */}
        {mode === 'manual' && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--muted)]">
              Enter the amount (Rs) and due date for each installment:
            </p>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {manualRows.map((row, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 rounded-xl bg-[var(--bg)] border border-[var(--line)]"
                >
                  <span className="text-xs font-bold w-6 text-center text-[var(--muted)]">
                    #{idx + 1}
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={row.amount || ''}
                    onChange={(e) =>
                      handleUpdateManualRow(idx, 'amount', Math.round(Number(e.target.value) || 0))
                    }
                    placeholder="Amount (Rs)"
                    className="flex-1 p-2 rounded-lg border border-[var(--line)] text-xs font-bold bg-[var(--card)] text-[var(--text)]"
                  />
                  <input
                    type="date"
                    value={row.due}
                    onChange={(e) => handleUpdateManualRow(idx, 'due', e.target.value)}
                    className="flex-1 p-2 rounded-lg border border-[var(--line)] text-xs bg-[var(--card)] text-[var(--text)]"
                  />
                  {manualRows.length > 1 && (
                    <button
                      onClick={() => handleRemoveManualRow(idx)}
                      className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"
                      aria-label="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleAddManualRow}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[var(--bg)] border border-dashed border-[var(--line)] text-xs font-semibold text-[var(--accent)] hover:opacity-80"
            >
              <Plus className="w-3.5 h-3.5" /> Add another installment
            </button>

            <div className="flex gap-2 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-[var(--line)] font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleReviewManual}
                className="flex-1 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold text-xs hover:opacity-90 active:scale-98"
              >
                Review & Confirm
              </button>
            </div>
          </div>
        )}

        {/* Review Mode */}
        {mode === 'review' && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs">
              <p className="font-bold text-purple-700 dark:text-purple-300">
                Found {scannedRows.length} Installments
              </p>
              <p className="text-[var(--muted)] mt-0.5">
                Total:{' '}
                <strong>
                  Rs{' '}
                  {scannedRows.reduce((acc, r) => acc + r.amount, 0).toLocaleString()}
                </strong>
                . Please review dates and amounts before adding.
              </p>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 text-xs">
              {scannedRows.map((r, i) => {
                const dup = isDuplicate(r);
                return (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-2.5 rounded-xl border ${
                      dup
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-[var(--bg)] border-[var(--line)]'
                    }`}
                  >
                    <div>
                      <span className="font-bold">
                        {r.no || i + 1}. Rs {r.amount.toLocaleString()}
                      </span>{' '}
                      · <span className="text-[var(--muted)]">{r.due}</span>
                      {dup && (
                        <span className="ml-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                          (already added)
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setScannedRows(scannedRows.filter((_, idx) => idx !== i))}
                      className="text-red-500 hover:opacity-75 p-1"
                      aria-label="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setMode('manual')}
                className="flex-1 py-2.5 rounded-xl border border-[var(--line)] font-bold text-xs"
              >
                Edit
              </button>
              <button
                onClick={handleConfirmAdd}
                className="flex-1 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold text-xs hover:opacity-90 active:scale-98"
              >
                Add to Deadlines
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
