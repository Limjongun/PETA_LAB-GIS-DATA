import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  Download,
  Eye,
  Globe,
  Info,
  Layers,
  Search,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../api/client';
import { formatBytes, formatNumber } from '../lib/format';
import { usePetaStore } from '../stores/usePetaStore';

const DATE_PRESETS = [
  { id: 'dry_2025', label: 'Musim kemarau 2025', start: '2025-06-01', end: '2025-09-30' },
  { id: 'wet_2025', label: 'Musim hujan 2025/26', start: '2025-11-01', end: '2026-02-28' },
  { id: 'year_2025', label: 'Sepanjang tahun 2025', start: '2025-01-01', end: '2025-12-31' },
  { id: 'dry_2024', label: 'Musim kemarau 2024', start: '2024-06-01', end: '2024-09-30' },
];

export const EarthCatalogPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const {
    projectId,
    layers,
    jobs,
    mode,
    geeStatus,
    setActiveTab,
    setActiveLayerId,
    refreshGeeStatus,
    refreshLayers,
    addToast,
  } = usePetaStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Step 1: Area State
  const spatialLayers = layers.filter((l) => l.bbox);
  const [areaSource, setAreaSource] = useState<'layer' | 'custom_bbox'>('layer');
  const [areaLayerId, setAreaLayerId] = useState<string>(spatialLayers[0]?.id || '');
  const [customBbox, setCustomBbox] = useState<[number, number, number, number]>([112.595, -7.355, 112.818, -7.202]);

  // Step 2: Data Preset State
  const [selectedPresetId, setSelectedPresetId] = useState<string>('gee.ndvi');
  const [customDatasetId, setCustomDatasetId] = useState('COPERNICUS/S2_SR_HARMONIZED');
  const [customExpr, setCustomExpr] = useState('(B8 - B4) / (B8 + B4)');

  // Step 3: Time & Cloud Masking State (Indonesia default: cloud masking ON, 40%)
  const [tanggalMulai, setTanggalMulai] = useState('2025-06-01');
  const [tanggalAkhir, setTanggalAkhir] = useState('2025-09-30');
  const [buangAwan, setBuangAwan] = useState(true);
  const [batasAwan, setBatasAwan] = useState(40);

  // Step 4: Preview & Estimation State
  const [scaleM, setScaleM] = useState<number>(10);
  const [previewCmap, setPreviewCmap] = useState<string>('rdylgn');
  const [estimateData, setEstimateData] = useState<any | null>(null);
  const [previewTileUrl, setPreviewTileUrl] = useState<string>('');
  const [outputName, setOutputName] = useState<string>('');
  const [showPython, setShowPython] = useState(false);

  // Step 5: Download Job Status
  const [lastJobId, setLastJobId] = useState<string | null>(null);

  const previewMapContainer = useRef<HTMLDivElement | null>(null);
  const previewMapRef = useRef<maplibregl.Map | null>(null);

  const selectedPreset = catalogItems.find((c) => c.id === selectedPresetId) || catalogItems[0] || null;
  const activeAreaBbox: [number, number, number, number] =
    areaSource === 'layer'
      ? (layers.find((l) => l.id === areaLayerId)?.bbox as [number, number, number, number]) || customBbox
      : customBbox;

  // Keep areaLayerId in sync whenever project or layers change (prevent stale layer IDs across projects)
  useEffect(() => {
    if (spatialLayers.length === 0) {
      setAreaLayerId('');
      setAreaSource('custom_bbox');
    } else if (!spatialLayers.some((l) => l.id === areaLayerId)) {
      setAreaLayerId(spatialLayers[0].id);
    }
  }, [projectId, layers.map((l) => l.id).join(',')]);

  // Dispose WebGL preview map cleanly on component unmount
  useEffect(() => {
    return () => {
      if (previewMapRef.current) {
        previewMapRef.current.remove();
        previewMapRef.current = null;
      }
    };
  }, []);

  // Load Catalog presets
  useEffect(() => {
    api
      .geeCatalog(searchQuery || undefined, mode === 'lanjut')
      .then((items) => setCatalogItems(items))
      .catch(() => {});
  }, [searchQuery, mode]);

  // Update default scale & cmap when preset changes
  useEffect(() => {
    if (selectedPreset) {
      setScaleM(selectedPreset.native_scale_m || 10);
      setPreviewCmap(selectedPreset.default_cmap || 'viridis');
    }
  }, [selectedPreset?.id]);

  // Debounced Estimation (Steps 1-3: local lightweight math, 0 GEE quota) vs Live Preview (Step 4 ONLY)
  useEffect(() => {
    if (!selectedPresetId) return;
    const payload = {
      project_id: projectId,
      preset_id: selectedPresetId,
      layer_id: areaSource === 'layer' && areaLayerId ? areaLayerId : undefined,
      bbox: activeAreaBbox,
      scale: scaleM,
      cmap: previewCmap,
      tanggal_mulai: tanggalMulai,
      tanggal_akhir: tanggalAkhir,
      buang_awan: buangAwan,
      batas_awan: batasAwan,
    };
    let cancelled = false;
    const timer = setTimeout(() => {
      if (step === 4) {
        api
          .geePreview(payload)
          .then((res) => {
            if (cancelled) return;
            setEstimateData(res);
            setPreviewTileUrl(res.tile_url);
          })
          .catch(() => {});
      } else {
        api
          .geeEstimate(payload)
          .then((res) => {
            if (cancelled) return;
            setEstimateData(res);
          })
          .catch(() => {});
      }
    }, step === 4 ? 350 : 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [selectedPresetId, areaLayerId, areaSource, customBbox.join(','), scaleM, previewCmap, tanggalMulai, tanggalAkhir, buangAwan, batasAwan, step, projectId]);

  // Render live interactive MapLibre Preview in Step 4 (Path A — Instant Tile Preview)
  useEffect(() => {
    if (step !== 4 || !previewMapContainer.current) {
      if (previewMapRef.current) {
        previewMapRef.current.remove();
        previewMapRef.current = null;
      }
      return;
    }

    const [minx, miny, maxx, maxy] = activeAreaBbox;
    const tileFullUrl =
      previewTileUrl && previewTileUrl.startsWith('http')
        ? previewTileUrl
        : `${window.location.origin}/api/gee/tiles/${selectedPresetId}/{z}/{x}/{y}.png?bbox=${activeAreaBbox.join(',')}&cmap=${previewCmap}&d0=${tanggalMulai}&d1=${tanggalAkhir}`;

    if (!previewMapRef.current) {
      const m = new maplibregl.Map({
        container: previewMapContainer.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'],
              tileSize: 256,
            },
            gee_preview: {
              type: 'raster',
              tiles: [tileFullUrl],
              tileSize: 256,
            },
          },
          layers: [
            { id: 'osm_base', type: 'raster', source: 'osm' },
            { id: 'gee_overlay', type: 'raster', source: 'gee_preview', paint: { 'raster-opacity': 0.82 } },
          ],
        },
        center: [(minx + maxx) / 2, (miny + maxy) / 2],
        zoom: 11.2,
        attributionControl: false,
      });
      m.on('load', () => {
        m.fitBounds(
          [
            [minx, miny],
            [maxx, maxy],
          ],
          { padding: 24, duration: 400 }
        );
      });
      previewMapRef.current = m;
    } else {
      const m = previewMapRef.current;
      const applyOverlay = () => {
        if (m.getLayer('gee_overlay')) m.removeLayer('gee_overlay');
        if (m.getSource('gee_preview')) m.removeSource('gee_preview');
        m.addSource('gee_preview', { type: 'raster', tiles: [tileFullUrl], tileSize: 256 });
        m.addLayer({ id: 'gee_overlay', type: 'raster', source: 'gee_preview', paint: { 'raster-opacity': 0.82 } });
      };
      if (m.isStyleLoaded()) {
        applyOverlay();
      } else {
        m.once('load', applyOverlay);
      }
    }
  }, [step, selectedPresetId, previewCmap, previewTileUrl, activeAreaBbox.join(','), tanggalMulai, tanggalAkhir]);

  const activeDownloadJob = lastJobId ? jobs.find((j) => j.id === lastJobId) || null : null;

  useEffect(() => {
    if (activeDownloadJob?.status === 'succeeded') {
      refreshGeeStatus();
      const createdId = activeDownloadJob.outputs?.id;
      if (createdId) setActiveLayerId(createdId);
    }
  }, [activeDownloadJob?.status, activeDownloadJob?.id]);

  const handleStartDownload = async () => {
    if (!geeStatus?.connected) {
      addToast({
        type: 'warning',
        title: 'Hubungkan Earth Engine terlebih dahulu',
        message: 'Kelola koneksi & ID Project Google Cloud Anda di menu Pengaturan.',
      });
      setActiveTab('settings');
      return;
    }
    try {
      const res = await api.geeFetch({
        project_id: projectId,
        preset_id: selectedPresetId,
        layer_id: areaSource === 'layer' ? areaLayerId : undefined,
        bbox: activeAreaBbox,
        scale: scaleM,
        tanggal_mulai: tanggalMulai,
        tanggal_akhir: tanggalAkhir,
        buang_awan: buangAwan,
        batas_awan: batasAwan,
        output_name: outputName || undefined,
        custom_dataset_id: selectedPresetId === 'gee.custom' ? customDatasetId : undefined,
        custom_expr: selectedPresetId === 'gee.custom' ? customExpr : undefined,
      });
      setLastJobId(res.job_id);
      setStep(5);
      addToast({
        type: 'info',
        title: `Mengunduh ${selectedPreset?.name}...`,
        message: 'Progress real-time dipantau langsung melalui WebSocket.',
      });
    } catch (err: any) {
      addToast({ type: 'error', title: err.message || 'Gagal mengunduh', message: err.hint });
    }
  };

  const plan = estimateData?.plan;
  const scenes = estimateData?.scenes;

  const pythonSnippet = `import ee
ee.Initialize(project="${geeStatus?.project_id || 'PROJECT_CLOUD_ANDA'}")

area = ee.Geometry.Rectangle([${activeAreaBbox.map((x) => x.toFixed(4)).join(', ')}])
col = (ee.ImageCollection("${selectedPreset?.dataset_id || 'COPERNICUS/S2_SR_HARMONIZED'}")
       .filterBounds(area)
       .filterDate("${tanggalMulai}", "${tanggalAkhir}"))
# Masking awan (${batasAwan}%) & komposit median
img = col.median().clip(area)
url = img.getDownloadURL({"scale": ${scaleM}, "region": area, "format": "GEO_TIFF"})
print("URL Unduhan GeoTIFF:", url)`;

  return (
    <div className={`h-full overflow-y-auto ${embedded ? 'p-4' : 'p-6'} space-y-5 max-w-7xl mx-auto text-xs`}>
      {/* Header + Status & Quota Panel (§6.4) */}
      <div className="p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-slate-900 dark:bg-teal-700 text-white flex items-center justify-center">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base tracking-tight">Katalog Bumi — Google Earth Engine</h1>
            <p className="text-[11px] text-slate-500">
              Ambil citra satelit siap pakai (Sentinel-2, Landsat, DEM, WorldCover, CHIRPS), simpan sebagai COG lokal, olah offline dengan Python.
            </p>
          </div>
        </div>

        {/* Status & Quota Indicator */}
        <div className="flex flex-wrap items-center gap-3">
          {geeStatus?.connected ? (
            <div className="px-3 py-1.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                Terhubung · <b>{geeStatus.project_id}</b> · Cache: {formatBytes(geeStatus.cache_bytes)}
              </span>
              <a
                href={geeStatus.quota_url}
                target="_blank"
                rel="noreferrer"
                className="underline ml-1 text-[11px]"
              >
                Lihat kuota
              </a>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-300 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Earth Engine belum terhubung</span>
              <button
                onClick={() => setActiveTab('settings')}
                className="underline ml-1"
              >
                Buka Pengaturan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Single-Source-of-Truth Redirect Banner if Not Connected (Auth managed exclusively in Pengaturan) */}
      {!geeStatus?.connected && (
        <div className="p-4 rounded-md bg-slate-900 text-slate-100 border border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-sm text-white">
              <ShieldCheck className="w-4 h-4 text-orange-400" />
              <span>Google Earth Engine Belum Terhubung</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Kelola ID Project Google Cloud, login OAuth, atau kunci Service Account di satu tempat melalui menu Pengaturan.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('settings')}
            className="px-4 py-2 rounded bg-teal-700 hover:bg-teal-600 text-white flex items-center gap-1.5 shrink-0"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Hubungkan di Pengaturan →</span>
          </button>
        </div>
      )}

      {/* 5-Step Wizard Navigation (§6.2) */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-slate-800 p-2 rounded-md border border-slate-200/80 dark:border-slate-700">
        {[
          { n: 1, label: '1. Area Cakupan' },
          { n: 2, label: '2. Pilih Data Satelit' },
          { n: 3, label: '3. Waktu & Awan' },
          { n: 4, label: '4. Pratinjau & Estimasi' },
          { n: 5, label: '5. Unduh Layer' },
        ].map((s) => (
          <button
            key={s.n}
            onClick={() => setStep(s.n as any)}
            className={`px-3.5 py-1.5 rounded transition ${
 step === s.n
 ? 'bg-slate-900 dark:bg-teal-700 text-white'
 : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
 }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* STEP 1: AREA */}
      {step === 1 && (
        <div className="p-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 space-y-4 max-w-3xl">
          <h2 className="text-base">Langkah 1 — Pilih Cakupan Area Unduhan</h2>
          <p className="text-slate-500">
            Luas area menentukan ukuran piksel unduhan. PetaLab akan menghitung estimasi ukuran dan memecah area luas menjadi petak secara otomatis.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => setAreaSource('layer')}
              className={`px-3.5 py-2 rounded border ${
 areaSource === 'layer'
 ? 'border-slate-900 dark:border-teal-600 bg-slate-50 dark:bg-teal-950/30'
 : 'border-slate-200 dark:border-slate-700'
 }`}
            >
              Dari Batas Layer Proyek
            </button>
            <button
              onClick={() => setAreaSource('custom_bbox')}
              className={`px-3.5 py-2 rounded border ${
 areaSource === 'custom_bbox'
 ? 'border-slate-900 dark:border-teal-600 bg-slate-50 dark:bg-teal-950/30'
 : 'border-slate-200 dark:border-slate-700'
 }`}
            >
              Koordinat Kotak Manual (BBox)
            </button>
          </div>

          {areaSource === 'layer' ? (
            <div>
              <label className="block mb-1 text-slate-500">Pilih Layer Acuan Wilayah</label>
              <select
                value={areaLayerId}
                onChange={(e) => setAreaLayerId(e.target.value)}
                className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
              >
                {spatialLayers.map((l) => (
                  <option key={l.id} value={l.id} className="dark:bg-slate-800">
                    {l.name} ({l.geom_type || l.kind} · {l.feature_count} fitur)
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {['Min Lon (Barat)', 'Min Lat (Selatan)', 'Max Lon (Timur)', 'Max Lat (Utara)'].map((lbl, idx) => (
                <div key={lbl}>
                  <label className="block text-[11px] text-slate-500 mb-1">{lbl}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={customBbox[idx]}
                    onChange={(e) => {
                      const next = [...customBbox] as [number, number, number, number];
                      next[idx] = Number(e.target.value);
                      setCustomBbox(next);
                    }}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent tabular-nums"
                  />
                </div>
              ))}
            </div>
          )}

          {plan && (
            <div className="p-3.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-slate-500">Luas Cakupan Area:</span>{' '}
                <span className="text-sm text-teal-700 dark:text-teal-400 tabular-nums">
                  {formatNumber(plan.area_km2, 2)} km²
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                BBox: [{activeAreaBbox.map((x) => x.toFixed(4)).join(', ')}]
              </span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2.5 rounded bg-slate-900 dark:bg-teal-700 text-white"
            >
              Lanjut ke Pilih Data Satelit →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: DATA PRESETS CATALOG (§6.3) */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base">Langkah 2 — Pilih Produk Satelit Katalog Bumi</h2>
            <div className="relative w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Cari: "hijau", "panas", "tinggi", "hujan", "malam"...'
                className="w-full pl-8 pr-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {catalogItems.map((item) => {
              const isSelected = selectedPresetId === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedPresetId(item.id)}
                  className={`p-4 rounded-md border transition cursor-pointer flex flex-col justify-between ${
 isSelected
 ? 'border-slate-900 dark:border-teal-600 bg-slate-50 dark:bg-teal-950/30 shadow-sm'
 : 'border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400'
 }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        Resolusi asli {item.native_scale_m} m
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {item.dated ? 'Multi-waktu' : 'Global statis'}
                      </span>
                    </div>
                    <h3 className="text-sm text-slate-900 dark:text-white">{item.name}</h3>
                    <div className="text-[11px] font-mono text-teal-700 dark:text-teal-400">{item.dataset_id}</div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{item.description}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[10px] text-slate-400">
                    <div>Dipakai untuk: {item.use_case}</div>
                    <div className="mt-0.5 truncate">Atribusi: {item.attribution}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedPresetId === 'gee.custom' && (
            <div className="p-4 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-slate-500">ID Dataset / ImageCollection GEE</label>
                <input
                  type="text"
                  value={customDatasetId}
                  onChange={(e) => setCustomDatasetId(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block mb-1 text-slate-500">Ekspresi Band / Indeks</label>
                <input
                  type="text"
                  value={customExpr}
                  onChange={(e) => setCustomExpr(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono"
                />
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="px-4 py-2 rounded border border-slate-300 dark:border-slate-600">
              ← Kembali
            </button>
            <button
              onClick={() => setStep(selectedPreset?.dated ? 3 : 4)}
              className="px-5 py-2.5 rounded bg-slate-900 dark:bg-teal-700 text-white"
            >
              Lanjut ke {selectedPreset?.dated ? 'Waktu & Awan' : 'Pratinjau & Estimasi'} →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: WAKTU & MASKING AWAN (Khusus Indonesia §6.2) */}
      {step === 3 && (
        <div className="p-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 space-y-4 max-w-3xl">
          <h2 className="text-base">Langkah 3 — Rentang Waktu & Penghapusan Awan ({selectedPreset?.name})</h2>

          <div className="flex flex-wrap gap-2">
            {DATE_PRESETS.map((dp) => (
              <button
                key={dp.id}
                onClick={() => {
                  setTanggalMulai(dp.start);
                  setTanggalAkhir(dp.end);
                }}
                className="px-3 py-1.5 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-xs"
              >
                {dp.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 text-slate-500">Dari Tanggal</label>
              <input
                type="date"
                value={tanggalMulai}
                onChange={(e) => setTanggalMulai(e.target.value)}
                className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
              />
            </div>
            <div>
              <label className="block mb-1 text-slate-500">Sampai Tanggal</label>
              <input
                type="date"
                value={tanggalAkhir}
                onChange={(e) => setTanggalAkhir(e.target.value)}
                className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
              />
            </div>
          </div>

          {/* Mandatory visible Cloud Masking block for Indonesia */}
          <div className="p-4 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={buangAwan}
                onChange={(e) => setBuangAwan(e.target.checked)}
                className="rounded accent-slate-900 w-4 h-4"
              />
              <span>Buang piksel berawan otomatis (disarankan untuk wilayah Indonesia)</span>
            </label>

            <div className="flex items-center gap-3">
              <span className="text-slate-500">Batas awan maksimum per citra:</span>
              <input
                type="number"
                min={5}
                max={100}
                value={batasAwan}
                onChange={(e) => setBatasAwan(Number(e.target.value))}
                className="w-20 p-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 tabular-nums"
              />
              <span>%</span>
            </div>

            <div className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300">
              <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <span>
                Indonesia sering tertutup awan. PetaLab menggabungkan beberapa citra dalam rentang tanggal ini dan mengambil nilai tengahnya (komposit median) supaya hasilnya bersih. Rentang 2–3 bulan biasanya cukup.
              </span>
            </div>

            {scenes && (
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>{scenes.summary}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="px-4 py-2 rounded border border-slate-300 dark:border-slate-600">
              ← Kembali
            </button>
            <button
              onClick={() => setStep(4)}
              className="px-5 py-2.5 rounded bg-slate-900 dark:bg-teal-700 text-white"
            >
              Lanjut ke Pratinjau Peta →
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: INSTANT TILE PREVIEW & PRE-DOWNLOAD SIZE/TILE ESTIMATION (§6.2, §7.2, §7.3) */}
      {step === 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Live Interactive Preview Map */}
          <div className="lg:col-span-2 p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm">Pratinjau Langsung: {selectedPreset?.name}</h2>
                <p className="text-[11px] text-slate-400">
                  Pratinjau menggunakan tile ringan — tidak mengunduh file besar dan hampir tidak memakai kuota.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Palet:</span>
                <select
                  value={previewCmap}
                  onChange={(e) => setPreviewCmap(e.target.value)}
                  className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                >
                  <option value="rdylgn">Hijau Vegetasi (NDVI)</option>
                  <option value="terrain">Terrain (Elevasi DEM)</option>
                  <option value="magma">Magma (Suhu / Cahaya)</option>
                  <option value="blues">Biru (Air / Curah Hujan)</option>
                  <option value="viridis">Viridis (Aman Buta Warna)</option>
                </select>
              </div>
            </div>

            <div ref={previewMapContainer} className="w-full h-96 rounded overflow-hidden border border-slate-200 dark:border-slate-700" />

            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Atribusi Dataset: {selectedPreset?.attribution}</span>
              <span>© OpenStreetMap contributors</span>
            </div>
          </div>

          {/* Right Estimation & Download Commit Card */}
          <div className="p-5 rounded-md bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 space-y-4 flex flex-col justify-between">
            <div className="space-y-3.5">
              <h3 className="text-sm">Estimasi & Pengaturan Unduhan</h3>

              <div>
                <label className="block mb-1 text-slate-500">
                  Resolusi Piksel / Scale (meter — asli {selectedPreset?.native_scale_m} m)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={scaleM}
                    onChange={(e) => setScaleM(Number(e.target.value))}
                    className="flex-1 p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent tabular-nums"
                  />
                  {selectedPreset && scaleM < selectedPreset.native_scale_m && (
                    <button
                      onClick={() => setScaleM(selectedPreset.native_scale_m)}
                      className="px-2.5 py-2 rounded bg-orange-100 text-orange-900 text-[11px]"
                    >
                      Pakai {selectedPreset.native_scale_m} m
                    </button>
                  )}
                </div>
                {plan?.scale_warning && (
                  <p className="text-[11px] text-orange-600 mt-1">{plan.scale_warning}</p>
                )}
              </div>

              <div>
                <label className="block mb-1 text-slate-500">Nama Layer Hasil (Opsional)</label>
                <input
                  type="text"
                  value={outputName}
                  onChange={(e) => setOutputName(e.target.value)}
                  placeholder={`gee_${selectedPresetId.replace('gee.', '')}_${tanggalMulai.slice(0, 7).replace('-', '')}`}
                  className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                />
              </div>

              {/* Mandatory Pre-Download Estimate Box (§7.2) */}
              {plan && (
                <div className="p-3.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1.5 tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Perkiraan Ukuran:</span>
                    <span>{formatNumber(plan.est_mb, 2)} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dimensi Grid:</span>
                    <span>
                      {formatNumber(plan.width_px)} × {formatNumber(plan.height_px)} piksel
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Jalur Pengambilan:</span>
                    <span>
                      {plan.n_tiles > 1
                        ? `Berpetak otomatis (${plan.n_tiles} bagian)`
                        : 'Unduh langsung (1 bagian)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Perkiraan Waktu:</span>
                    <span>
                      {plan.est_seconds_min}–{plan.est_seconds_max} detik
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowPython(!showPython)}
                className="w-full py-2 rounded border border-slate-300 dark:border-slate-600 flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>{showPython ? 'Sembunyikan Kode Python (ee)' : 'Lihat & Salin Kode Python (ee)'}</span>
              </button>

              {showPython && (
                <div className="rounded bg-slate-900 border border-slate-700 overflow-hidden">
                  <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-800 text-[10px] text-slate-400">
                    <span>Python Earth Engine API</span>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(pythonSnippet);
                        addToast({ type: 'success', title: 'Kode Python (ee) disalin ke clipboard' });
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                    >
                      Salin Kode
                    </button>
                  </div>
                  <pre className="p-2.5 text-teal-300 font-mono text-[10px] overflow-x-auto max-h-36">
                    {pythonSnippet}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setStep(selectedPreset?.dated ? 3 : 2)}
                className="px-3.5 py-2.5 rounded border border-slate-300 dark:border-slate-600"
              >
                ← Ubah
              </button>
              <button
                onClick={handleStartDownload}
                disabled={Boolean(plan?.scale_warning)}
                className="flex-1 py-2.5 rounded bg-slate-900 dark:bg-teal-700 hover:opacity-90 text-white flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Download className="w-4 h-4" />
                <span>Unduh jadi Layer Lokal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: LIVE WEBSOCKET JOB TRACKER & HANDOFF */}
      {step === 5 && (
        <div className="p-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 space-y-4 max-w-2xl">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400">
              {activeDownloadJob?.status === 'failed' ? (
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              ) : (
                <CheckCircle2
                  className={`w-5 h-5 ${
 activeDownloadJob?.status === 'succeeded' ? 'text-emerald-600' : 'text-teal-600'
 }`}
                />
              )}
              <h2 className="text-base text-slate-900 dark:text-white">
                {activeDownloadJob?.status === 'succeeded'
                  ? 'Unduhan Katalog Bumi Selesai'
                  : activeDownloadJob?.status === 'failed'
                  ? 'Unduhan Katalog Bumi Gagal'
                  : 'Sedang Mengunduh Citra Katalog Bumi...'}
              </h2>
            </div>
            {activeDownloadJob && (
              <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700">
                {Math.round(activeDownloadJob.progress || 0)}%
              </span>
            )}
          </div>

          {activeDownloadJob && (
            <div className="space-y-1.5">
              <div className="w-full h-2 rounded-sm bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className={`h-full transition-all ${
 activeDownloadJob.status === 'failed'
 ? 'bg-rose-500'
 : activeDownloadJob.status === 'succeeded'
 ? 'bg-emerald-500'
 : 'bg-teal-700'
 }`}
                  style={{ width: `${Math.max(8, activeDownloadJob.progress || 0)}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-500">{activeDownloadJob.message}</div>
              {activeDownloadJob.error_user && (
                <div className="p-2.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px]">
                  {activeDownloadJob.error_user}
                </div>
              )}
            </div>
          )}

          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Layer raster hasil unduhan disimpan secara permanen dalam format <b>GeoTIFF lokal</b> lengkap dengan atribusi ilmiah <i>({selectedPreset?.attribution})</i>. Setelah selesai, layer ini dapat digunakan oleh semua alat Raster, Zonal Statistics, dan Machine Learning.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              disabled={activeDownloadJob !== null && activeDownloadJob.status !== 'succeeded'}
              onClick={async () => {
                await refreshLayers();
                setActiveTab('map');
              }}
              className="px-4 py-2.5 rounded bg-slate-900 dark:bg-teal-700 text-white flex items-center gap-2 disabled:opacity-40"
            >
              <Eye className="w-4 h-4" /> Lihat Layer di Studio Peta
            </button>
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2.5 rounded border border-slate-300 dark:border-slate-600"
            >
              Ambil Dataset Lain
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
