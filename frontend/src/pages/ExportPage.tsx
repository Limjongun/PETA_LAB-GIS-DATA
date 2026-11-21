import React, { useState } from 'react';
import {
  Archive,
  Code2,
  Compass,
  Download,
  FileSpreadsheet,
  Printer,
} from 'lucide-react';
import { api } from '../api/client';
import { usePetaStore } from '../stores/usePetaStore';
import { MapView } from '../components/map/MapView';

export const ExportPage: React.FC = () => {
  const { projectId, project, layers, activeLayerId, selectionsByLayer, addToast } = usePetaStore();

  const [selectedLayerId, setSelectedLayerId] = useState(activeLayerId || layers[0]?.id || '');
  const [exportFormat, setExportFormat] = useState('gpkg');
  const [csvDelimiter, setCsvDelimiter] = useState<';' | ','>(';');
  const [onlySelected, setOnlySelected] = useState(false);
  const [pyScript, setPyScript] = useState('');

  // Print Layout Settings
  const [mapTitle, setMapTitle] = useState(project?.name || 'Peta Tematik Analisis Spasial');
  const [mapSubtitle, setMapSubtitle] = useState('Dibuat dengan PetaLab GIS Web · Proyeksi WGS 84 (Metrik UTM Otomatis)');
  const [mapAuthor, setMapAuthor] = useState('Laboratorium Spasial PetaLab');

  const targetLayer = layers.find((l) => l.id === selectedLayerId) || layers[0];
  const selFids = (targetLayer && selectionsByLayer[targetLayer.id]) || [];

  // Collect all unique dataset attributions from project layers (including GEE Earth Catalog layers, §15.2)
  const datasetAttributions = Array.from(
    new Set(
      layers
        .map((l) => l.lineage?.extra?.atribusi || l.lineage?.atribusi)
        .filter((a): a is string => Boolean(a))
    )
  );

  const handleExportLayer = async () => {
    if (!targetLayer) return;
    try {
      const res = await api.exportResource({
        project_id: projectId,
        export_type: 'layer',
        layer_id: targetLayer.id,
        format: targetLayer.kind === 'raster' ? 'tif' : exportFormat,
        csv_delimiter: csvDelimiter,
        only_selected_fids: onlySelected && selFids.length > 0 ? selFids : undefined,
      });
      window.open(res.download_url, '_blank');
      addToast({ type: 'success', title: `File '${res.filename}' siap diunduh!` });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal mengekspor layer', message: err.message });
    }
  };

  const handleExportProjectZip = async () => {
    try {
      const res = await api.exportResource({
        project_id: projectId,
        export_type: 'project_zip',
      });
      window.open(res.download_url, '_blank');
      addToast({ type: 'success', title: 'Arsip proyek (.petalab.zip) berhasil dibuat!' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal mengekspor proyek', message: err.message });
    }
  };

  const handleGeneratePythonScript = async () => {
    try {
      const res = await api.exportResource({
        project_id: projectId,
        export_type: 'python_script',
      });
      setPyScript(res.script || '');
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal membuat skrip Python', message: err.message });
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto text-xs">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Layer, Project & Reproducibility Exporter */}
        <div className="space-y-4">
          <div className="p-5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-teal-700" />
              <h2 className="text-sm font-medium tracking-tight">Ekspor Layer Vektor / Raster / Tabel</h2>
            </div>

            <div>
              <label className="block font-normal mb-1">Pilih Layer</label>
              <select
                value={targetLayer?.id || ''}
                onChange={(e) => setSelectedLayerId(e.target.value)}
                className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent font-normal"
              >
                {layers.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.kind})
                  </option>
                ))}
              </select>
            </div>

            {targetLayer?.kind !== 'raster' && (
              <div>
                <label className="block font-normal mb-1">Format File Ekspor</label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                >
                  <option value="gpkg">GeoPackage (.gpkg — Disarankan)</option>
                  <option value="geojson">GeoJSON (.geojson)</option>
                  <option value="shp.zip">ESRI Shapefile (.shp.zip)</option>
                  <option value="csv">CSV (+ Kolom long, lat &amp; WKT)</option>
                  <option value="xlsx">Microsoft Excel (.xlsx — Rapi per Kolom + long/lat)</option>
                  <option value="parquet">GeoParquet (.parquet)</option>
                </select>
                {exportFormat === 'csv' && (
                  <div className="mt-2">
                    <label className="block text-[11px] text-slate-500 mb-1">Pemisah Kolom CSV</label>
                    <select
                      value={csvDelimiter}
                      onChange={(e) => setCsvDelimiter(e.target.value as ';' | ',')}
                      className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent text-[11px]"
                    >
                      <option value=";" className="dark:bg-slate-800">Titik Koma (;) — Rapi di Excel Indonesia</option>
                      <option value="," className="dark:bg-slate-800">Koma (,) — Standar GIS / Python / QGIS</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={onlySelected}
                onChange={(e) => setOnlySelected(e.target.checked)}
                className="rounded accent-teal-700"
              />
              <span>Hanya fitur terpilih ({selFids.length} fitur)</span>
            </label>

            <button
              onClick={handleExportLayer}
              className="w-full py-2.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-normal flex items-center justify-center gap-2 shadow"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Layer Sekarang</span>
            </button>
          </div>

          {/* Export Whole Project & Python Reproducibility */}
          <div className="p-5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <h3 className="font-medium tracking-tight text-sm"> Paket Proyek & Reproduksi</h3>
            <button
              onClick={handleExportProjectZip}
              className="w-full py-2 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-normal flex items-center justify-center gap-2"
            >
              <Archive className="w-4 h-4 text-orange-600" />
              <span>Ekspor Seluruh Proyek (.petalab.zip)</span>
            </button>

            <button
              onClick={handleGeneratePythonScript}
              className="w-full py-2 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-normal flex items-center justify-center gap-2"
            >
              <Code2 className="w-4 h-4 text-teal-700" />
              <span>Buat Skrip Python dari Riwayat</span>
            </button>

            {pyScript && (
              <pre className="p-3 rounded bg-slate-900 text-teal-300 font-mono text-[10px] overflow-x-auto max-h-44">
                {pyScript}
              </pre>
            )}
          </div>
        </div>

        {/* Right 2 Columns: Print-Ready Map Layout (A4 Landscape/Portrait) */}
        <div className="lg:col-span-2 p-5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-medium tracking-tight"> Layout Cetak Peta Siap Laporan (A4)</h2>
              <p className="text-[11px] text-slate-500">
                Dilengkapi Judul, Panah Utara, Skala, Legenda Otomatis, dan Atribusi Sumber Data
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 rounded bg-orange-600 hover:bg-orange-700 text-white font-normal"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Peta / Simpan PDF</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <input
              type="text"
              value={mapTitle}
              onChange={(e) => setMapTitle(e.target.value)}
              placeholder="Judul Peta"
              className="p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent font-normal"
            />
            <input
              type="text"
              value={mapSubtitle}
              onChange={(e) => setMapSubtitle(e.target.value)}
              placeholder="Sub-judul / CRS"
              className="p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
            />
            <input
              type="text"
              value={mapAuthor}
              onChange={(e) => setMapAuthor(e.target.value)}
              placeholder="Sumber / Pembuat"
              className="p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
            />
          </div>

          {/* Printable Map Sheet Frame */}
          <div className="p-4 rounded border border-slate-800 dark:border-slate-500 bg-white dark:bg-slate-900 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <div>
                <h3 className="text-base font-medium tracking-tight text-slate-900 dark:text-white">{mapTitle}</h3>
                <p className="text-[11px] text-slate-500">{mapSubtitle}</p>
              </div>
              <div className="flex flex-col items-center justify-center px-3 py-1 rounded border border-slate-300 dark:border-slate-700">
                <span className="text-[10px] font-normal">UTARA</span>
                <Compass className="w-5 h-5 text-slate-800 dark:text-slate-200" />
              </div>
            </div>

            <div className="h-96 w-full rounded overflow-hidden border border-slate-300 dark:border-slate-700">
              <MapView compact />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 pt-1">
              <span>
                Sumber Data: © OpenStreetMap contributors
                {datasetAttributions.length > 0 ? ` · ${datasetAttributions.join(' · ')}` : ''} · {mapAuthor}
              </span>
              <span>Tanggal Cetak: {new Date().toLocaleDateString('id-ID')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
