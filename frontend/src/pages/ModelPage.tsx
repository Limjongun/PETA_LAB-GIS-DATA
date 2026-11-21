import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Brain,
  CheckCircle2,
  Code,
  Download,
  Eye,
  Layers,
  Play,
  Plus,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react';
import { api } from '../api/client';
import { formatNumber } from '../lib/format';
import { usePetaStore } from '../stores/usePetaStore';

export const ModelPage: React.FC = () => {
  const {
    projectId,
    layers,
    models,
    jobs,
    mode,
    setActiveLayerId,
    setActiveTab,
    setPreviewGeoJSON,
    refreshLayers,
    refreshModels,
    addToast,
  } = usePetaStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [task, setTask] = useState<'regression' | 'classification' | 'clustering' | 'pixel'>('regression');

  const vectorLayers = layers.filter((l) => l.kind === 'vector');
  const rasterLayers = layers.filter((l) => l.kind === 'raster');

  const [trainLayerId, setTrainLayerId] = useState<string>(vectorLayers[0]?.id || '');
  const [pixelRasterLayerId, setPixelRasterLayerId] = useState<string>(rasterLayers[0]?.id || '');
  const [sampleLayerId, setSampleLayerId] = useState<string>('');
  const [targetCol, setTargetCol] = useState<string>('suhu_permukaan_c');
  const [featureCols, setFeatureCols] = useState<string[]>(['ndvi_rata', 'elevasi_m', 'kepadatan']);

  // Spatial Feature Builder state
  const [builderType, setBuilderType] = useState('distance_to');
  const [builderGeePreset, setBuilderGeePreset] = useState('gee.ndvi');
  const [builderTargetLayerId, setBuilderTargetLayerId] = useState('');
  const [builderRadiusM, setBuilderRadiusM] = useState(1000);
  const [builderColName, setBuilderColName] = useState('');
  const [buildingFeature, setBuildingFeature] = useState(false);
  const [auditWarnings, setAuditWarnings] = useState<any[]>([]);

  // Step 4: Spatial CV state
  const [cvMethod, setCvMethod] = useState<'spatial_block' | 'random' | 'group'>('spatial_block');
  const [blockSizeM, setBlockSizeM] = useState(3500);
  const [nSplits, setNSplits] = useState(5);
  const [groupCol, setGroupCol] = useState('wilayah');
  const [cvFoldSummary, setCvFoldSummary] = useState<{ fold: number; count: number }[]>([]);

  // Step 5: Training Preset / Algorithm state
  const [algorithm, setAlgorithm] = useState('seimbang');
  const [modelName, setModelName] = useState('Prediksi_Suhu_Surabaya');
  const [nClusters, setNClusters] = useState(4);
  const [autoTune, setAutoTune] = useState(false);
  const [balanceClasses, setBalanceClasses] = useState(true);

  // Step 6: Selected Model, Reactive WebSocket Training Job & Prediction target
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [predictTargetLayerId, setPredictTargetLayerId] = useState<string>('');
  const [lastTrainJobId, setLastTrainJobId] = useState<string | null>(null);

  // Python Console (Mode Lanjut)
  const [showConsole, setShowConsole] = useState(false);
  const [pyCode, setPyCode] = useState(
    '# Objek siap pakai: layers["kecamatan_surabaya"], gpd, pd, np, save_layer(gdf, "nama")\n' +
      'gdf = layers["kecamatan_surabaya"]\n' +
      'print("Jumlah kecamatan:", len(gdf))\n' +
      'print(gdf[["kecamatan", "penduduk", "suhu_permukaan_c"]].head())'
  );
  const [pyOutput, setPyOutput] = useState('');

  const trainLayer = layers.find((l) => l.id === trainLayerId) || vectorLayers[0] || null;

  // Keep selected training / raster / model IDs synchronized whenever project or layers switch
  useEffect(() => {
    if (!vectorLayers.some((l) => l.id === trainLayerId)) {
      setTrainLayerId(vectorLayers[0]?.id || '');
    }
    if (!rasterLayers.some((l) => l.id === pixelRasterLayerId)) {
      setPixelRasterLayerId(rasterLayers[0]?.id || '');
    }
    if (sampleLayerId && !vectorLayers.some((l) => l.id === sampleLayerId)) {
      setSampleLayerId('');
    }
    if (predictTargetLayerId && !vectorLayers.some((l) => l.id === predictTargetLayerId)) {
      setPredictTargetLayerId('');
    }
  }, [projectId, layers.map((l) => l.id).join(',')]);

  useEffect(() => {
    if (models.length === 0) {
      setSelectedModelId('');
    } else if (!models.some((m) => m.id === selectedModelId)) {
      setSelectedModelId(models[0].id);
    }
  }, [projectId, models.map((m) => m.id).join(',')]);

  useEffect(() => {
    if (!trainLayer) return;
    const numCols = trainLayer.schema
      .filter((s) => (s.type === 'number' || s.type === 'integer') && s.name !== '_fid')
      .map((s) => s.name);
    const strCols = trainLayer.schema
      .filter((s) => s.type === 'string' && !['kode_kec', 'kecamatan', 'nama', 'nama_sekolah'].includes(s.name))
      .map((s) => s.name);

    if (task === 'regression') {
      const defTarget = numCols.includes('suhu_permukaan_c') ? 'suhu_permukaan_c' : numCols[numCols.length - 1] || '';
      setTargetCol(defTarget);
      setFeatureCols(numCols.filter((c) => c !== defTarget));
    } else if (task === 'classification') {
      const defTarget = strCols.includes('kategori_banjir') ? 'kategori_banjir' : strCols[0] || numCols[0] || '';
      setTargetCol(defTarget);
      setFeatureCols(numCols.filter((c) => c !== defTarget && c !== 'skor_rawan_banjir'));
    } else if (task === 'clustering') {
      setFeatureCols(numCols.slice(0, 5));
    }
  }, [trainLayer?.id, task]);

  // Run leakage & imbalance audit when features or target change
  useEffect(() => {
    if (!trainLayer || task === 'clustering' || task === 'pixel') return;
    api
      .auditFeatures({
        project_id: projectId,
        layer_id: trainLayer.id,
        target_column: targetCol,
        feature_columns: featureCols,
        task,
      })
      .then((res) => setAuditWarnings(res.warnings || []))
      .catch(() => {});
  }, [trainLayer?.id, targetCol, featureCols.join(','), task, projectId]);

  const handleAddSpatialFeature = async () => {
    if (!trainLayer) return;
    setBuildingFeature(true);
    try {
      const spec: Record<string, any> = { type: builderType, name: builderColName || undefined };
      if (builderType === 'distance_to' || builderType === 'count_within') {
        spec.target_layer_id = builderTargetLayerId || vectorLayers.find((l) => l.id !== trainLayer.id)?.id;
        spec.radius_m = builderRadiusM;
      } else if (builderType === 'raster_value') {
        spec.raster_layer_id = rasterLayers[0]?.id;
        spec.band = 1;
      } else if (builderType === 'spatial_lag') {
        spec.column = targetCol || featureCols[0];
        spec.k = 5;
      } else if (builderType === 'gee_zonal') {
        spec.preset_id = builderGeePreset;
      }
      const res = await api.buildSpatialFeatures({
        project_id: projectId,
        layer_id: trainLayer.id,
        specs: [spec],
      });
      await refreshLayers();
      setFeatureCols((prev) => Array.from(new Set([...prev, ...(res.added_columns || [])])));
      addToast({
        type: 'success',
        title: 'Fitur Spasial Baru Ditambahkan!',
        message: `Kolom baru: ${(res.added_columns || []).join(', ')}`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal membuat fitur spasial', message: err.message });
    } finally {
      setBuildingFeature(false);
    }
  };

  const handlePreviewSpatialCV = async () => {
    if (!trainLayer) return;
    try {
      const res = await api.previewSpatialCV({
        project_id: projectId,
        layer_id: trainLayer.id,
        block_size_m: blockSizeM,
        n_splits: nSplits,
      });
      setCvFoldSummary(res.fold_summary || []);
      setPreviewGeoJSON(res.geojson);
      addToast({
        type: 'info',
        title: 'Blok Spatial CV Siap Ditampilkan',
        message: 'Pembagian blok wilayah per lipatan (Fold) telah digambar di Peta.',
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal membuat preview Spatial CV', message: err.message });
    }
  };

  const activeTrainJob = lastTrainJobId ? jobs.find((j) => j.id === lastTrainJobId) || null : null;

  useEffect(() => {
    if (!activeTrainJob) return;
    if (activeTrainJob.status === 'succeeded') {
      (async () => {
        await refreshModels();
        await refreshLayers();
        const newModelId = activeTrainJob.outputs?.id;
        if (newModelId) setSelectedModelId(newModelId);
        setLastTrainJobId(null);
        setStep(6);
      })();
    }
  }, [activeTrainJob?.status, activeTrainJob?.id]);

  const handleStartTraining = async () => {
    try {
      const res = await api.trainModel({
        project_id: projectId,
        params: {
          model_name: modelName,
          task,
          algorithm,
          layer_id: task === 'pixel' ? (pixelRasterLayerId || rasterLayers[0]?.id) : trainLayer?.id,
          raster_layer_id: pixelRasterLayerId || rasterLayers[0]?.id,
          sample_layer_id: sampleLayerId || undefined,
          target_column: targetCol,
          feature_columns: featureCols,
          cv_method: cvMethod,
          n_splits: nSplits,
          block_size_m: blockSizeM,
          group_column: groupCol,
          n_clusters: nClusters,
          auto_tune: autoTune,
          balance_classes: balanceClasses,
          create_output_layer: true,
        },
      });
      setLastTrainJobId(res.job_id);
      addToast({
        type: 'info',
        title: `Training '${modelName}' Dimulai`,
        message: 'Progress real-time dipantau via WebSocket; halaman akan pindah ke Rapor otomatis saat selesai.',
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal melatih model', message: err.message });
    }
  };

  const activeModel = models.find((m) => m.id === selectedModelId) || models[0] || null;

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto text-xs">
      {/* Wizard Progress Stepper */}
      <div className="p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-teal-700" />
          <h1 className="text-base font-medium tracking-tight">Spatial Machine Learning & Training Wizard</h1>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { n: 1, label: '① Tujuan' },
            { n: 2, label: '② Data & Target' },
            { n: 3, label: '③ Fitur Spasial' },
            { n: 4, label: '④ Validasi Spasial' },
            { n: 5, label: '⑤ Training' },
            { n: 6, label: `⑥ Hasil & Rapor (${models.length})` },
          ].map((s) => (
            <button
              key={s.n}
              onClick={() => setStep(s.n as any)}
              className={`px-3 py-1.5 rounded font-normal transition ${
 step === s.n
 ? 'bg-teal-700 text-white shadow-sm'
 : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
 }`}
            >
              {s.label}
            </button>
          ))}

          {mode === 'lanjut' && (
            <button
              onClick={() => setShowConsole(!showConsole)}
              className="ml-2 flex items-center gap-1 px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-orange-400 font-normal"
            >
              <Terminal className="w-3.5 h-3.5" /> Konsol Python
            </button>
          )}
        </div>
      </div>

      {/* Advanced Mode Python Console Bridge */}
      {showConsole && (
        <div className="p-4 rounded-md bg-slate-900 text-slate-100 space-y-3 border border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-normal text-orange-400 flex items-center gap-1.5">
              <Terminal className="w-4 h-4" /> Konsol Python Interaktif (Mode Lanjut)
            </span>
            <button onClick={() => setShowConsole(false)} aria-label="Tutup Konsol Python" className="p-0.5 rounded text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <textarea
            rows={5}
            value={pyCode}
            onChange={(e) => setPyCode(e.target.value)}
            className="w-full p-3 rounded bg-slate-950 text-teal-300 font-mono text-xs border border-slate-800 focus:outline-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Gunakan <code>layers["nama_layer"]</code> untuk mengakses GeoDataFrame dan <code>save_layer(gdf, "nama_baru")</code>.
            </span>
            <button
              onClick={async () => {
                const res = await api.runPythonConsole({ project_id: projectId, code: pyCode });
                setPyOutput(res.error ? `${res.output}\nERROR: ${res.error}` : res.output);
                if (res.created_layers?.length > 0) await refreshLayers();
              }}
              className="px-4 py-1.5 rounded bg-teal-700 hover:bg-teal-600 text-white font-normal"
            >
              ▶ Jalankan Script Python
            </button>
          </div>
          {pyOutput && (
            <pre className="p-3 rounded bg-black/60 text-slate-200 font-mono text-[11px] whitespace-pre-wrap">
              {pyOutput}
            </pre>
          )}
        </div>
      )}

      {/* STEP 1: TUJUAN */}
      {step === 1 && (
        <div className="p-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h2 className="text-base font-medium tracking-tight">① Apa tujuan pemodelan spasial yang ingin kamu lakukan?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                id: 'regression',
                title: 'Memprediksi Angka (Regresi Spasial)',
                sub: 'Regression',
                desc: 'Menebak nilai kontinu di setiap wilayah atau titik, misalnya: suhu permukaan (°C), harga tanah, atau skor kerawanan.',
                example: 'Contoh di proyek ini: Memprediksi suhu_permukaan_c dari NDVI, elevasi, dan kepadatan.',
              },
              {
                id: 'classification',
                title: 'Memprediksi Kategori (Klasifikasi Spasial)',
                sub: 'Classification',
                desc: 'Menebak kelas atau status suatu lokasi, misalnya: Rawan Tinggi / Sedang / Rendah.',
                example: 'Contoh di proyek ini: Memprediksi kategori_banjir per kecamatan.',
              },
              {
                id: 'clustering',
                title: 'Menemukan Kelompok Wilayah (Clustering)',
                sub: 'Unsupervised Spatial Clustering',
                desc: 'Mengelompokkan wilayah yang punya kemiripan karakteristik tanpa perlu kolom target.',
                example: 'Contoh: Segmentasi tipologi kecamatan Surabaya.',
              },
              {
                id: 'pixel',
                title: 'Klasifikasi Citra / Raster per Piksel',
                sub: 'Pixel-level Land Cover Classification',
                desc: 'Mengklasifikasi setiap piksel citra multi-band menjadi peta tutupan lahan (Vegetasi, Perairan, Terbangun).',
                example: 'Contoh: Klasifikasi tutupan lahan dari layer dem_citra_surabaya.',
              },
            ].map((card) => (
              <div
                key={card.id}
                onClick={() => {
                  setTask(card.id as any);
                  setModelName(
                    card.id === 'regression'
                      ? 'Prediksi_Suhu_Surabaya'
                      : card.id === 'classification'
                      ? 'Klasifikasi_Rawan_Banjir'
                      : card.id === 'clustering'
                      ? 'Klaster_Tipologi_Kecamatan'
                      : 'Tutupan_Lahan_Surabaya'
                  );
                }}
                className={`p-4 rounded-md border transition cursor-pointer ${
 task === card.id
 ? 'border-teal-700 bg-teal-50/50 dark:bg-teal-950/30'
 : 'border-slate-200 dark:border-slate-700 hover:border-teal-400'
 }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium tracking-tight">{card.title}</h3>
                  <span className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 font-normal text-[10px]">
                    {card.sub}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">{card.desc}</p>
                <p className="text-[11px] text-teal-800 dark:text-teal-300 font-medium mt-2"> {card.example}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-medium tracking-tight"
            >
              Lanjut ke Data & Target →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: DATA & TARGET */}
      {step === 2 && (
        <div className="p-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 max-w-3xl">
          <h2 className="text-base font-medium tracking-tight">② Pilih Layer Data Latih & Kolom Target</h2>

          {task === 'pixel' ? (
            <div className="space-y-3">
              <div>
                <label className="block font-normal mb-1">Layer Citra Multi-Band</label>
                <select
                  value={pixelRasterLayerId || rasterLayers[0]?.id || ''}
                  onChange={(e) => setPixelRasterLayerId(e.target.value)}
                  className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent font-normal"
                >
                  {rasterLayers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.feature_count} band)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-normal mb-1">
                  Layer Sampel Latih Berlabel (Opsional — otomatis menggunakan aturan spektral NDVI/DEM jika dikosongkan)
                </label>
                <select
                  value={sampleLayerId}
                  onChange={(e) => setSampleLayerId(e.target.value)}
                  className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                >
                  <option value="">-- Otomatis Ekstrak Sampel Spektral (Vegetasi / Perairan / Terbangun) --</option>
                  {vectorLayers.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-normal mb-1">Layer Vektor Data Latih</label>
                <select
                  value={trainLayer?.id || ''}
                  onChange={(e) => setTrainLayerId(e.target.value)}
                  className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent font-normal"
                >
                  {vectorLayers.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.feature_count} fitur)
                    </option>
                  ))}
                </select>
              </div>

              {task !== 'clustering' && trainLayer && (
                <div>
                  <label className="block font-normal mb-1">Kolom Target yang Diprediksi (y)</label>
                  <select
                    value={targetCol}
                    onChange={(e) => setTargetCol(e.target.value)}
                    className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent font-normal"
                  >
                    {trainLayer.schema
                      .filter((s) => s.name !== '_fid')
                      .map((s) => (
                        <option key={s.name} value={s.name}>
                          {s.name} ({s.type} · contoh: {String(s.sample)})
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between pt-3">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded border border-slate-300 dark:border-slate-600 font-normal"
            >
              ← Kembali
            </button>
            <button
              onClick={() => setStep(task === 'pixel' ? 5 : 3)}
              className="px-5 py-2.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-medium tracking-tight"
            >
              Lanjut ke Pemilihan Fitur →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: FITUR & SPATIAL FEATURE BUILDER */}
      {step === 3 && trainLayer && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h2 className="text-base font-medium tracking-tight">③ Pilih Kolom Fitur Penjelas (X)</h2>
            <p className="text-slate-500">
              Centang kolom yang akan dipelajari model. Kolom ID dan teks nama otomatis tidak dicentang agar model tidak menghafal nama.
            </p>

            {/* Audit Warnings (Leakage / Imbalance) */}
            {auditWarnings.map((w, idx) => (
              <div
                key={idx}
                className="p-3 rounded bg-orange-50 dark:bg-orange-950/50 border border-orange-300 dark:border-orange-800 flex items-center justify-between gap-2 text-orange-900 dark:text-orange-200"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
                  <span>{w.message}</span>
                </div>
                {w.column && (
                  <button
                    onClick={() => setFeatureCols(featureCols.filter((c) => c !== w.column))}
                    className="px-2.5 py-1 rounded bg-orange-200 dark:bg-orange-800 font-normal shrink-0"
                  >
                    Keluarkan '{w.column}'
                  </button>
                )}
              </div>
            ))}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {trainLayer.schema
                .filter((s) => s.name !== '_fid' && s.name !== targetCol)
                .map((s) => {
                  const checked = featureCols.includes(s.name);
                  return (
                    <label
                      key={s.name}
                      className={`flex items-center gap-2 p-2.5 rounded border cursor-pointer transition ${
 checked
 ? 'border-teal-700 bg-teal-50/50 dark:bg-teal-950/30 font-normal'
 : 'border-slate-200 dark:border-slate-700'
 }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) setFeatureCols([...featureCols, s.name]);
                          else setFeatureCols(featureCols.filter((c) => c !== s.name));
                        }}
                        className="rounded accent-teal-700"
                      />
                      <div className="truncate">
                        <div>{s.name}</div>
                        <div className="text-[10px] text-slate-400">{s.type}</div>
                      </div>
                    </label>
                  );
                })}
            </div>

            <div className="flex justify-between pt-3">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded border border-slate-300 dark:border-slate-600 font-normal"
              >
                ← Kembali
              </button>
              <button
                onClick={() => setStep(task === 'clustering' ? 5 : 4)}
                disabled={featureCols.length === 0}
                className="px-5 py-2.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-medium tracking-tight disabled:opacity-40"
              >
                Lanjut ke Validasi Spasial →
              </button>
            </div>
          </div>

          {/* Spatial Feature Builder Card */}
          <div className="p-5 rounded-md bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-900 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-teal-700 font-medium tracking-tight text-sm">
              <Plus className="w-4 h-4" />
              <span>+ Tambah Fitur Spasial Otomatis</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Perkaya data dengan menghitung hubungan lokasi terhadap layer lain atau raster:
            </p>

            <div>
              <label className="block font-normal mb-1">Jenis Fitur Spasial</label>
              <select
                value={builderType}
                onChange={(e) => setBuilderType(e.target.value)}
                className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
              >
                <option value="distance_to">Jarak ke Layer Lain (meter)</option>
                <option value="count_within">Jumlah Objek dalam Radius X meter</option>
                <option value="raster_value">Nilai Piksel Raster Lokal di Lokasi</option>
                <option value="gee_zonal">Dari Katalog Bumi (Satelit Earth Engine)</option>
                <option value="spatial_lag">Spatial Lag (Rata-rata 5 Tetangga Terdekat)</option>
                <option value="geometry_metrics">Luas (km²) & Keliling (km)</option>
                <option value="coordinates">Koordinat Lintang & Bujur</option>
              </select>
            </div>

            {builderType === 'gee_zonal' && (
              <div>
                <label className="block mb-1">Dataset Satelit Katalog Bumi (Zonal Langsung)</label>
                <select
                  value={builderGeePreset}
                  onChange={(e) => setBuilderGeePreset(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                >
                  <option value="gee.ndvi">Kehijauan Vegetasi (NDVI Sentinel-2)</option>
                  <option value="gee.lst">Suhu Permukaan (LST Landsat 8/9)</option>
                  <option value="gee.dem">Ketinggian Tanah (DEM Copernicus)</option>
                  <option value="gee.builtup">Kepadatan Bangunan (NDBI)</option>
                  <option value="gee.rainfall">Curah Hujan (CHIRPS)</option>
                  <option value="gee.nightlights">Cahaya Malam (VIIRS)</option>
                  <option value="gee.water">Okurensi Air Permukaan (JRC)</option>
                </select>
              </div>
            )}

            {(builderType === 'distance_to' || builderType === 'count_within') && (
              <div>
                <label className="block font-normal mb-1">Layer Tujuan</label>
                <select
                  value={builderTargetLayerId}
                  onChange={(e) => setBuilderTargetLayerId(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                >
                  {vectorLayers
                    .filter((l) => l.id !== trainLayer.id)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {builderType === 'count_within' && (
              <div>
                <label className="block font-normal mb-1">Radius (meter)</label>
                <input
                  type="number"
                  value={builderRadiusM}
                  onChange={(e) => setBuilderRadiusM(Number(e.target.value))}
                  className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                />
              </div>
            )}

            <button
              onClick={handleAddSpatialFeature}
              disabled={buildingFeature}
              className="w-full py-2 rounded bg-teal-700 hover:bg-teal-800 text-white font-normal"
            >
              {buildingFeature ? 'Menghitung...' : '+ Hitung & Tambahkan ke Fitur'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: VALIDASI SPASIAL */}
      {step === 4 && (
        <div className="p-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 max-w-3xl">
          <h2 className="text-base font-medium tracking-tight">④ Bagaimana data dibagi untuk menguji kejujuran model?</h2>

          <div className="p-3.5 rounded bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 leading-relaxed">
             <b>Mengapa Spatial Block Cross-Validation penting?</b> Data geospasial yang berdekatan cenderung mirip
            (Hukum Pertama Geografi Tobler). Jika data dibagi acak, model terlihat lebih pintar daripada aslinya karena
            menyontek tetangga sebelahnya. Pembagian per blok wilayah memberi nilai akurasi yang jauh lebih jujur.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { id: 'spatial_block', title: 'Per Blok Wilayah (Disarankan)', desc: 'Spatial Block K-Fold' },
              { id: 'random', title: 'Acak Standar', desc: 'Random K-Fold' },
              { id: 'group', title: 'Per Kelompok Kolom', desc: 'Group K-Fold (mis: Wilayah)' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setCvMethod(opt.id as any)}
                className={`p-3 rounded border text-left ${
 cvMethod === opt.id
 ? 'border-teal-700 bg-teal-50/50 dark:bg-teal-950/40 font-normal'
 : 'border-slate-200 dark:border-slate-700'
 }`}
              >
                <div>{opt.title}</div>
                <div className="text-[11px] text-slate-400 font-normal">{opt.desc}</div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {cvMethod === 'spatial_block' && (
              <div>
                <label className="block font-normal mb-1">Ukuran Blok Wilayah (meter)</label>
                <input
                  type="number"
                  value={blockSizeM}
                  onChange={(e) => setBlockSizeM(Number(e.target.value))}
                  className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                />
              </div>
            )}
            <div>
              <label className="block font-normal mb-1">Jumlah Lipatan Pengujian (K-Folds)</label>
              <input
                type="number"
                min={2}
                max={10}
                value={nSplits}
                onChange={(e) => setNSplits(Number(e.target.value))}
                className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
              />
            </div>
          </div>

          {cvMethod === 'spatial_block' && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePreviewSpatialCV}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded border border-teal-400 text-teal-800 dark:text-teal-300 font-normal"
              >
                <Eye className="w-4 h-4" /> Pratinjau Kotak Blok Fold di Peta
              </button>
              {cvFoldSummary.length > 0 && (
                <div className="flex items-center gap-2 text-[11px]">
                  {cvFoldSummary.map((f) => (
                    <span key={f.fold} className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900 font-normal">
                      Fold {f.fold}: {f.count} fitur
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between pt-3">
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 rounded border border-slate-300 dark:border-slate-600 font-normal"
            >
              ← Kembali
            </button>
            <button
              onClick={() => setStep(5)}
              className="px-5 py-2.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-medium tracking-tight"
            >
              Lanjut ke Training →
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: TRAINING */}
      {step === 5 && (
        <div className="p-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 max-w-3xl">
          <h2 className="text-base font-medium tracking-tight">⑤ Pilih Algoritma & Jalankan Training</h2>

          <div>
            <label className="block font-normal mb-1">Nama Model</label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent font-normal"
            />
          </div>

          {task === 'clustering' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-normal mb-1">Algoritma Clustering</label>
                <select
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value)}
                  className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                >
                  <option value="kmeans">K-Means Clustering</option>
                  <option value="dbscan">DBSCAN (Berbasis Kepadatan)</option>
                </select>
              </div>
              <div>
                <label className="block font-normal mb-1">Jumlah Kelompok (Klaster)</label>
                <input
                  type="number"
                  min={2}
                  max={12}
                  value={nClusters}
                  onChange={(e) => setNClusters(Number(e.target.value))}
                  className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  id: 'seimbang',
                  title: 'Seimbang (Disarankan)',
                  sub: 'Random Forest (200 Pohon)',
                  desc: 'Tangguh terhadap pencilan, tidak mudah overfit, dan menangkap hubungan non-linear.',
                },
                {
                  id: 'cepat',
                  title: 'Cepat & Sederhana',
                  sub: task === 'regression' ? 'Ridge Linear Regression' : 'Logistic Regression',
                  desc: 'Sangat cepat untuk melihat hubungan garis lurus antar-faktor.',
                },
                {
                  id: 'akurat',
                  title: 'Paling Akurat (Boosting)',
                  sub: 'Histogram Gradient Boosting',
                  desc: 'Ensemble pohon bertingkat untuk akurasi tabular maksimum.',
                },
              ].map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => setAlgorithm(preset.id)}
                  className={`p-3.5 rounded-md border cursor-pointer transition ${
 algorithm === preset.id
 ? 'border-teal-700 bg-teal-50/50 dark:bg-teal-950/40'
 : 'border-slate-200 dark:border-slate-700'
 }`}
                >
                  <div className="font-medium tracking-tight text-sm">{preset.title}</div>
                  <div className="text-[11px] text-teal-700 font-normal">{preset.sub}</div>
                  <p className="text-[11px] text-slate-500 mt-1.5">{preset.desc}</p>
                </div>
              ))}
            </div>
          )}

          {mode === 'lanjut' && task !== 'clustering' && (
            <div className="p-3.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="font-normal text-slate-700 dark:text-slate-200">Opsi Mode Lanjut</div>
              <div className="flex flex-wrap items-center gap-4">
                <select
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value)}
                  className="p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                >
                  <option value="seimbang">Random Forest</option>
                  <option value="extra_trees">Extra Trees</option>
                  <option value="akurat">Gradient Boosting (HistGBM)</option>
                  <option value="cepat">Linear / Logistic</option>
                  <option value="svm">Support Vector Machine (SVM)</option>
                  <option value="knn">K-Nearest Neighbors (KNN)</option>
                  <option value="mlp">Neural Network (MLP)</option>
                </select>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoTune}
                    onChange={(e) => setAutoTune(e.target.checked)}
                    className="rounded accent-teal-700"
                  />
                  <span>Hyperparameter Tuning Otomatis (RandomizedSearchCV)</span>
                </label>
                {task === 'classification' && (
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={balanceClasses}
                      onChange={(e) => setBalanceClasses(e.target.checked)}
                      className="rounded accent-teal-700"
                    />
                    <span>Seimbangkan Bobot Kelas (class_weight="balanced")</span>
                  </label>
                )}
              </div>
            </div>
          )}

          {activeTrainJob && (
            <div className="p-3.5 rounded bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-teal-800 dark:text-teal-200">
                  {activeTrainJob.status === 'failed'
                    ? 'Training gagal'
                    : activeTrainJob.message || 'Sedang melatih & memvalidasi model...'}
                </span>
                <span className="font-mono tabular-nums text-teal-700">{Math.round(activeTrainJob.progress || 0)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-sm bg-teal-200/70 dark:bg-slate-700 overflow-hidden">
                <div
                  className={`h-full transition-all ${activeTrainJob.status === 'failed' ? 'bg-rose-500' : 'bg-teal-700'}`}
                  style={{ width: `${Math.max(8, activeTrainJob.progress || 0)}%` }}
                />
              </div>
              {activeTrainJob.error_user && (
                <div className="text-[11px] text-rose-600">{activeTrainJob.error_user}</div>
              )}
            </div>
          )}

          <div className="flex justify-between pt-3">
            <button
              onClick={() => setStep(4)}
              className="px-4 py-2 rounded border border-slate-300 dark:border-slate-600 font-normal"
            >
              ← Kembali
            </button>
            <button
              onClick={handleStartTraining}
              disabled={activeTrainJob?.status === 'running' || activeTrainJob?.status === 'queued'}
              className="flex items-center gap-2 px-6 py-3 rounded bg-teal-700 hover:bg-teal-800 text-white font-medium tracking-tight shadow-sm disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {activeTrainJob?.status === 'running' || activeTrainJob?.status === 'queued'
                  ? 'Sedang Melatih Model...'
                  : 'Latih Model & Buat Peta Prediksi'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: HASIL, RAPOR MODEL, FEATURE IMPORTANCE & PREDIKSI */}
      {step === 6 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Model Registry List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium tracking-tight text-sm"> Registri Model Proyek ({models.length})</h3>
              <button
                onClick={() => setStep(1)}
                className="text-xs font-normal text-teal-700 hover:underline"
              >
                + Latih Model Baru
              </button>
            </div>

            {models.length === 0 ? (
              <div className="p-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 text-center space-y-2">
                <p className="text-slate-500">Belum ada model yang selesai dilatih.</p>
                <button
                  onClick={() => setStep(5)}
                  className="px-4 py-2 rounded bg-teal-700 text-white font-normal"
                >
                  Ke Langkah Training
                </button>
              </div>
            ) : (
              models.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedModelId(m.id)}
                  className={`p-3.5 rounded-md border cursor-pointer transition ${
 activeModel?.id === m.id
 ? 'border-teal-700 bg-teal-50/50 dark:bg-teal-950/40 shadow-sm'
 : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
 }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-normal text-sm">{m.name}</span>
                    <span className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 font-normal text-[10px]">
                      {m.task}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {m.algorithm} · Target: <b>{m.card?.target_column || 'Klaster'}</b>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right: Active Model Report Card */}
          {activeModel && (
            <div className="lg:col-span-2 space-y-4">
              <div className="p-5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-normal uppercase tracking-wider text-teal-700">
                      Rapor Evaluasi Model Spasial
                    </span>
                    <h2 className="text-lg font-medium tracking-tight">{activeModel.name}</h2>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeModel.card?.prediction_layer_id && (
                      <button
                        onClick={() => {
                          setActiveLayerId(activeModel.card.prediction_layer_id);
                          setActiveTab('map');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-teal-700 text-white font-normal"
                      >
                        <Eye className="w-3.5 h-3.5" /> Lihat Peta Prediksi & Residual
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        const res = await api.exportModelNotebook(activeModel.id, projectId);
                        const blob = new Blob([JSON.stringify(res.notebook, null, 2)], {
                          type: 'application/json',
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = res.filename;
                        a.click();
                        addToast({ type: 'success', title: `Notebook '${res.filename}' berhasil diunduh!` });
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 font-normal"
                    >
                      <Code className="w-3.5 h-3.5" /> Ekspor Jupyter (.ipynb)
                    </button>
                  </div>
                </div>

                {/* Plain-language Narrative Box */}
                <div className="p-4 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 text-xs leading-relaxed font-medium">
                   <b>Artinya dalam bahasa sederhana:</b> {activeModel.metrics?.narrative}
                </div>

                {/* Metric KPI Badges */}
                {activeModel.task === 'regression' && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded bg-slate-50 dark:bg-slate-700/50">
                      <div className="text-[10px] text-slate-400 uppercase font-normal">RMSE (Rata2 Meleset)</div>
                      <div className="text-xl font-medium tracking-tight text-slate-900 dark:text-white tabular-nums">
                        ±{formatNumber(activeModel.metrics?.rmse, 3)}
                      </div>
                    </div>
                    <div className="p-3 rounded bg-slate-50 dark:bg-slate-700/50">
                      <div className="text-[10px] text-slate-400 uppercase font-normal">MAE (Error Absolut)</div>
                      <div className="text-xl font-medium tracking-tight text-slate-900 dark:text-white tabular-nums">
                        ±{formatNumber(activeModel.metrics?.mae, 3)}
                      </div>
                    </div>
                    <div className="p-3 rounded bg-slate-50 dark:bg-slate-700/50">
                      <div className="text-[10px] text-slate-400 uppercase font-normal">Skor R² (Variasi Dijelaskan)</div>
                      <div className="text-xl font-medium tracking-tight text-teal-700 tabular-nums">
                        {formatNumber((activeModel.metrics?.r2 || 0) * 100, 1)}%
                      </div>
                    </div>
                  </div>
                )}

                {activeModel.task === 'classification' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded bg-slate-50 dark:bg-slate-700/50">
                      <div className="text-[10px] text-slate-400 uppercase font-normal">Akurasi Spatial CV</div>
                      <div className="text-xl font-medium tracking-tight text-emerald-600 tabular-nums">
                        {formatNumber((activeModel.metrics?.accuracy || 0) * 100, 1)}%
                      </div>
                    </div>
                    <div className="p-3 rounded bg-slate-50 dark:bg-slate-700/50">
                      <div className="text-[10px] text-slate-400 uppercase font-normal">Skor F1 Weighted</div>
                      <div className="text-xl font-medium tracking-tight text-teal-700 tabular-nums">
                        {formatNumber(activeModel.metrics?.f1, 3)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Feature Importance Bars */}
                {activeModel.metrics?.feature_importance?.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="font-normal text-slate-700 dark:text-slate-200">
                       Faktor Terpenting (Permutation Feature Importance)
                    </h4>
                    <div className="space-y-1.5">
                      {activeModel.metrics.feature_importance.map((fi: any) => (
                        <div key={fi.feature} className="space-y-0.5">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-normal">{fi.feature}</span>
                            <span className="tabular-nums font-normal text-teal-700">{fi.importance_pct}%</span>
                          </div>
                          <div className="w-full h-2 rounded-sm bg-slate-100 dark:bg-slate-700 overflow-hidden">
                            <div
                              className="h-full bg-teal-700 rounded-sm"
                              style={{ width: `${Math.max(4, fi.importance_pct)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Apply Model Prediction to Another Layer */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block font-normal mb-1">Terapkan Prediksi Model Ini ke Layer Lain:</label>
                    <select
                      value={predictTargetLayerId}
                      onChange={(e) => setPredictTargetLayerId(e.target.value)}
                      className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                    >
                      <option value="">-- Pilih Layer Target Prediksi --</option>
                      {layers
                        .filter((l) => l.kind !== 'table')
                        .map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name} ({l.kind})
                          </option>
                        ))}
                    </select>
                  </div>
                  <button
                    disabled={!predictTargetLayerId}
                    onClick={async () => {
                      await api.predictModel(activeModel.id, {
                        project_id: projectId,
                        target_layer_id: predictTargetLayerId,
                      });
                      addToast({ type: 'info', title: 'Menjalankan prediksi ke layer baru...' });
                    }}
                    className="px-4 py-2 rounded bg-slate-900 dark:bg-teal-700 text-white font-normal disabled:opacity-40"
                  >
                    ▶ Prediksi ke Peta
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
