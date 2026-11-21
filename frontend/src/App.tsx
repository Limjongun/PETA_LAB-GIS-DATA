import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Brain,
  Clock,
  Download,
  FolderOpen,
  Globe,
  HelpCircle,
  Home,
  Loader2,
  Map as MapIcon,
  Moon,
  Search,
  Settings,
  Sparkles,
  Sun,
  Table,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import { api } from './api/client';
import { MapView } from './components/map/MapView';
import { TabularView } from './components/table/TabularView';
import idDict from './i18n/id.json';
import enDict from './i18n/en.json';
import { GLOSSARY_ITEMS } from './lib/glossary';
import { DashboardPage } from './pages/DashboardPage';
import { DataPage } from './pages/DataPage';
import { EarthCatalogPage } from './pages/EarthCatalogPage';
import { ExportPage } from './pages/ExportPage';
import { HistoryPage } from './pages/HistoryPage';
import { HomePage } from './pages/HomePage';
import { ModelPage } from './pages/ModelPage';
import { ProcessingPage } from './pages/ProcessingPage';
import { SettingsPage } from './pages/SettingsPage';
import { NavTab, usePetaStore } from './stores/usePetaStore';

export const App: React.FC = () => {
  const {
    activeTab,
    studioView,
    mode,
    theme,
    language,
    helpOpen,
    tourOpen,
    project,
    projects,
    layers,
    activeLayerId,
    selectionsByLayer,
    cursorCoords,
    mapZoom,
    jobs,
    tools,
    toasts,
    setActiveTab,
    setStudioView,
    setMode,
    setTheme,
    setHelpOpen,
    setTourOpen,
    loadProject,
    setSelectedToolId,
    removeToast,
    initApp,
    upsertJobFromWS,
  } = usePetaStore();

  const [glossarySearch, setGlossarySearch] = useState('');
  const [quickSearch, setQuickSearch] = useState('');
  const [jobTrayOpen, setJobTrayOpen] = useState(false);

  const t = language === 'en' ? enDict : idDict;
  const activeLayer = layers.find((l) => l.id === activeLayerId) || layers[0];
  const selectedCount = (activeLayer && selectionsByLayer[activeLayer.id]?.length) || 0;
  const runningJobs = jobs.filter((j) => j.status === 'running' || j.status === 'queued');
  const utmZone = Math.min(60, Math.max(1, Math.floor((cursorCoords.lon + 180) / 6) + 1));
  const utmHemi = cursorCoords.lat >= 0 ? 'N' : 'S';
  const utmEpsg = (cursorCoords.lat >= 0 ? 32600 : 32700) + utmZone;

  useEffect(() => {
    initApp();
  }, []);

  // Connect to WebSocket /ws/jobs for real-time job progress updates
  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws/jobs`;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.id) {
            upsertJobFromWS(data);
          }
        } catch {}
      };
    } catch {}
    return () => {
      ws?.close();
    };
  }, []);

  // Keyboard shortcuts (Ctrl+K search, M map, T table, D dashboard)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.getElementById('petalab-quick-search')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Clean 7-Workspace Navigation (Input -> Explore -> Analyze -> Model -> Export -> History & Settings)
  const navItems: { id: NavTab; label: string; icon: any }[] = [
    { id: 'home', label: t.nav.home, icon: Home },
    { id: 'data', label: 'Sumber Data', icon: FolderOpen },
    { id: 'map', label: 'Studio Peta', icon: MapIcon },
    { id: 'process', label: t.nav.process, icon: Wrench },
    { id: 'model', label: 'Model ML', icon: Brain },
    { id: 'export', label: t.nav.export, icon: Download },
    { id: 'history', label: t.nav.history, icon: Clock },
  ];

  const matchingQuickTools = quickSearch.trim()
    ? tools.filter(
        (tl) =>
          tl.name.toLowerCase().includes(quickSearch.toLowerCase()) ||
          tl.technical_name.toLowerCase().includes(quickSearch.toLowerCase())
      )
    : [];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* Top Global Header */}
      <header className="h-12 shrink-0 px-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 z-30">
        {/* Brand + Active Project Selector */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="relative w-7 h-7 rounded bg-teal-700 text-white font-medium text-sm flex items-center justify-center">
              <span>P</span>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-sm bg-orange-500" />
            </div>
            <span className="font-medium tracking-tight text-sm">PetaLab</span>
          </div>

          <span className="text-slate-300 dark:text-slate-600">▸</span>

          <select
            value={project?.id || 'banjir-surabaya'}
            onChange={(e) => loadProject(e.target.value)}
            className="text-xs font-normal bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded border border-transparent hover:border-slate-300 focus:outline-none cursor-pointer"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Center Quick Tool & Data Search (Ctrl+K) */}
        <div className="relative hidden md:block w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2" />
          <input
            id="petalab-quick-search"
            type="text"
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            placeholder="Cari tool (Buffer, Clip, NDVI, Moran)... [Ctrl+K]"
            className="w-full pl-8 pr-3 py-1 text-xs rounded bg-slate-100 dark:bg-slate-700/80 border border-transparent focus:border-teal-600 focus:outline-none"
          />
          {matchingQuickTools.length > 0 && (
            <div className="absolute top-8 left-0 w-full bg-white dark:bg-slate-800 shadow-sm rounded border border-slate-200 dark:border-slate-700 py-1 z-50">
              {matchingQuickTools.slice(0, 6).map((tl) => (
                <button
                  key={tl.id}
                  onClick={() => {
                    setSelectedToolId(tl.id);
                    setActiveTab('process');
                    setQuickSearch('');
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-teal-50 dark:hover:bg-slate-700 flex items-center justify-between"
                >
                  <span className="font-normal">{tl.name}</span>
                  <span className="text-[10px] text-teal-700">{tl.technical_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Controls: Mode Pemula/Lanjut, Theme, Help/Glossary */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-0.5 rounded text-xs">
            <button
              onClick={() => setMode('pemula')}
              className={`px-2.5 py-1 rounded-sm font-normal transition ${
                mode === 'pemula'
                  ? 'bg-teal-700 text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Pemula
            </button>
            <button
              onClick={() => setMode('lanjut')}
              className={`px-2.5 py-1 rounded-sm font-normal transition ${
                mode === 'lanjut'
                  ? 'bg-orange-600 text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Mode Lanjut
            </button>
          </div>

          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
            title="Ubah Tema Terang / Gelap"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setHelpOpen(!helpOpen)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-normal text-xs border border-teal-200 dark:border-teal-800"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Bantuan & Glosarium</span>
          </button>
        </div>
      </header>

      {/* Main Content Area with Left Navigation Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Navigation Sidebar (Minimalist Flat with Crisp Orange Active Accent) */}
        <aside className="w-24 shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col justify-between py-2 z-20">
          <nav className="space-y-0.5 px-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded text-[11px] font-normal transition ${
                    isActive
                      ? 'bg-teal-700/15 dark:bg-teal-900/45 text-teal-800 dark:text-teal-300 border-l-2 border-orange-500'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 border-l-2 border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-teal-700 dark:text-teal-400' : ''}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="px-1.5 pt-2 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded text-[11px] font-normal transition ${
                activeTab === 'settings'
                  ? 'bg-teal-700/15 dark:bg-teal-900/45 text-teal-800 dark:text-teal-300 border-l-2 border-orange-500'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 border-l-2 border-transparent'
              }`}
            >
              <Settings className="w-4 h-4 mb-0.5" />
              <span>{t.nav.settings}</span>
            </button>
          </div>
        </aside>

        {/* Active Workspace Pane (7 Clean Non-Overlapping Workspaces) */}
        <main className="flex-1 h-full overflow-hidden relative">
          {activeTab === 'home' && <HomePage />}
          {activeTab === 'data' && <DataPage />}
          {activeTab === 'map' && (
            <div className="flex flex-col h-full w-full overflow-hidden">
              {/* Unified Studio Peta Layout Switcher: Peta + Tabel | Peta Penuh | Tabel Penuh | Dashboard */}
              <div className="h-9 shrink-0 px-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1">
                  {[
                    { id: 'split', label: 'Peta + Tabel', icon: MapIcon },
                    { id: 'map', label: 'Peta Penuh', icon: Globe },
                    { id: 'table', label: 'Tabel Penuh', icon: Table },
                    { id: 'dashboard', label: 'Dashboard Analitik', icon: BarChart3 },
                  ].map((v) => {
                    const VIcon = v.icon;
                    const active = studioView === v.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setStudioView(v.id as any)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition ${
 active
 ? 'bg-slate-900 dark:bg-teal-700 text-white'
 : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
 }`}
                      >
                        <VIcon className="w-3.5 h-3.5" />
                        <span>{v.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="text-[11px] text-slate-400 hidden sm:block">
                  Seleksi cross-filter tersinkronisasi otomatis antar Peta, Tabel, dan Dashboard
                </div>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden">
                {(studioView === 'split' || studioView === 'map') && (
                  <div className={studioView === 'split' ? 'h-[58%] w-full' : 'h-full w-full'}>
                    <MapView />
                  </div>
                )}
                {studioView === 'split' && (
                  <div className="h-[42%] w-full border-t border-slate-200 dark:border-slate-700 overflow-hidden">
                    <TabularView compact />
                  </div>
                )}
                {studioView === 'table' && (
                  <div className="h-full w-full overflow-hidden">
                    <TabularView />
                  </div>
                )}
                {studioView === 'dashboard' && (
                  <div className="h-full w-full overflow-hidden">
                    <DashboardPage />
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'process' && <ProcessingPage />}
          {activeTab === 'model' && <ModelPage />}
          {activeTab === 'history' && <HistoryPage />}
          {activeTab === 'export' && <ExportPage />}
          {activeTab === 'settings' && <SettingsPage />}
        </main>

        {/* Contextual Help & Interactive Glossary Drawer */}
        {helpOpen && (
          <div className="w-80 shrink-0 h-full bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 p-4 overflow-y-auto space-y-4 text-xs z-30 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
              <div className="flex items-center gap-1.5 font-medium tracking-tight text-sm text-teal-700">
                <BookOpen className="w-4 h-4" />
                <span>Glosarium & Panduan Pemula</span>
              </div>
              <button onClick={() => setHelpOpen(false)} aria-label="Tutup Glosarium" className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setTourOpen(true)}
              className="w-full py-2 rounded bg-teal-700 text-white font-normal flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" /> Mulai Tur Singkat 5 Langkah
            </button>

            <input
              type="text"
              value={glossarySearch}
              onChange={(e) => setGlossarySearch(e.target.value)}
              placeholder="Cari istilah (CRS, Buffer, NDVI, Spatial CV)..."
              className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
            />

            <div className="space-y-2.5">
              {GLOSSARY_ITEMS.filter(
                (g) =>
                  !glossarySearch.trim() ||
                  g.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
                  g.short.toLowerCase().includes(glossarySearch.toLowerCase())
              ).map((g) => (
                <div
                  key={g.term}
                  className="p-3 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium tracking-tight text-slate-900 dark:text-white">{g.term}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-normal">
                      {g.category}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{g.short}</p>
                  <p className="text-[11px] text-teal-700 dark:text-teal-400">Contoh: {g.example}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Toast Notifications */}
      <div className="fixed top-14 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-3.5 rounded-md shadow-sm border flex items-start justify-between gap-3 text-xs ${
 toast.type === 'error'
 ? 'bg-rose-50/95 dark:bg-rose-950/95 border-rose-300 text-rose-900 dark:text-rose-200'
 : toast.type === 'warning'
 ? 'bg-orange-50/95 dark:bg-orange-950/95 border-orange-300 text-orange-900 dark:text-orange-200'
 : 'bg-white/95 dark:bg-slate-800/95 border-teal-200 dark:border-slate-700 text-slate-800 dark:text-slate-100'
 }`}
          >
            <div className="space-y-0.5">
              <div className="font-medium tracking-tight">{toast.title}</div>
              {toast.message && <div className="text-[11px] opacity-90">{toast.message}</div>}
              {toast.hint && <div className="text-[11px] font-medium text-teal-700"> {toast.hint}</div>}
            </div>
            <button onClick={() => removeToast(toast.id)} aria-label="Tutup Notifikasi" className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Floating Job Tray (Bottom Right) */}
      {(runningJobs.length > 0 || jobTrayOpen) && (
        <div className="fixed bottom-9 right-4 z-40 w-80 bg-white dark:bg-slate-800 shadow-sm rounded-md border border-teal-300 dark:border-slate-700 p-3 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium tracking-tight flex items-center gap-1.5 text-teal-700">
              {runningJobs.length > 0 && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Job Tray ({runningJobs.length} aktif)</span>
            </span>
            <button onClick={() => setJobTrayOpen(false)} aria-label="Tutup Job Tray" className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {jobs.slice(0, 3).map((j) => (
            <div key={j.id} className="p-2 rounded bg-slate-50 dark:bg-slate-900 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-normal truncate">{j.tool_name || j.tool_id}</span>
                {j.status === 'running' ? (
                  <button
                    onClick={() => api.cancelJob(j.id)}
                    className="text-rose-600 hover:underline flex items-center gap-0.5 text-[10px] font-normal"
                  >
                    <XCircle className="w-3 h-3" /> Batal
                  </button>
                ) : (
                  <span className="text-[10px] font-normal uppercase text-emerald-600">{j.status}</span>
                )}
              </div>
              <div className="w-full h-1.5 rounded-sm bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div className="h-full bg-teal-700 transition-all" style={{ width: `${j.progress || 0}%` }} />
              </div>
              <div className="text-[10px] text-slate-500 truncate">{j.message}</div>
            </div>
          ))}
        </div>
      )}

      {/* 5-Step Beginner Onboarding Tour Modal */}
      {tourOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-md max-w-lg w-full p-6 shadow-sm border border-slate-200 dark:border-slate-700 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium tracking-tight text-teal-700">Tur Singkat 5 Langkah PetaLab</h3>
              <button onClick={() => setTourOpen(false)} aria-label="Tutup Tur" className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <ol className="space-y-2.5 list-decimal list-inside text-slate-700 dark:text-slate-200 leading-relaxed">
              <li>
                <b> Data:</b> Unggah Shapefile (.zip), GeoJSON, CSV/Excel, atau GeoTIFF di menu <b>Data</b> — atau gunakan <b>Data Contoh Surabaya</b> yang sudah dimuat otomatis.
              </li>
              <li>
                <b> Peta & Gaya:</b> Buka menu <b>Peta</b> untuk melihat layer di atas OpenStreetMap dan atur pewarnaan <b>Choropleth</b> di panel kanan.
              </li>
              <li>
                <b> Pilih & Tabel:</b> Klik objek di peta atau gunakan <b>Pembuat Syarat Visual</b> & <b>Wizard Join Tabel</b> di tampilan belah <b>Peta + Tabel</b>.
              </li>
              <li>
                <b> Proses &  Model:</b> Jalankan 26+ alat geoprocessing (Buffer, Clip, NDVI, Hotspot Gi*) atau latih model <b>Random Forest dengan Spatial Block CV</b>.
              </li>
              <li>
                <b> Ekspor:</b> Simpan hasil ke GeoPackage, Shapefile, CSV, Jupyter Notebook (.ipynb), atau cetak <b>Layout Peta PDF</b> siap laporan.
              </li>
            </ol>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setTourOpen(false);
                  setActiveTab('map');
                }}
                className="px-4 py-2 rounded bg-teal-700 text-white font-normal"
              >
                Mulai Eksplorasi Peta →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Status Bar */}
      <footer className="h-7 shrink-0 px-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 z-30">
        <div className="flex items-center gap-4 tabular-nums">
          <span>
            {cursorCoords.lat.toFixed(4)}, {cursorCoords.lon.toFixed(4)}
          </span>
          <span>• Zoom: {mapZoom}</span>
          <span>• CRS: WGS 84 (EPSG:4326) · Metrik Otomatis: UTM Zona {utmZone}{utmHemi} (EPSG:{utmEpsg})</span>
        </div>

        <div className="flex items-center gap-4">
          {activeLayer && (
            <span>
              Layer aktif: <b className="text-slate-700 dark:text-slate-200">{activeLayer.name}</b> ({selectedCount}{' '}
              terpilih)
            </span>
          )}
          <button
            onClick={() => setJobTrayOpen(!jobTrayOpen)}
            className="hover:text-teal-700 font-normal flex items-center gap-1"
          >
            <Clock className="w-3 h-3" />
            <span>{runningJobs.length} job berjalan</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
