import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  GitBranch,
  Play,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { api } from '../api/client';
import { usePetaStore } from '../stores/usePetaStore';

export const HistoryPage: React.FC = () => {
  const { projectId, layers, jobs, refreshLayers, refreshJobs, addToast } = usePetaStore();
  const [historyItems, setHistoryItems] = useState<any[]>([]);

  const loadHistory = async () => {
    try {
      const h = await api.listHistory(projectId);
      setHistoryItems(h);
    } catch {}
  };

  useEffect(() => {
    loadHistory();
    refreshJobs();
  }, [projectId, layers.length, jobs.length]);

  const handleUndo = async (hid: number) => {
    try {
      await api.undoHistory(hid, projectId);
      await refreshLayers();
      await loadHistory();
      addToast({ type: 'info', title: `Aksi #${hid} berhasil dibatalkan (Undo)` });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal melakukan Undo', message: err.message });
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto text-xs">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Timeline Riwayat & Undo */}
        <div className="p-5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-700" />
              <h2 className="text-base font-medium tracking-tight">Timeline Riwayat Proyek & Undo</h2>
            </div>
            <span className="text-slate-400">{historyItems.length} aktivitas tercatat</span>
          </div>

          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {historyItems.map((h) => (
              <div
                key={h.id}
                className="p-3 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-normal uppercase text-[10px]">
                      {h.action}
                    </span>
                    <span className="font-normal text-slate-800 dark:text-slate-100">{h.title}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">{h.created_at?.slice(0, 19).replace('T', ' ')} UTC</div>
                </div>

                {h.undo?.type && (
                  <button
                    onClick={() => handleUndo(h.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-normal shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Undo
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Lineage Asal-usul Layer & Daftar Background Jobs */}
        <div className="space-y-6">
          {/* Grafik Asal-usul (Lineage) Layer */}
          <div className="p-5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-teal-600" />
              <h2 className="text-base font-medium tracking-tight">Pohon Asal-Usul Layer (Data Lineage)</h2>
            </div>
            <p className="text-slate-500">
              Setiap layer mencatat dari file atau proses tool mana ia dihasilkan demi reproduksibilitas ilmiah:
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {layers.map((l) => (
                <div
                  key={l.id}
                  className="p-2.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-sm bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-mono text-[10px]">
                      {l.lineage?.tool_name || l.lineage?.tool || 'Sumber Asli'}
                    </span>
                    <span className="text-slate-400">──►</span>
                    <span className="font-normal">{l.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{l.crs || 'Tabel'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Background Jobs List */}
          <div className="p-5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <h2 className="text-base font-medium tracking-tight"> Antrean & Log Pekerjaan (Jobs)</h2>
            <div className="space-y-2.5 max-h-64 overflow-y-auto">
              {jobs.length === 0 ? (
                <p className="text-slate-400">Belum ada job yang dijalankan.</p>
              ) : (
                jobs.map((j) => (
                  <div
                    key={j.id}
                    className="p-3 rounded border border-slate-200 dark:border-slate-700 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-normal">{j.tool_name || j.tool_id}</span>
                      <span
                        className={`px-2 py-0.5 rounded-sm text-[10px] font-normal uppercase ${
 j.status === 'succeeded'
 ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
 : j.status === 'failed'
 ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
 : 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300'
 }`}
                      >
                        {j.status} ({j.progress}%)
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">{j.message}</div>
                    {j.error_user && (
                      <div className="p-2 rounded bg-rose-50 text-rose-800 text-[11px]">{j.error_user}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
