import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  DownloadCloud,
  Eye,
  FileUp,
  GitBranch,
  Globe,
  Info,
  RotateCcw,
  Table,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { api, LayerItem } from '../api/client';
import { formatBytes, formatNumber } from '../lib/format';
import { usePetaStore } from '../stores/usePetaStore';
import { EarthCatalogPage } from './EarthCatalogPage';

export const DataPage: React.FC = () => {
  const {
    projectId,
    layers,
    dataSubTab,
    lastImportReport,
    setActiveLayerId,
    setActiveTab,
    setDataSubTab,
    setLastImportReport,
    refreshLayers,
    addToast,
  } = usePetaStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [trashedLayers, setTrashedLayers] = useState<LayerItem[]>([]);
  const [selectedInfoLayer, setSelectedInfoLayer] = useState<LayerItem | null>(null);

  // Optional Coordinate Wizard overrides
  const [crsOverride, setCrsOverride] = useState('');
  const [swapLatLon, setSwapLatLon] = useState(false);

  // OpenStreetMap Overpass Downloader state
  const [osmCategories, setOsmCategories] = useState<string[]>(['sekolah', 'rumah_sakit']);
  const [osmRefLayerId, setOsmRefLayerId] = useState('');
  const [osmCustomTag, setOsmCustomTag] = useState('');

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        if (crsOverride.trim()) fd.append('crs_override', crsOverride.trim());
        if (swapLatLon) fd.append('swap_latlon', 'true');

        const res = await api.uploadLayer(projectId, fd);
        setLastImportReport(res.report);
        setActiveLayerId(res.layer.id);
        addToast({
          type: 'success',
          title: `Layer '${res.layer.name}' berhasil diimpor!`,
          message: res.report?.summary,
        });
      }
      await refreshLayers();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: err.message || 'Gagal mengimpor file',
        message: err.hint,
      });
    } finally {
      setUploading(false);
    }
  };

  const loadTrash = async () => {
    const all = await api.listLayers(projectId, true);
    setTrashedLayers(all.filter((l) => l.deleted_at));
  };

  const handleOsmDownload = async () => {
    const refLayer = layers.find((l) => l.id === osmRefLayerId) || layers.find((l) => l.bbox);
    const bbox = refLayer?.bbox || [112.71, -7.30, 112.77, -7.24];
    try {
      const res = await api.osmDownload({
        project_id: projectId,
        bbox,
        categories: osmCategories,
        custom_tag: osmCustomTag || undefined,
      });
      addToast({
        type: 'info',
        title: 'Unduhan OpenStreetMap Dimulai',
        message: `Area ±${res.estimated_area_km2} km² sedang diproses di latar belakang.`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal mengunduh OSM', message: err.message });
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden text-xs">
      {/* Unified Sumber Data Sub-Navigation (Zero Overlap: Library | Local Upload | OSM | Earth Catalog GEE) */}
      <div className="shrink-0 px-6 py-2.5 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'library', label: `Pustaka Layer (${layers.length})`, icon: Table },
            { id: 'upload', label: 'Unggah File Lokal', icon: UploadCloud },
            { id: 'osm', label: 'Unduh OpenStreetMap', icon: DownloadCloud },
            { id: 'earth', label: 'Katalog Bumi (GEE)', icon: Globe },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = dataSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setDataSubTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
 active
 ? 'bg-slate-900 dark:bg-teal-700 text-white shadow-sm'
 : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
 }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        <span className="text-[11px] text-slate-400">
          Satu pusat akuisisi & manajemen data proyek (File Lokal, OSM, & Citra Satelit GEE)
        </span>
      </div>

      {dataSubTab === 'earth' ? (
        <div className="flex-1 overflow-hidden">
          <EarthCatalogPage embedded />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-7xl w-full mx-auto">
      {/* Drag & Drop Upload Zone (shown in 'upload' tab, plus quick compact trigger in 'library') */}
      {dataSubTab === 'upload' && (
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFileUpload(e.dataTransfer.files);
        }}
        className="p-6 rounded-md border border-dashed border-teal-500/60 dark:border-teal-800 bg-teal-50/30 dark:bg-slate-800/70 flex flex-col items-center justify-center text-center space-y-3"
      >
        <div className="w-12 h-12 rounded-md bg-teal-700 text-white flex items-center justify-center">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-medium tracking-tight text-slate-800 dark:text-slate-100">
            Tarik & Lepas File Data Spasial / Tabel ke Sini
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mendukung: <b>Shapefile (.zip)</b> · <b>GeoJSON</b> · <b>GeoPackage (.gpkg)</b> · <b>KML</b> ·{' '}
            <b>CSV / Excel (.xlsx)</b> · <b>GeoParquet</b> · <b>GeoTIFF Raster (.tif)</b>
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".zip,.shp,.geojson,.json,.gpkg,.kml,.csv,.xlsx,.xls,.parquet,.tif,.tiff"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 rounded bg-teal-700 hover:bg-teal-800 text-white font-normal"
          >
            <FileUp className="w-4 h-4" />
            <span>{uploading ? 'Sedang Membaca & Memvalidasi...' : 'Pilih File dari Komputer'}</span>
          </button>

          <input
            type="text"
            value={crsOverride}
            onChange={(e) => setCrsOverride(e.target.value)}
            placeholder="CRS Manual (opsional, mis: EPSG:4326)"
            className="px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 w-56"
          />

          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={swapLatLon}
              onChange={(e) => setSwapLatLon(e.target.checked)}
              className="rounded accent-teal-700"
            />
            <span>Tukar Lintang/Bujur jika terbalik</span>
          </label>
        </div>
      </div>
      )}

      {/* Beginner-Friendly Import Report Card */}
      {lastImportReport && (dataSubTab === 'upload' || dataSubTab === 'library') && (
        <div className="p-4 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium tracking-tight text-sm text-emerald-900 dark:text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Laporan Impor: {lastImportReport.layer_name} berhasil dibaca</span>
            </div>
            <button onClick={() => setLastImportReport(null)} aria-label="Tutup Laporan Impor" className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-emerald-800 dark:text-emerald-300 font-medium">• {lastImportReport.summary}</p>
          {(lastImportReport.fixes_applied || []).map((fix: string, idx: number) => (
            <p key={idx} className="text-orange-800 dark:text-orange-300 font-medium">
               {fix}
            </p>
          ))}
          {(lastImportReport.tips || []).map((tip: string, idx: number) => (
            <p key={idx} className="text-teal-800 dark:text-teal-300">
               {tip}
            </p>
          ))}
        </div>
      )}

      {/* Pustaka Layer Aktif + Panel Info Lineage */}
      {dataSubTab === 'library' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium tracking-tight">Pustaka Layer Proyek ({layers.length})</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDataSubTab('upload')}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-teal-700 text-white text-xs hover:bg-teal-800"
              >
                <FileUp className="w-3.5 h-3.5" /> + Unggah File
              </button>
              <button
                onClick={async () => {
                  if (!showTrash) await loadTrash();
                  setShowTrash(!showTrash);
                }}
                className="flex items-center gap-1 text-xs font-normal text-slate-500 hover:text-teal-700"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{showTrash ? 'Tutup Sampah' : 'Lihat Sampah (Pulihkan Layer)'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {layers.map((lyr) => (
              <div
                key={lyr.id}
                className="p-3.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-normal uppercase bg-teal-50 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300">
                      {lyr.geom_type || lyr.kind}
                    </span>
                    <h4 className="font-normal text-sm">{lyr.name}</h4>
                  </div>
                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3">
                    <span>
                      <b>{formatNumber(lyr.feature_count)}</b> {lyr.kind === 'raster' ? 'band' : 'fitur'}
                    </span>
                    <span>• CRS: {lyr.crs || 'Non-spasial'}</span>
                    <span>• Ukuran kerja: {formatBytes(lyr.size_bytes)}</span>
                    {lyr.lineage?.tool_name && (
                      <span className="text-teal-700 dark:text-teal-400 font-medium">
                        • Asal: {lyr.lineage.tool_name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {lyr.kind !== 'table' && (
                    <button
                      onClick={() => {
                        setActiveLayerId(lyr.id);
                        setActiveTab('map');
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-teal-700 text-white font-normal hover:bg-teal-800"
                    >
                      <Eye className="w-3.5 h-3.5" /> Lihat di Peta
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setActiveLayerId(lyr.id);
                      setActiveTab('table');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium"
                  >
                    <Table className="w-3.5 h-3.5" /> Tabel
                  </button>
                  <button
                    onClick={() => setSelectedInfoLayer(lyr)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium"
                  >
                    <Info className="w-3.5 h-3.5" /> Info & Asal-usul
                  </button>
                  <button
                    onClick={async () => {
                      await api.duplicateLayer(lyr.id, projectId);
                      await refreshLayers();
                      addToast({ type: 'success', title: `Layer '${lyr.name}' diduplikasi` });
                    }}
                    className="p-1.5 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                    title="Duplikat Layer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={async () => {
                      await api.deleteLayer(lyr.id, projectId);
                      await refreshLayers();
                      if (showTrash) await loadTrash();
                      addToast({
                        type: 'info',
                        title: `Layer '${lyr.name}' dipindahkan ke Sampah`,
                        message: 'Dapat dipulihkan kapan saja dalam 7 hari.',
                      });
                    }}
                    className="p-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50"
                    title="Pindahkan ke Sampah"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Trash Bin Recovery */}
          {showTrash && (
            <div className="p-4 rounded-md bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 space-y-2">
              <h4 className="font-normal text-slate-700 dark:text-slate-200"> Sampah Layer (Soft Delete 7 Hari)</h4>
              {trashedLayers.length === 0 ? (
                <p className="text-slate-500">Sampah kosong.</p>
              ) : (
                trashedLayers.map((tl) => (
                  <div key={tl.id} className="flex items-center justify-between bg-white dark:bg-slate-800 p-2.5 rounded">
                    <span>
                      <b>{tl.name}</b> (dihapus {tl.deleted_at?.slice(0, 19)})
                    </span>
                    <button
                      onClick={async () => {
                        await api.restoreLayer(tl.id, projectId);
                        await refreshLayers();
                        await loadTrash();
                        addToast({ type: 'success', title: `Layer '${tl.name}' berhasil dipulihkan!` });
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-teal-700 hover:bg-teal-800 text-white font-normal"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Pulihkan
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right Column: Layer Info & Lineage Inspector */}
        <div className="space-y-4">
          {selectedInfoLayer ? (
            <div className="p-4 rounded-md bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-normal text-sm">Detail & Asal-usul Layer</h4>
                <button onClick={() => setSelectedInfoLayer(null)} aria-label="Tutup Detail Layer" className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1 text-[11px]">
                <div>
                  <b>Nama:</b> {selectedInfoLayer.name}
                </div>
                <div>
                  <b>File Internal:</b> <code className="font-mono">{selectedInfoLayer.path}</code>
                </div>
                {selectedInfoLayer.bbox && (
                  <div>
                    <b>Bounding Box:</b> [{selectedInfoLayer.bbox.map((x) => x.toFixed(4)).join(', ')}]
                  </div>
                )}
                <div className="p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 mt-2">
                  <div className="font-normal flex items-center gap-1 text-teal-700 mb-1">
                    <GitBranch className="w-3.5 h-3.5" /> Lineage (Riwayat Asal-usul):
                  </div>
                  <pre className="text-[10px] whitespace-pre-wrap font-mono overflow-x-auto">
                    {JSON.stringify(selectedInfoLayer.lineage, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 space-y-2">
              <h4 className="text-sm text-slate-800 dark:text-slate-200">Inspektor Asal-usul Layer</h4>
              <p className="text-[11px] leading-relaxed">
                Klik tombol <b>Info &amp; Asal-usul</b> pada salah satu layer di sebelah kiri untuk melihat CRS, bounding box, sumber dataset, dan atribusi ilmiahnya.
              </p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* OpenStreetMap Overpass Downloader Tab */}
      {dataSubTab === 'osm' && (
          <div className="max-w-2xl p-5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-teal-700" />
              <div>
                <h3 className="font-normal text-sm">Unduh Data Vektor dari OpenStreetMap</h3>
                <p className="text-[11px] text-slate-500">Overpass API live (garis jalan/sungai, poligon bangunan/taman, &amp; titik fasilitas)</p>
              </div>
            </div>

            <div>
              <label className="block font-normal mb-1">1. Batas Wilayah Unduhan</label>
              <select
                value={osmRefLayerId}
                onChange={(e) => setOsmRefLayerId(e.target.value)}
                className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
              >
                {layers
                  .filter((l) => l.bbox)
                  .map((l) => (
                    <option key={l.id} value={l.id} className="dark:bg-slate-800">
                      Sesuai cakupan: {l.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block font-normal mb-1">2. Pilih Kategori Objek OSM</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'jalan', label: 'Jalan (Garis)' },
                  { id: 'bangunan', label: 'Bangunan (Poligon)' },
                  { id: 'sungai', label: 'Sungai (Garis)' },
                  { id: 'sekolah', label: 'Sekolah (Titik)' },
                  { id: 'rumah_sakit', label: 'Rumah Sakit (Titik)' },
                  { id: 'taman', label: 'Taman (Poligon)' },
                  { id: 'tempat_ibadah', label: 'Tempat Ibadah (Titik)' },
                ].map((cat) => (
                  <label
                    key={cat.id}
                    className="flex items-center gap-1.5 p-1.5 rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={osmCategories.includes(cat.id)}
                      onChange={(e) => {
                        if (e.target.checked) setOsmCategories([...osmCategories, cat.id]);
                        else setOsmCategories(osmCategories.filter((x) => x !== cat.id));
                      }}
                      className="rounded accent-teal-700"
                    />
                    <span>{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleOsmDownload}
              disabled={osmCategories.length === 0}
              className="w-full py-2.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-normal flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>Unduh &amp; Jadikan Layer</span>
            </button>
          </div>
      )}
        </div>
      )}
    </div>
  );
};
