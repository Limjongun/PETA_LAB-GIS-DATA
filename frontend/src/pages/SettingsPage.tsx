import React, { useEffect, useState } from 'react';
import { CheckCircle2, Cpu, Globe, Moon, Settings, ShieldCheck, Sun, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { formatBytes } from '../lib/format';
import { usePetaStore } from '../stores/usePetaStore';

export const SettingsPage: React.FC = () => {
  const {
    mode,
    theme,
    language,
    health,
    geeStatus,
    setMode,
    setTheme,
    setLanguage,
    refreshGeeStatus,
    addToast,
  } = usePetaStore();

  const [geeProjectId, setGeeProjectId] = useState(geeStatus?.project_id || '');
  const [geeAuthMode, setGeeAuthMode] = useState<'oauth' | 'service_account'>('oauth');
  const [geeEmail, setGeeEmail] = useState(geeStatus?.email || '');
  const [saJsonText, setSaJsonText] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (geeStatus?.project_id && !geeProjectId) setGeeProjectId(geeStatus.project_id);
    if (geeStatus?.email && !geeEmail) setGeeEmail(geeStatus.email);
  }, [geeStatus?.project_id, geeStatus?.email]);

  const handleConnectGee = async () => {
    setBusy(true);
    try {
      await api.geeAuth({
        project_id: geeProjectId,
        auth_mode: geeAuthMode,
        email: geeEmail || undefined,
        service_account_json: geeAuthMode === 'service_account' && saJsonText.trim() ? saJsonText : undefined,
      });
      await refreshGeeStatus();
      addToast({
        type: 'success',
        title: `Google Earth Engine Terhubung (${geeProjectId})`,
        message: 'Kredensial disimpan aman dengan izin akses 0600 di luar folder proyek.',
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal menghubungkan GEE', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleTestGee = async () => {
    setBusy(true);
    try {
      const res = await api.geeTest(geeProjectId);
      setTestResult(res.ok ? res.message : res.error?.message || 'Uji koneksi gagal.');
    } catch (err: any) {
      setTestResult(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnectGee = async () => {
    await api.geeDisconnect();
    await refreshGeeStatus();
    setTestResult(null);
    addToast({ type: 'info', title: 'Koneksi Earth Engine diputus & file kredensial dihapus permanen.' });
  };

  const handleClearCache = async () => {
    await api.geeClearCache();
    await refreshGeeStatus();
    addToast({ type: 'success', title: 'Cache unduhan Earth Engine berhasil dibersihkan.' });
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto text-xs">
      {/* Preferensi Umum */}
      <div className="p-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
          <Settings className="w-5 h-5 text-teal-700" />
          <h1 className="text-base">Pengaturan PetaLab & Preferensi Antarmuka</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="text-sm">Tingkat Antarmuka</div>
            <p className="text-[11px] text-slate-500">
              Mode Pemula menyembunyikan parameter teknis rumit; Mode Lanjut membuka SQL DuckDB, Dataset Kustom GEE, & Konsol Python.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setMode('pemula')}
                className={`flex-1 py-2 rounded ${
 mode === 'pemula' ? 'bg-slate-900 dark:bg-teal-700 text-white' : 'bg-slate-100 dark:bg-slate-700'
 }`}
              >
                Mode Pemula
              </button>
              <button
                onClick={() => setMode('lanjut')}
                className={`flex-1 py-2 rounded ${
 mode === 'lanjut' ? 'bg-slate-900 dark:bg-teal-700 text-white' : 'bg-slate-100 dark:bg-slate-700'
 }`}
              >
                Mode Lanjut
              </button>
            </div>
          </div>

          <div className="p-4 rounded border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="text-sm">Tema Visual</div>
            <p className="text-[11px] text-slate-500">
              UI dirancang netral dan tenang agar warna hanya fokus untuk data di peta dan grafik.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setTheme('light')}
                className={`flex-1 py-2 rounded flex items-center justify-center gap-1.5 ${
 theme === 'light' ? 'bg-slate-900 dark:bg-teal-700 text-white' : 'bg-slate-100 dark:bg-slate-700'
 }`}
              >
                <Sun className="w-3.5 h-3.5" /> Terang
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex-1 py-2 rounded flex items-center justify-center gap-1.5 ${
 theme === 'dark' ? 'bg-slate-900 dark:bg-teal-700 text-white' : 'bg-slate-100 dark:bg-slate-700'
 }`}
              >
                <Moon className="w-3.5 h-3.5" /> Gelap
              </button>
            </div>
          </div>

          <div className="p-4 rounded border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="text-sm">Bahasa (i18n)</div>
            <p className="text-[11px] text-slate-500">
              Format angka lokal Indonesia (12.345,67) dengan satuan metrik (m / km / km²).
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setLanguage('id')}
                className={`flex-1 py-2 rounded ${
 language === 'id' ? 'bg-slate-900 dark:bg-teal-700 text-white' : 'bg-slate-100 dark:bg-slate-700'
 }`}
              >
                Indonesia
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`flex-1 py-2 rounded ${
 language === 'en' ? 'bg-slate-900 dark:bg-teal-700 text-white' : 'bg-slate-100 dark:bg-slate-700'
 }`}
              >
                English
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pengaturan Google Earth Engine ("Katalog Bumi", §3.2 & §12.1) */}
      <div className="p-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-teal-700" />
            <h2 className="text-base">Integrasi Google Earth Engine (Katalog Bumi)</h2>
          </div>
          <span
            className={`px-2.5 py-1 rounded-sm text-[11px] ${
 geeStatus?.connected
 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
 : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
 }`}
          >
            {geeStatus?.connected
              ? `Terhubung sebagai ${geeStatus.email} · Project: ${geeStatus.project_id}`
              : 'Belum terhubung'}
          </span>
        </div>

        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          Earth Engine memberi citra satelit siap pakai (Sentinel-2, Landsat 8/9, DEM, WorldCover, CHIRPS) tanpa perlu mengunduh file mentah raksasa. Gratis untuk mahasiswa, dosen, dan peneliti nonkomersial.{' '}
          <a
            href="https://code.earthengine.google.com/register"
            target="_blank"
            rel="noreferrer"
            className="text-teal-700 underline"
          >
            Buka halaman pendaftaran Earth Engine ↗
          </a>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-slate-500">ID Project Google Cloud</label>
            <input
              type="text"
              value={geeProjectId}
              onChange={(e) => setGeeProjectId(e.target.value)}
              placeholder="petalab-riset-2026"
              className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
            />
          </div>
          <div>
            <label className="block mb-1 text-slate-500">Cara Masuk</label>
            <select
              value={geeAuthMode}
              onChange={(e) => setGeeAuthMode(e.target.value as any)}
              className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
            >
              <option value="oauth">Akun Google Saya (OAuth — Disarankan)</option>
              <option value="service_account">Service Account (.json — Mode Lanjut)</option>
            </select>
          </div>
        </div>

        {geeAuthMode === 'oauth' ? (
          <div>
            <label className="block mb-1 text-slate-500">Email Akun Google (Opsional)</label>
            <input
              type="email"
              value={geeEmail}
              onChange={(e) => setGeeEmail(e.target.value)}
              placeholder="nama@universitas.ac.id"
              className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
            />
          </div>
        ) : (
          <div>
            <label className="block mb-1 text-slate-500">Tempel Isi JSON Kunci Service Account</label>
            <textarea
              rows={3}
              value={saJsonText}
              onChange={(e) => setSaJsonText(e.target.value)}
              placeholder='{"type": "service_account", "client_email": "...", ...}'
              className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent font-mono text-[11px]"
            />
            <p className="text-[11px] text-orange-600 mt-1">
              Kunci disimpan di folder terpisah <code>credentials/</code> (izin 0600, di luar folder proyek). Disarankan menghapus salinan asli dari folder Unduhan Anda.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleTestGee}
              disabled={busy}
              className="px-4 py-2 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Uji Koneksi
            </button>
            <button
              onClick={handleConnectGee}
              disabled={busy}
              className="px-4 py-2 rounded bg-slate-900 dark:bg-teal-700 text-white"
            >
              {geeStatus?.connected ? 'Perbarui Koneksi' : 'Hubungkan'}
            </button>
            {geeStatus?.connected && (
              <button
                onClick={handleDisconnectGee}
                className="px-3.5 py-2 rounded border border-rose-300 text-rose-600 hover:bg-rose-50"
              >
                Putuskan
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-slate-500">
            <span>
              Cache Earth Engine: <b>{formatBytes(geeStatus?.cache_bytes || 0)}</b> ({geeStatus?.cache_entries || 0} entri)
            </span>
            <button
              onClick={handleClearCache}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <Trash2 className="w-3.5 h-3.5" /> Bersihkan Cache
            </button>
          </div>
        </div>

        {testResult && (
          <div className="p-3 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
            {testResult}
          </div>
        )}
      </div>

      {/* Keamanan Lokal & Diagnostik */}
      <div className="p-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="p-4 rounded bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Keamanan Lokal & Isolasi Kredensial</span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            • Server berjalan lokal di <code>127.0.0.1</code> · Ekspor <code>.petalab.zip</code> memakai <i>allowlist</i> ketat sehingga folder <code>credentials/</code> tidak pernah terbawa.
            <br />• File asli di folder <code>sources/</code> bersifat read-only; setiap proses menghasilkan layer baru dengan catatan lineage & atribusi.
          </p>
        </div>

        {health && (
          <div className="space-y-2">
            <h3 className="text-sm flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-teal-700" /> Diagnostik Paket Geospasial & Machine Learning
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {Object.entries(health.packages || {}).map(([k, pkg]: [string, any]) => (
                <div
                  key={k}
                  className="p-2.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                >
                  <div>
                    <div>{pkg.label}</div>
                    <div className="text-[10px] text-slate-400">v{pkg.version || 'N/A'}</div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
