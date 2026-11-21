import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Database,
  FileSpreadsheet,
  FolderPlus,
  HardDrive,
  Layers,
  MapPin,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { api } from '../api/client';
import { formatBytes } from '../lib/format';
import { usePetaStore } from '../stores/usePetaStore';

export const HomePage: React.FC = () => {
  const {
    projects,
    projectId,
    health,
    setActiveTab,
    setSelectedToolId,
    loadProject,
    refreshLayers,
    addToast,
    setTourOpen,
  } = usePetaStore();

  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    try {
      const created = await api.createProject({ name: newProjName, description: newProjDesc });
      setNewProjName('');
      setNewProjDesc('');
      setCreating(false);
      await loadProject(created.id);
      await refreshLayers();
      addToast({ type: 'success', title: `Proyek '${created.name}' berhasil dibuat!` });
      setActiveTab('data');
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal membuat proyek', message: err.message });
    }
  };

  const handleSeedSample = async () => {
    try {
      const proj = await api.seedSampleProject();
      await loadProject(proj.id);
      addToast({
        type: 'success',
        title: 'Proyek Contoh Surabaya Siap!',
        message: '6 layer contoh (Kecamatan, Sekolah, Zona Banjir, Jalan, Raster DEM/Citra, Tabel Ekonomi) telah dimuat.',
      });
      setActiveTab('map');
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal memuat data contoh', message: err.message });
    }
  };

  const recipes = [
    {
      title: 'Membuat peta tematik (Choropleth) dari data wilayah',
      desc: 'Warnai poligon kecamatan berdasarkan kepadatan penduduk atau kerawanan banjir.',
      icon: Layers,
      color: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400',
      action: () => setActiveTab('map'),
    },
    {
      title: 'Menggabungkan tabel Excel/CSV ke peta wilayah',
      desc: 'Gunakan Wizard Join 3-langkah dengan pencocokan nama & normalisasi ejaan otomatis.',
      icon: FileSpreadsheet,
      color: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400',
      action: () => setActiveTab('table'),
    },
    {
      title: 'Menghitung jumlah titik fasilitas per wilayah',
      desc: 'Hitung berapa sekolah di tiap kecamatan beserta kepadatannya per km².',
      icon: MapPin,
      color: 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400',
      action: () => {
        setSelectedToolId('analysis.count_points');
        setActiveTab('process');
      },
    },
    {
      title: 'Membuat zona jangkauan (Buffer) & mencari yang terdekat',
      desc: 'Buat radius 500 meter di sekitar sekolah atau cari jalan utama terdekat.',
      icon: Wand2,
      color: 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400',
      action: () => {
        setSelectedToolId('vector.buffer');
        setActiveTab('process');
      },
    },
    {
      title: 'Menghitung Indeks Kehijauan (NDVI) & Kemiringan DEM',
      desc: 'Olah citra satelit multi-band dan raster ketinggian menjadi peta NDVI atau Slope.',
      icon: Activity,
      color: 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400',
      action: () => {
        setSelectedToolId('raster.index');
        setActiveTab('process');
      },
    },
    {
      title: 'Memprediksi suhu / kerawanan di peta (Spatial ML)',
      desc: 'Latih Random Forest / Gradient Boosting dengan Spatial Block Cross-Validation.',
      icon: Sparkles,
      color: 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400',
      action: () => setActiveTab('model'),
    },
  ];

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto">
      {/* Minimalist Architectural Hero Banner (Flat Deep Tosca + Crisp Orange Accent, Zero Glow) */}
      <div className="rounded-md bg-slate-900 dark:bg-slate-800 text-white p-6 border border-slate-700 border-t-2 border-t-teal-600 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-sm bg-orange-500/15 border border-orange-500/35 text-orange-300 text-[11px] font-normal">
            <span>Local-First Web GIS &amp; Spatial Machine Learning</span>
          </div>
          <h1 className="text-2xl font-medium tracking-tight">
            Selamat Datang di <span className="text-teal-400">PetaLab</span>
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            Lingkungan analisis geospasial lokal berbasis browser dengan mesin Python (GeoPandas, DuckDB, Raster Engine, Google Earth Engine, dan Scikit-learn) secara non-destruktif.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleSeedSample}
            className="flex items-center gap-2 px-4 py-2 rounded bg-teal-700 hover:bg-teal-600 text-white font-normal text-xs transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Coba Data Contoh Surabaya</span>
          </button>
          <button
            onClick={() => setCreating(!creating)}
            className="flex items-center gap-2 px-4 py-2 rounded bg-orange-600 hover:bg-orange-500 text-white font-normal text-xs transition"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>+ Proyek Baru</span>
          </button>
          <button
            onClick={() => setTourOpen(true)}
            className="px-3.5 py-2 rounded bg-transparent hover:bg-slate-700/60 text-slate-200 text-xs border border-slate-600 transition"
          >
            Tur 5 Langkah
          </button>
        </div>
      </div>

      {/* Create New Project Modal Inline */}
      {creating && (
        <form
          onSubmit={handleCreateProject}
          className="p-4 rounded-md bg-white dark:bg-slate-800 border border-teal-200 dark:border-slate-700 flex flex-wrap items-end gap-3 text-xs"
        >
          <div className="flex-1 min-w-[200px]">
            <label className="block font-normal mb-1">Nama Proyek Baru</label>
            <input
              type="text"
              required
              value={newProjName}
              onChange={(e) => setNewProjName(e.target.value)}
              placeholder="Contoh: Analisis Tata Ruang Malang"
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
            />
          </div>
          <div className="flex-1 min-w-[240px]">
            <label className="block font-normal mb-1">Deskripsi Singkat</label>
            <input
              type="text"
              value={newProjDesc}
              onChange={(e) => setNewProjDesc(e.target.value)}
              placeholder="Catatan tujuan proyek..."
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded bg-teal-700 text-white font-normal hover:bg-teal-800"
          >
            Buat & Buka Proyek
          </button>
        </form>
      )}

      {/* Daftar Proyek */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-normal text-slate-800 dark:text-slate-100"> Proyek Tersimpan di Workspace Lokal</h2>
          <span className="text-xs text-slate-500">Satu proyek = satu folder mandiri (mudah di-zip & dipindah)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {projects.map((p) => {
            const isCurrent = p.id === projectId;
            return (
              <div
                key={p.id}
                onClick={async () => {
                  await loadProject(p.id);
                  setActiveTab('map');
                }}
                className={`p-4 rounded-md border transition cursor-pointer flex flex-col justify-between ${
 isCurrent
 ? 'border-teal-700 bg-teal-50/40 dark:bg-teal-950/30 shadow-sm'
 : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-teal-400'
 }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {p.id}
                    </span>
                    {isCurrent && (
                      <span className="text-[11px] font-normal px-2 py-0.5 rounded-sm bg-teal-700 text-white">
                        Aktif
                      </span>
                    )}
                  </div>
                  <h3 className="font-normal text-sm text-slate-900 dark:text-slate-100">{p.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {p.description || 'Proyek analisis spasial lokal.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    <b>{p.layer_count ?? 0}</b> layer · <b>{p.model_count ?? 0}</b> model
                  </span>
                  <span className="tabular-nums">{formatBytes(p.size_bytes)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* "Apa yang ingin kamu lakukan?" (Resep / Wizard Pemula) */}
      <div className="space-y-3">
        <h2 className="text-base font-normal text-slate-800 dark:text-slate-100">
           Apa yang ingin kamu lakukan? (Resep Cepat Pemula)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {recipes.map((r, i) => {
            const Icon = r.icon;
            return (
              <button
                key={i}
                onClick={r.action}
                className="text-left p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-teal-600 hover: transition group flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className={`w-9 h-9 rounded flex items-center justify-center ${r.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-normal text-xs text-slate-900 dark:text-slate-100 group-hover:text-teal-700">
                    {r.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{r.desc}</p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-normal text-teal-700">
                  <span>Mulai sekarang</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Compact System Status Link (Full Diagnostics live exclusively in Pengaturan to avoid duplication) */}
      {health && (
        <div className="px-4 py-3 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Mesin Spasial Lokal Aktif · Python v{health.python_version} · Ruang Disk Bebas{' '}
              <b className="tabular-nums">{health.disk_free_gb} GB</b>
            </span>
          </div>
          <button
            onClick={() => setActiveTab('settings')}
            className="text-teal-700 hover:underline flex items-center gap-1"
          >
            <span>Lihat Diagnostik Paket &amp; GEE di Pengaturan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
