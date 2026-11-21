import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Code2,
  Eye,
  Info,
  Play,
  Search,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { api, ToolFieldSchema, ToolSchema } from '../api/client';
import { usePetaStore } from '../stores/usePetaStore';

export const ProcessingPage: React.FC = () => {
  const {
    projectId,
    layers,
    tools,
    selectedToolId,
    selectionsByLayer,
    mode,
    setSelectedToolId,
    setPreviewGeoJSON,
    setActiveTab,
    addToast,
  } = usePetaStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<string>('Semua');
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pythonSnippet, setPythonSnippet] = useState<string>('');
  const [previewResult, setPreviewResult] = useState<any | null>(null);
  const [runningPreview, setRunningPreview] = useState(false);

  // Anti-overlap: keep GEE satellite downloaders in Sumber Data -> Katalog Bumi and Clustering in Model ML
  // (gee.zonal_direct remains here because it is a vector-to-raster spatial analysis operation!)
  const canonicalTools = tools.filter(
    (t) => t.id !== 'stats.clustering' && (!t.id.startsWith('gee.') || t.id === 'gee.zonal_direct')
  );

  const selectedTool: ToolSchema | null =
    canonicalTools.find((t) => t.id === selectedToolId) || canonicalTools[0] || null;

  // Populate default form values whenever selected tool or layers change
  useEffect(() => {
    if (!selectedTool) return;
    const defaults: Record<string, any> = {};
    const vectorLayers = layers.filter((l) => l.kind === 'vector');
    const rasterLayers = layers.filter((l) => l.kind === 'raster');

    selectedTool.fields.forEach((f) => {
      if (f.type === 'layer') {
        if (f.kind === 'raster') {
          const r = rasterLayers[0];
          defaults[f.name] = r ? { id: r.id, name: r.name } : { id: '', name: '' };
        } else {
          // Match preferred geometry if specified
          const preferred = f.geom
            ? vectorLayers.find((l) => l.geom_type && f.geom?.includes(l.geom_type)) || vectorLayers[0]
            : vectorLayers[0];
          defaults[f.name] = preferred ? { id: preferred.id, name: preferred.name } : { id: '', name: '' };
        }
      } else if (f.column_of) {
        const refLayerId = defaults[f.column_of]?.id || vectorLayers[0]?.id;
        const refLayer = layers.find((l) => l.id === refLayerId);
        const numCol = refLayer?.schema.find((s) => s.type === 'number' || s.type === 'integer')?.name;
        defaults[f.name] = numCol || refLayer?.schema[0]?.name || '';
      } else {
        defaults[f.name] = f.default ?? '';
      }
    });
    setFormValues(defaults);
    setPythonSnippet('');
    setPreviewResult(null);
  }, [selectedTool?.id, projectId, layers.map((l) => l.id).join(',')]);

  const groups = ['Semua', ...Array.from(new Set(canonicalTools.map((t) => t.group)))];

  const filteredTools = canonicalTools.filter((t) => {
    const matchGroup = activeGroup === 'Semua' || t.group === activeGroup;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.technical_name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q);
    return matchGroup && matchSearch;
  });

  const handlePreview = async () => {
    if (!selectedTool) return;
    setRunningPreview(true);
    try {
      const res = await api.previewTool(selectedTool.id, {
        project_id: projectId,
        params: formValues,
        selected_fids_by_layer: selectionsByLayer,
      });
      setPreviewResult(res.preview);
      setPythonSnippet(res.python_code);
      if (res.geojson) {
        setPreviewGeoJSON(res.geojson);
        addToast({
          type: 'info',
          title: 'Pratinjau Siap di Peta',
          message: `Pratinjau (${res.preview?.feature_count || 'sampel'} fitur) ditampilkan dengan garis tosca putus-putus di Peta.`,
        });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Pratinjau belum berhasil', message: err.message, hint: err.hint });
    } finally {
      setRunningPreview(false);
    }
  };

  const handleRunFull = async () => {
    if (!selectedTool) return;
    try {
      const res = await api.runTool(selectedTool.id, {
        project_id: projectId,
        params: formValues,
        selected_fids_by_layer: selectionsByLayer,
      });
      setPythonSnippet(res.python_code);
      setPreviewGeoJSON(null);
      addToast({
        type: 'info',
        title: `Menjalankan ${selectedTool.name}...`,
        message: 'Progress dapat dipantau di Job Tray kanan bawah.',
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal menjalankan tool', message: err.message });
    }
  };

  const renderFieldInput = (field: ToolFieldSchema) => {
    const val = formValues[field.name];

    if (field.type === 'layer') {
      const eligibleLayers = layers.filter((l) =>
        field.kind === 'raster' ? l.kind === 'raster' : l.kind === 'vector'
      );
      return (
        <select
          value={val?.id || ''}
          onChange={(e) => {
            const lyr = layers.find((l) => l.id === e.target.value);
            setFormValues({
              ...formValues,
              [field.name]: lyr ? { id: lyr.id, name: lyr.name } : { id: '', name: '' },
            });
          }}
          className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-medium"
        >
          <option value="">-- Pilih Layer --</option>
          {eligibleLayers.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({l.geom_type || l.kind} · {l.feature_count})
            </option>
          ))}
        </select>
      );
    }

    if (field.column_of) {
      const targetLayerId = formValues[field.column_of]?.id;
      const targetLayer = layers.find((l) => l.id === targetLayerId) || layers[0];
      const cols = (targetLayer?.schema || []).filter((s) => s.name !== '_fid');
      return (
        <select
          value={val || ''}
          onChange={(e) => setFormValues({ ...formValues, [field.name]: e.target.value || null })}
          className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
        >
          <option value="">-- Pilih Kolom --</option>
          {cols.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name} ({c.type})
            </option>
          ))}
        </select>
      );
    }

    if (field.enum && field.enum.length > 0) {
      return (
        <select
          value={val ?? field.default ?? ''}
          onChange={(e) => setFormValues({ ...formValues, [field.name]: e.target.value })}
          className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
        >
          {field.enum.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === 'boolean') {
      const primaryLayerId = formValues.input?.id || formValues.target?.id || formValues.polygons?.id || formValues.zones?.id;
      const selCount = (primaryLayerId && selectionsByLayer[primaryLayerId]?.length) || 0;
      return (
        <label className="flex items-center gap-2 cursor-pointer py-1 font-medium">
          <input
            type="checkbox"
            checked={Boolean(val)}
            onChange={(e) => setFormValues({ ...formValues, [field.name]: e.target.checked })}
            className="rounded accent-teal-700 w-4 h-4"
          />
          <span>
            {field.title}
            {field.name === 'only_selected' && ` (${selCount} terpilih)`}
          </span>
        </label>
      );
    }

    if (field.type === 'number' || field.type === 'integer') {
      return (
        <input
          type="number"
          step={field.type === 'integer' ? 1 : 'any'}
          value={val ?? ''}
          onChange={(e) =>
            setFormValues({
              ...formValues,
              [field.name]: e.target.value === '' ? '' : Number(e.target.value),
            })
          }
          className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 tabular-nums"
        />
      );
    }

    return (
      <input
        type="text"
        value={val ?? ''}
        onChange={(e) => setFormValues({ ...formValues, [field.name]: e.target.value || null })}
        placeholder={field.name === 'output_name' ? 'Otomatis jika dikosongkan...' : ''}
        className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
      />
    );
  };

  return (
    <div className="flex h-full w-full overflow-hidden text-xs">
      {/* Left Catalog Sidebar */}
      <div className="w-96 shrink-0 h-full border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-teal-700" />
            <h2 className="text-sm font-medium tracking-tight">Kotak Alat Geoprocessing ({canonicalTools.length})</h2>
          </div>

          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Cari: "buffer", "zona", "potong", "ndvi", "hotspot"...'
              className="w-full pl-9 pr-3 py-2 rounded bg-slate-100 dark:bg-slate-700 focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="flex flex-wrap gap-1">
            {groups.map((g) => (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                className={`px-2.5 py-1 rounded font-normal text-[11px] transition ${
 activeGroup === g
 ? 'bg-teal-700 text-white'
 : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
 }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Tool Cards List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredTools.map((tool) => {
            const isSelected = selectedTool?.id === tool.id;
            const levelBadge =
              tool.level === 'pemula'
                ? 'bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                : tool.level === 'menengah'
                ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                : 'bg-orange-50 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300';

            return (
              <div
                key={tool.id}
                onClick={() => setSelectedToolId(tool.id)}
                className={`p-3 rounded-md border transition cursor-pointer ${
 isSelected
 ? 'border-teal-700 bg-teal-50/60 dark:bg-teal-950/40 shadow-sm'
 : 'border-slate-200 dark:border-slate-700 hover:border-teal-400'
 }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-normal text-slate-900 dark:text-slate-100">{tool.name}</h3>
                    <span className="text-[11px] text-teal-700 dark:text-teal-400 font-normal">
                      ({tool.technical_name})
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-sm text-[10px] font-normal capitalize ${levelBadge}`}>
                    {tool.level}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">
                  {tool.description}
                </p>
                <div className="mt-2 inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700/70 font-mono text-[10px] text-slate-600 dark:text-slate-300">
                  {tool.illustration}
                </div>
              </div>
            );
          })}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1.5 text-[11px] text-slate-500">
            <button
              onClick={() => setActiveTab('earth')}
              className="w-full text-left px-3 py-2 rounded bg-slate-50 dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-slate-700 transition"
            >
              Unduh citra satelit GEE → <b className="text-teal-700">Sumber Data · Katalog Bumi</b>
            </button>
            <button
              onClick={() => setActiveTab('model')}
              className="w-full text-left px-3 py-2 rounded bg-slate-50 dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-slate-700 transition"
            >
              Clustering K-Means / DBSCAN → <b className="text-teal-700">Model ML</b>
            </button>
          </div>
        </div>
      </div>

      {/* Right Main Form Area (Auto-generated from Backend Pydantic JSON Schema) */}
      <div className="flex-1 h-full overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900">
        {selectedTool ? (
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="p-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              {/* Tool Header */}
              <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-normal uppercase tracking-wider text-teal-700">
                    {selectedTool.group}
                  </span>
                  <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-700 font-mono text-xs font-normal">
                    {selectedTool.illustration}
                  </span>
                </div>
                <h1 className="text-xl font-medium tracking-tight text-slate-900 dark:text-white mt-1">
                  {selectedTool.name}{' '}
                  <span className="text-sm font-normal text-slate-400">({selectedTool.technical_name})</span>
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  <b>Apa ini?</b> {selectedTool.description}
                </p>
              </div>

              {/* Primary Beginner Fields */}
              <div className="space-y-3.5">
                {selectedTool.fields
                  .filter((f) => !f.advanced)
                  .map((field) => (
                    <div key={field.name}>
                      {field.type !== 'boolean' && (
                        <label className="block font-normal text-slate-700 dark:text-slate-200 mb-1">
                          {field.title} {field.required && <span className="text-rose-500">*</span>}
                        </label>
                      )}
                      {renderFieldInput(field)}
                    </div>
                  ))}
              </div>

              {/* Advanced Options Accordion */}
              {selectedTool.fields.some((f) => f.advanced) && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs font-normal text-teal-700 hover:underline flex items-center gap-1"
                  >
                    <span>{showAdvanced || mode === 'lanjut' ? '▾ Sembunyikan' : '▸ Tampilkan'} Opsi Lanjutan</span>
                  </button>
                  {(showAdvanced || mode === 'lanjut') && (
                    <div className="mt-3 space-y-3 pl-3 border-l-2 border-teal-200 dark:border-teal-800">
                      {selectedTool.fields
                        .filter((f) => f.advanced)
                        .map((field) => (
                          <div key={field.name}>
                            {field.type !== 'boolean' && (
                              <label className="block font-normal text-slate-700 dark:text-slate-200 mb-1">
                                {field.title}
                              </label>
                            )}
                            {renderFieldInput(field)}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Automatic Metric CRS & Non-Destructive Assurance Banner */}
              <div className="p-3 rounded bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-[11px] text-teal-900 dark:text-teal-200 space-y-1">
                <div className="flex items-center gap-1.5 font-normal">
                  <Info className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>Jarak & luas dihitung otomatis menggunakan proyeksi UTM lokal (meter) agar akurat.</span>
                </div>
                <div className="text-slate-600 dark:text-slate-400 pl-5">
                  Estimasi eksekusi: &lt; 2 detik · Non-destruktif (data asli tetap aman, hasil menjadi layer baru).
                </div>
              </div>

              {/* Action Buttons: Preview, Copy Python Code, Run */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePreview}
                    disabled={runningPreview}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-normal"
                  >
                    <Eye className="w-4 h-4 text-teal-700" />
                    <span>{runningPreview ? 'Menghitung...' : 'Pratinjau Sampel'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const res = await api.previewTool(selectedTool.id, {
                        project_id: projectId,
                        params: formValues,
                      });
                      setPythonSnippet(res.python_code);
                      navigator.clipboard?.writeText(res.python_code);
                      addToast({ type: 'success', title: 'Kode Python GeoPandas disalin ke clipboard!' });
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-normal"
                  >
                    <Code2 className="w-4 h-4 text-teal-700" />
                    <span>Salin sebagai Kode Python</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleRunFull}
                  className="flex items-center gap-2 px-5 py-2.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-medium tracking-tight transition"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Jalankan Proses</span>
                </button>
              </div>
            </div>

            {/* Preview Summary & Switch to Map Button */}
            {previewResult && (
              <div className="p-4 rounded-md bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-teal-700" />
                  <div>
                    <div className="font-normal text-teal-900 dark:text-teal-200">
                      Pratinjau Berhasil ({previewResult.feature_count || 'Sampel'} fitur)
                    </div>
                    <div className="text-[11px] text-teal-800 dark:text-teal-300">
                      Layer pratinjau telah digambar di kanvas Peta.
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('map')}
                  className="px-3 py-1.5 rounded bg-teal-700 text-white font-normal"
                >
                  Lihat Pratinjau di Peta →
                </button>
              </div>
            )}

            {/* Educational Python Code Box ("Fitur Belajar") */}
            {pythonSnippet && (
              <div className="p-4 rounded-md bg-slate-900 text-slate-100 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-normal text-teal-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Kode Python GeoPandas Setara (Fitur Belajar)
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(pythonSnippet);
                      addToast({ type: 'success', title: 'Disalin ke clipboard' });
                    }}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                  >
                    Salin Kode
                  </button>
                </div>
                <pre className="text-xs font-mono overflow-x-auto text-teal-300 leading-relaxed">
                  {pythonSnippet}
                </pre>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
