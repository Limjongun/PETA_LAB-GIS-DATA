import React, { useEffect, useState } from 'react';
import {
  ArrowDownUp,
  Calculator,
  CheckCircle2,
  Download,
  Filter,
  GitMerge,
  Layers,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { api } from '../../api/client';
import { formatNumber } from '../../lib/format';
import { usePetaStore } from '../../stores/usePetaStore';

export const TabularView: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const {
    projectId,
    layers,
    activeLayerId,
    selectionsByLayer,
    mode,
    setActiveLayerId,
    setLayerSelection,
    toggleFeatureSelection,
    refreshLayers,
    addToast,
  } = usePetaStore();

  const activeLayer = layers.find((l) => l.id === activeLayerId) || layers[0] || null;
  const selectedFids = (activeLayerId && selectionsByLayer[activeLayerId]) || [];

  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [filteredRows, setFilteredRows] = useState(0);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(100);
  const [sortCol, setSortCol] = useState<string | undefined>(undefined);
  const [sortDesc, setSortDesc] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [onlySelected, setOnlySelected] = useState(false);

  // Active sub-modal: none | query_builder | calculator | join_wizard | groupby
  const [activeDialog, setActiveDialog] = useState<'none' | 'query_builder' | 'calculator' | 'join_wizard' | 'groupby'>('none');

  // Visual Query Builder state
  const [qbRules, setQbRules] = useState<{ column: string; operator: string; value: string }[]>([
    { column: '', operator: 'gt', value: '' },
  ]);
  const [qbLogic, setQbLogic] = useState<'AND' | 'OR'>('AND');
  const [sqlWhere, setSqlWhere] = useState('');

  // Field Calculator state
  const [calcColName, setCalcColName] = useState('kolom_baru');
  const [calcMode, setCalcMode] = useState<'template' | 'sql'>('template');
  const [calcTemplate, setCalcTemplate] = useState('area_km2');
  const [calcColA, setCalcColA] = useState('');
  const [calcColB, setCalcColB] = useState('');
  const [calcSqlExpr, setCalcSqlExpr] = useState('');
  const [calcPreview, setCalcPreview] = useState<Record<string, any>[]>([]);

  // 3-Step Table Join Wizard state
  const [joinRightLayerId, setJoinRightLayerId] = useState('');
  const [joinLeftKey, setJoinLeftKey] = useState('');
  const [joinRightKey, setJoinRightKey] = useState('');
  const [joinNormalize, setJoinNormalize] = useState(true);
  const [joinPreview, setJoinPreview] = useState<any | null>(null);

  // Group By state
  const [gbGroupCol, setGbGroupCol] = useState('');
  const [gbAggCol, setGbAggCol] = useState('');
  const [gbAggFunc, setGbAggFunc] = useState('sum');

  const fetchTableData = async () => {
    if (!activeLayer) return;
    try {
      const res = await api.getFeatures(activeLayer.id, {
        offset,
        limit,
        sort: sortCol,
        desc: sortDesc,
        filter: searchText || undefined,
        fids: onlySelected ? selectedFids : undefined,
        project_id: projectId,
      });
      setRows(res.rows);
      setTotalRows(res.total);
      setFilteredRows(res.filtered);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal memuat tabel atribut', message: err.message });
    }
  };

  useEffect(() => {
    fetchTableData();
  }, [activeLayer?.id, offset, sortCol, sortDesc, searchText, onlySelected, selectedFids.length, activeLayer?.updated_at]);

  // Initialize default columns when active layer changes
  useEffect(() => {
    if (!activeLayer) return;
    const cols = activeLayer.schema.map((s) => s.name).filter((n) => n !== '_fid');
    const numCols = activeLayer.schema.filter((s) => s.type === 'number' || s.type === 'integer').map((s) => s.name);
    if (cols.length > 0) {
      setQbRules([{ column: numCols[0] || cols[0], operator: 'gt', value: '50000' }]);
      setCalcColA(numCols[0] || cols[0]);
      setCalcColB(numCols[1] || cols[0]);
      setGbGroupCol(cols[0]);
      setGbAggCol(numCols[0] || cols[0]);
    }
  }, [activeLayer?.id]);

  // Auto-suggest Join columns when right layer changes
  useEffect(() => {
    if (!activeLayer || !joinRightLayerId) return;
    api
      .suggestJoin({ project_id: projectId, left_layer_id: activeLayer.id, right_layer_id: joinRightLayerId })
      .then((sug) => {
        setJoinLeftKey(sug.left_key);
        setJoinRightKey(sug.right_key);
      })
      .catch(() => {});
  }, [joinRightLayerId, activeLayer?.id]);

  const handleRunQueryBuilder = async () => {
    if (!activeLayer) return;
    try {
      const res = await api.selectFeatures(
        activeLayer.id,
        {
          mode: 'attribute',
          rules: qbRules,
          logic: qbLogic,
          sql_where: mode === 'lanjut' && sqlWhere.trim() ? sqlWhere : undefined,
        },
        projectId
      );
      setLayerSelection(activeLayer.id, res.fids, 'query');
      addToast({
        type: 'success',
        title: `Ditemukan ${res.count} fitur yang memenuhi syarat`,
      });
      setActiveDialog('none');
    } catch (err: any) {
      addToast({ type: 'error', title: 'Filter belum berhasil', message: err.message });
    }
  };

  const handleRunCalculator = async (previewOnly: boolean) => {
    if (!activeLayer) return;
    try {
      const res = await api.calculateField(
        activeLayer.id,
        {
          target_column: calcColName,
          mode: calcMode,
          template: calcTemplate,
          param_col_a: calcColA,
          param_col_b: calcColB,
          sql_expr: calcSqlExpr,
          preview_only: previewOnly,
        },
        projectId
      );
      setCalcPreview(res.preview_rows || []);
      if (!previewOnly) {
        await refreshLayers();
        await fetchTableData();
        addToast({ type: 'success', title: `Kolom '${calcColName}' berhasil dihitung!` });
        setActiveDialog('none');
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Kalkulator kolom gagal', message: err.message });
    }
  };

  const handleRunJoin = async (previewOnly: boolean) => {
    if (!activeLayer || !joinRightLayerId) return;
    try {
      const res = await api.runJoin({
        project_id: projectId,
        left_layer_id: activeLayer.id,
        right_layer_id: joinRightLayerId,
        left_key: joinLeftKey,
        right_key: joinRightKey,
        normalize_text: joinNormalize,
        preview_only: previewOnly,
      });
      setJoinPreview(res);
      if (!previewOnly && res.layer) {
        await refreshLayers();
        setActiveLayerId(res.layer.id);
        addToast({
          type: 'success',
          title: `Join Tabel Berhasil (${res.matched_count}/${res.total_left} cocok)`,
          message: `Layer baru '${res.layer.name}' telah dibuat.`,
        });
        setActiveDialog('none');
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Join tabel gagal', message: err.message });
    }
  };

  const handleRunGroupBy = async () => {
    if (!activeLayer) return;
    try {
      const saved = await api.groupByLayer(
        activeLayer.id,
        {
          group_column: gbGroupCol,
          agg_column: gbAggCol,
          agg_func: gbAggFunc,
          dissolve_geometry: true,
        },
        projectId
      );
      await refreshLayers();
      setActiveLayerId(saved.id);
      addToast({ type: 'success', title: `Ringkasan per '${gbGroupCol}' berhasil dibuat!` });
      setActiveDialog('none');
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal meringkas data', message: err.message });
    }
  };

  if (!activeLayer) {
    return <div className="p-6 text-sm text-slate-500">Pilih layer terlebih dahulu untuk melihat tabel atribut.</div>;
  }

  const columns = activeLayer.schema.map((s) => s.name);

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-slate-800 text-xs">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
        <div className="flex flex-wrap items-center gap-2">
          {/* Layer Switcher */}
          <div className="flex items-center gap-1.5">
            <span className="font-normal text-slate-500">Tabel:</span>
            <select
              value={activeLayer.id}
              onChange={(e) => {
                setActiveLayerId(e.target.value);
                setOffset(0);
              }}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-normal"
            >
              {layers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.feature_count})
                </option>
              ))}
            </select>
          </div>

          {/* Fast Text Filter */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setOffset(0);
              }}
              placeholder="Cari teks di semua kolom..."
              className="pl-7 pr-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 w-48 focus:outline-none focus:border-teal-600"
            />
          </div>

          {/* Toggle Show Selected Only */}
          <label className="flex items-center gap-1.5 px-2 py-1 rounded bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 cursor-pointer font-medium text-orange-900 dark:text-orange-300">
            <input
              type="checkbox"
              checked={onlySelected}
              onChange={(e) => {
                setOnlySelected(e.target.checked);
                setOffset(0);
              }}
              className="rounded accent-orange-600"
            />
            <span>Terpilih saja ({selectedFids.length})</span>
          </label>
        </div>

        {/* Tabular Power Tools */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveDialog(activeDialog === 'query_builder' ? 'none' : 'query_builder')}
            className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-100 font-medium"
          >
            <Filter className="w-3.5 h-3.5 text-teal-700" />
            <span>Pilih dengan Syarat</span>
          </button>

          <button
            onClick={() => setActiveDialog(activeDialog === 'calculator' ? 'none' : 'calculator')}
            className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-100 font-medium"
          >
            <Calculator className="w-3.5 h-3.5 text-teal-600" />
            <span>Kalkulator Kolom</span>
          </button>

          <button
            onClick={() => {
              const firstTable = layers.find((l) => l.id !== activeLayer.id);
              if (firstTable) setJoinRightLayerId(firstTable.id);
              setActiveDialog(activeDialog === 'join_wizard' ? 'none' : 'join_wizard');
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-100 font-medium"
          >
            <GitMerge className="w-3.5 h-3.5 text-teal-700" />
            <span>Join Tabel</span>
          </button>

          <button
            onClick={() => setActiveDialog(activeDialog === 'groupby' ? 'none' : 'groupby')}
            className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-100 font-medium"
          >
            <Layers className="w-3.5 h-3.5 text-orange-600" />
            <span>Ringkas (Group By)</span>
          </button>

          <button
            onClick={async () => {
              const res = await api.exportResource({
                project_id: projectId,
                export_type: 'layer',
                layer_id: activeLayer.id,
                format: 'xlsx',
                only_selected_fids: onlySelected && selectedFids.length > 0 ? selectedFids : undefined,
              });
              window.open(res.download_url, '_blank');
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-orange-600 text-white font-medium hover:bg-orange-700"
            title="Unduh Excel (.xlsx) rapi per kolom"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            onClick={async () => {
              const res = await api.exportResource({
                project_id: projectId,
                export_type: 'layer',
                layer_id: activeLayer.id,
                format: 'csv',
                csv_delimiter: ';',
                only_selected_fids: onlySelected && selectedFids.length > 0 ? selectedFids : undefined,
              });
              window.open(res.download_url, '_blank');
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-teal-700 text-white font-medium hover:bg-teal-800"
            title="Unduh CSV pemisah titik koma (;) siap buka di Excel Indonesia"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV (;)</span>
          </button>
        </div>
      </div>

      {/* Expandable Tool Panels (Visual Query Builder / Field Calculator / 3-Step Join Wizard / Group By) */}
      {activeDialog === 'query_builder' && (
        <div className="p-3 bg-teal-50/70 dark:bg-slate-900 border-b border-teal-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-normal text-teal-900 dark:text-teal-300">
               Pembuat Syarat Visual (Pilih Fitur Berdasarkan Atribut)
            </h4>
            <button onClick={() => setActiveDialog('none')} aria-label="Tutup Panel" className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>
          {qbRules.map((rule, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2">
              {idx > 0 && (
                <select
                  value={qbLogic}
                  onChange={(e) => setQbLogic(e.target.value as any)}
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-normal"
                >
                  <option value="AND">DAN (AND)</option>
                  <option value="OR">ATAU (OR)</option>
                </select>
              )}
              <select
                value={rule.column}
                onChange={(e) => {
                  const next = [...qbRules];
                  next[idx].column = e.target.value;
                  setQbRules(next);
                }}
                className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              >
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={rule.operator}
                onChange={(e) => {
                  const next = [...qbRules];
                  next[idx].operator = e.target.value;
                  setQbRules(next);
                }}
                className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              >
                <option value="gt">lebih dari (&gt;)</option>
                <option value="gte">minimal (&ge;)</option>
                <option value="lt">kurang dari (&lt;)</option>
                <option value="eq">sama dengan (=)</option>
                <option value="contains">mengandung teks</option>
                <option value="in">termasuk dalam daftar (pisahkan koma)</option>
              </select>
              <input
                type="text"
                value={rule.value}
                onChange={(e) => {
                  const next = [...qbRules];
                  next[idx].value = e.target.value;
                  setQbRules(next);
                }}
                placeholder="Nilai..."
                className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 w-44"
              />
            </div>
          ))}
          {mode === 'lanjut' && (
            <div className="pt-1">
              <label className="block text-[11px] font-normal text-slate-600 mb-0.5">
                Mode Lanjut — Atau tulis klausa SQL WHERE DuckDB langsung:
              </label>
              <input
                type="text"
                value={sqlWhere}
                onChange={(e) => setSqlWhere(e.target.value)}
                placeholder="Contoh: penduduk > 100000 AND wilayah = 'Timur'"
                className="w-full px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() =>
                setQbRules([...qbRules, { column: columns[0] || '', operator: 'eq', value: '' }])
              }
              className="px-2.5 py-1 rounded border border-teal-300 bg-white dark:bg-slate-800 text-teal-800 font-medium"
            >
              + Tambah Syarat
            </button>
            <button
              onClick={handleRunQueryBuilder}
              className="px-3.5 py-1 rounded bg-teal-700 text-white font-normal hover:bg-teal-800"
            >
              Pilih Fitur yang Cocok
            </button>
          </div>
        </div>
      )}

      {activeDialog === 'calculator' && (
        <div className="p-3 bg-teal-50/70 dark:bg-slate-900 border-b border-teal-200 dark:border-slate-700 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="font-normal text-teal-900 dark:text-teal-300">
               Kalkulator Kolom (Field Calculator)
            </h4>
            <button onClick={() => setActiveDialog('none')} aria-label="Tutup Panel" className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] font-normal mb-0.5">Nama Kolom Baru / Tujuan</label>
              <input
                type="text"
                value={calcColName}
                onChange={(e) => setCalcColName(e.target.value)}
                className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 w-40"
              />
            </div>
            <div>
              <label className="block text-[11px] font-normal mb-0.5">Mode Rumus</label>
              <select
                value={calcMode}
                onChange={(e) => setCalcMode(e.target.value as any)}
                className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              >
                <option value="template">Template Siap Pakai (Pemula)</option>
                <option value="sql">Ekspresi SQL DuckDB (Mode Lanjut)</option>
              </select>
            </div>

            {calcMode === 'template' ? (
              <>
                <div>
                  <label className="block text-[11px] font-normal mb-0.5">Pilih Template</label>
                  <select
                    value={calcTemplate}
                    onChange={(e) => setCalcTemplate(e.target.value)}
                    className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                  >
                    <option value="area_km2">Luas Wilayah (km² — UTM Otomatis)</option>
                    <option value="length_km">Panjang Garis/Keliling (km)</option>
                    <option value="density">Kepadatan = Kolom A / Luas km²</option>
                    <option value="percentage">Persentase (%) dari Total Kolom A</option>
                    <option value="categorize">Kategori (Rendah / Sedang / Tinggi) dari Kolom A</option>
                    <option value="centroid_x">Koordinat Bujur (Longitude Centroid)</option>
                    <option value="centroid_y">Koordinat Lintang (Latitude Centroid)</option>
                  </select>
                </div>
                {['density', 'percentage', 'categorize'].includes(calcTemplate) && (
                  <div>
                    <label className="block text-[11px] font-normal mb-0.5">Kolom A</label>
                    <select
                      value={calcColA}
                      onChange={(e) => setCalcColA(e.target.value)}
                      className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    >
                      {columns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 min-w-[240px]">
                <label className="block text-[11px] font-normal mb-0.5">Ekspresi SQL DuckDB</label>
                <input
                  type="text"
                  value={calcSqlExpr}
                  onChange={(e) => setCalcSqlExpr(e.target.value)}
                  placeholder="Contoh: ROUND(penduduk / luas_km2, 1)"
                  className="w-full px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRunCalculator(true)}
              className="px-3 py-1 rounded border border-teal-500/60 bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-300 font-medium"
            >
              Pratinjau 5 Baris
            </button>
            <button
              onClick={() => handleRunCalculator(false)}
              className="px-3.5 py-1 rounded bg-teal-700 text-white font-normal hover:bg-teal-800"
            >
              ▶ Hitung & Simpan Kolom
            </button>
          </div>
          {calcPreview.length > 0 && (
            <div className="text-[11px] bg-white dark:bg-slate-800 p-2 rounded border border-teal-200 dark:border-teal-900">
              <b>Pratinjau 5 baris pertama untuk '{calcColName}':</b>{' '}
              {calcPreview.map((r, i) => (
                <span key={i} className="inline-block mr-3 px-1.5 py-0.5 rounded bg-teal-50 dark:bg-slate-700 tabular-nums">
                  #{r._fid}: <b>{String(r[calcColName])}</b>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {activeDialog === 'join_wizard' && (
        <div className="p-3 bg-teal-50/70 dark:bg-slate-900 border-b border-teal-200 dark:border-slate-700 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="font-normal text-teal-900 dark:text-teal-300">
               Wizard Join Tabel 3-Langkah (Gabungkan CSV/Excel ke Peta)
            </h4>
            <button onClick={() => setActiveDialog('none')} aria-label="Tutup Panel" className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 items-end">
            <div>
              <label className="block text-[11px] font-normal mb-0.5">① Tabel / Layer Sumber</label>
              <select
                value={joinRightLayerId}
                onChange={(e) => setJoinRightLayerId(e.target.value)}
                className="w-full px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              >
                <option value="">-- Pilih Tabel --</option>
                {layers
                  .filter((l) => l.id !== activeLayer.id)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.feature_count} baris)
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-normal mb-0.5">② Kolom Kunci di {activeLayer.name}</label>
              <select
                value={joinLeftKey}
                onChange={(e) => setJoinLeftKey(e.target.value)}
                className="w-full px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              >
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-normal mb-0.5">② Kolom Kunci di Tabel Sumber</label>
              <select
                value={joinRightKey}
                onChange={(e) => setJoinRightKey(e.target.value)}
                className="w-full px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              >
                {(layers.find((l) => l.id === joinRightLayerId)?.schema || []).map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-1.5 py-1 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={joinNormalize}
                onChange={(e) => setJoinNormalize(e.target.checked)}
                className="rounded accent-teal-700"
              />
              <span>Normalisasi teks (abaikan spasi & huruf besar/kecil)</span>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRunJoin(true)}
              className="px-3 py-1 rounded border border-teal-400 bg-white dark:bg-slate-800 text-teal-800 font-medium"
            >
              ③ Cek Kecocokan Data
            </button>
            <button
              onClick={() => handleRunJoin(false)}
              className="px-3.5 py-1 rounded bg-teal-700 text-white font-normal hover:bg-teal-800"
            >
              ▶ Gabungkan & Buat Layer Baru
            </button>
          </div>
          {joinPreview && (
            <div className="p-2.5 rounded bg-white dark:bg-slate-800 border border-teal-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  <b>{joinPreview.matched_count}</b> dari <b>{joinPreview.total_left}</b> baris cocok ({joinPreview.match_rate_pct}%).
                </span>
                {joinPreview.unmatched_examples?.length > 0 && (
                  <span className="text-orange-700">
                    Contoh belum cocok:{' '}
                    {joinPreview.unmatched_examples.map((u: any) => `'${u.left_value}' vs '${u.suggested_right}'`).join(', ')}
                  </span>
                )}
              </div>
              {!joinNormalize && joinPreview.unmatched_count > 0 && (
                <button
                  onClick={() => {
                    setJoinNormalize(true);
                    setTimeout(() => handleRunJoin(true), 50);
                  }}
                  className="px-2.5 py-1 rounded bg-orange-100 text-orange-900 font-normal flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Aktifkan Normalisasi Otomatis
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {activeDialog === 'groupby' && (
        <div className="p-3 bg-orange-50/70 dark:bg-slate-900 border-b border-orange-200 dark:border-slate-700 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-normal mb-0.5">Kelompokkan per Kolom</label>
            <select
              value={gbGroupCol}
              onChange={(e) => setGbGroupCol(e.target.value)}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
            >
              {columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-normal mb-0.5">Kolom yang Diringkas</label>
            <select
              value={gbAggCol}
              onChange={(e) => setGbAggCol(e.target.value)}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
            >
              {columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-normal mb-0.5">Fungsi Ringkasan</label>
            <select
              value={gbAggFunc}
              onChange={(e) => setGbAggFunc(e.target.value)}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
            >
              <option value="sum">Jumlah Total (SUM)</option>
              <option value="mean">Rata-rata (MEAN)</option>
              <option value="count">Banyak Baris (COUNT)</option>
              <option value="min">Nilai Terkecil (MIN)</option>
              <option value="max">Nilai Terbesar (MAX)</option>
            </select>
          </div>
          <button
            onClick={handleRunGroupBy}
            className="px-3.5 py-1 rounded bg-orange-600 text-white font-normal hover:bg-orange-700"
          >
            ▶ Buat Layer Ringkasan
          </button>
        </div>
      )}

      {/* Virtualized / Paginated Attribute Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-700/95 border-b border-slate-200 dark:border-slate-600">
            <tr>
              <th className="py-2 px-3 w-10 text-center font-normal text-slate-500">Pilih</th>
              {columns.map((col) => (
                <th
                  key={col}
                  onClick={() => {
                    if (sortCol === col) {
                      setSortDesc(!sortDesc);
                    } else {
                      setSortCol(col);
                      setSortDesc(false);
                    }
                  }}
                  className="py-2 px-3 font-normal text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-600 whitespace-nowrap select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>{col}</span>
                    <ArrowDownUp className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {rows.map((row) => {
              const fid = Number(row._fid);
              const isSelected = selectedFids.includes(fid);
              return (
                <tr
                  key={fid}
                  onClick={(e) => toggleFeatureSelection(activeLayer.id, fid, e.shiftKey || e.ctrlKey)}
                  className={`cursor-pointer transition ${
 isSelected
 ? 'bg-orange-100/80 dark:bg-orange-900/40 font-medium'
 : 'hover:bg-teal-50/40 dark:hover:bg-slate-700/40'
 }`}
                >
                  <td className="py-1.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded accent-orange-600 pointer-events-none"
                    />
                  </td>
                  {columns.map((col) => {
                    const val = row[col];
                    const isNum = typeof val === 'number';
                    return (
                      <td
                        key={col}
                        className={`py-1.5 px-3 whitespace-nowrap ${
 isNum ? 'tabular-nums text-right font-medium' : ''
 }`}
                      >
                        {isNum ? formatNumber(val) : String(val ?? '—')}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer Pagination */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-500">
        <div>
          Menampilkan <b>{rows.length}</b> dari <b>{formatNumber(filteredRows)}</b> baris (Total: {formatNumber(totalRows)}) ·{' '}
          <span className="text-orange-700 dark:text-orange-400 font-normal">{selectedFids.length} terpilih</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - limit))}
            className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-40"
          >
            ← Sebelumnya
          </button>
          <span className="tabular-nums">
            Hal {Math.floor(offset / limit) + 1} / {Math.max(1, Math.ceil(filteredRows / limit))}
          </span>
          <button
            disabled={offset + limit >= filteredRows}
            onClick={() => setOffset(offset + limit)}
            className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-40"
          >
            Berikutnya →
          </button>
        </div>
      </div>
    </div>
  );
};
