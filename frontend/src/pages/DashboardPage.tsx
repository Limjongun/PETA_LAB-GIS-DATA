import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Compass,
  Download,
  Layers,
  MapPin,
  Printer,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client';
import { COLOR_PALETTES, formatNumber } from '../lib/format';
import { usePetaStore } from '../stores/usePetaStore';

export const DashboardPage: React.FC = () => {
  const {
    projectId,
    layers,
    activeLayerId,
    selectionsByLayer,
    models,
    theme,
    setActiveLayerId,
    setLayerSelection,
    clearLayerSelection,
    addToast,
  } = usePetaStore();

  const activeLayer =
    layers.find((l) => l.id === activeLayerId && l.kind !== 'raster') ||
    layers.find((l) => l.kind === 'vector') ||
    layers[0] ||
    null;

  const selectedFids = (activeLayer && selectionsByLayer[activeLayer.id]) || [];

  const [stats, setStats] = useState<any | null>(null);
  const [numCol, setNumCol] = useState<string>('');
  const [catCol, setCatCol] = useState<string>('');
  const [scatterX, setScatterX] = useState<string>('');
  const [scatterY, setScatterY] = useState<string>('');
  const [labelCol, setLabelCol] = useState<string>('');
  const [rankMode, setRankMode] = useState<'top' | 'bottom'>('top');

  const segBarChartRef = useRef<HTMLDivElement | null>(null);
  const boxChartRef = useRef<HTMLDivElement | null>(null);
  const spatialMapRef = useRef<HTMLDivElement | null>(null);
  const corrMatrixRef = useRef<HTMLDivElement | null>(null);
  const barChartRef = useRef<HTMLDivElement | null>(null);
  const histChartRef = useRef<HTMLDivElement | null>(null);
  const pieChartRef = useRef<HTMLDivElement | null>(null);
  const scatterChartRef = useRef<HTMLDivElement | null>(null);

  // Reset column selections whenever active layer switches so backend smart defaults kick in
  useEffect(() => {
    setNumCol('');
    setCatCol('');
    setScatterX('');
    setScatterY('');
    setLabelCol('');
  }, [activeLayer?.id]);

  // Dispose ECharts instances cleanly when unmounting DashboardPage
  useEffect(() => {
    return () => {
      [
        segBarChartRef,
        boxChartRef,
        spatialMapRef,
        corrMatrixRef,
        barChartRef,
        histChartRef,
        pieChartRef,
        scatterChartRef,
      ].forEach((ref) => {
        if (ref.current) {
          echarts.getInstanceByDom(ref.current)?.dispose();
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!activeLayer) return;
    let cancelled = false;
    const validCols = new Set((activeLayer.schema || []).map((s) => s.name));
    const safeNum = numCol && validCols.has(numCol) ? numCol : undefined;
    const safeCat = catCol && validCols.has(catCol) ? catCol : undefined;
    const safeSX = scatterX && validCols.has(scatterX) ? scatterX : undefined;
    const safeSY = scatterY && validCols.has(scatterY) ? scatterY : undefined;
    const safeLbl = labelCol && validCols.has(labelCol) ? labelCol : undefined;
    api
      .getLayerStats(activeLayer.id, {
        fids: selectedFids,
        column: safeNum,
        cat_col: safeCat,
        scatter_x: safeSX,
        scatter_y: safeSY,
        label_col: safeLbl,
        project_id: projectId,
      })
      .then((res) => {
        if (cancelled) return;
        setStats(res);
        if (!safeNum && res.histogram?.column) setNumCol(res.histogram.column);
        if (!safeCat && res.pie?.column) setCatCol(res.pie.column);
        if (!safeSX && res.scatter?.x_col) setScatterX(res.scatter.x_col);
        if (!safeSY && res.scatter?.y_col) setScatterY(res.scatter.y_col);
      })
      .catch((err) => {
        if (cancelled) return;
        addToast({ type: 'error', title: 'Gagal memuat statistik dashboard', message: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [activeLayer?.id, selectedFids.join(','), numCol, catCol, scatterX, scatterY, labelCol, projectId]);

  // Render all 8 dark/light theme-aware interactive ECharts widgets with Cross-Filter click handlers
  useEffect(() => {
    if (!stats || !activeLayer) return;

    const isDark = theme === 'dark';
    const textCol = isDark ? '#d8e4e6' : '#1e2f33';
    const subTextCol = isDark ? '#7f999c' : '#5a7478';
    const gridLineCol = isDark ? 'rgba(127,153,156,0.14)' : 'rgba(90,116,120,0.2)';
    const axisLineCol = isDark ? '#243438' : '#cbd5d6';
    const tooltipStyle = {
      backgroundColor: isDark ? '#0b1214' : '#ffffff',
      borderColor: isDark ? '#243438' : '#d3dfdf',
      textStyle: { color: isDark ? '#e6f0f0' : '#131d20', fontSize: 11 },
    };

    const instances: echarts.ECharts[] = [];
    const initChart = (el: HTMLDivElement | null) => {
      if (!el) return null;
      const inst = echarts.getInstanceByDom(el) || echarts.init(el);
      instances.push(inst);
      return inst;
    };

    // 1. Segment Comparative Bar + Mean Line Chart
    const segRows: any[] = stats.segment_breakdown?.rows || [];
    if (segBarChartRef.current && segRows.length > 0) {
      const ch = initChart(segBarChartRef.current)!;
      const hasMean = segRows.some((r) => r.mean !== undefined);
      ch.setOption(
        {
          tooltip: { trigger: 'axis', ...tooltipStyle },
          legend: {
            data: hasMean ? ['Jumlah Fitur', `Rata-rata ${stats.segment_breakdown?.metric || ''}`] : ['Jumlah Fitur'],
            top: 0,
            textStyle: { color: textCol, fontSize: 11 },
          },
          grid: { left: 42, right: hasMean ? 48 : 18, top: 34, bottom: 52 },
          xAxis: {
            type: 'category',
            data: segRows.map((r) => r.segment),
            axisLabel: { color: subTextCol, fontSize: 10, rotate: 16, width: 92, overflow: 'truncate' },
            axisLine: { lineStyle: { color: axisLineCol } },
          },
          yAxis: [
            {
              type: 'value',
              name: 'Fitur',
              nameTextStyle: { color: subTextCol, fontSize: 10 },
              axisLabel: { color: subTextCol, fontSize: 10 },
              splitLine: { lineStyle: { type: 'dashed', color: gridLineCol } },
            },
            ...(hasMean
              ? [
                  {
                    type: 'value',
                    name: 'Rata2',
                    nameTextStyle: { color: subTextCol, fontSize: 10 },
                    axisLabel: { color: subTextCol, fontSize: 10 },
                    splitLine: { show: false },
                  },
                ]
              : []),
          ],
          series: [
            {
              name: 'Jumlah Fitur',
              type: 'bar',
              barMaxWidth: 36,
              data: segRows.map((r, i) => ({
                value: r.count,
                fids: r.fids,
                itemStyle: {
                  color: r.selected_count > 0 ? '#f97316' : '#0f766e',
                  borderRadius: [2, 2, 0, 0],
                },
              })),
            },
            ...(hasMean
              ? [
                  {
                    name: `Rata-rata ${stats.segment_breakdown?.metric || ''}`,
                    type: 'line',
                    yAxisIndex: 1,
                    smooth: true,
                    symbolSize: 8,
                    data: segRows.map((r) => r.mean ?? 0),
                    lineStyle: { color: '#f97316', width: 2.5 },
                    itemStyle: { color: '#f97316' },
                  },
                ]
              : []),
          ],
        },
        true
      );
      ch.off('click');
      ch.on('click', (params: any) => {
        const fids: number[] = params.data?.fids || segRows[params.dataIndex]?.fids || [];
        if (fids.length > 0) setLayerSelection(activeLayer.id, fids, 'chart');
      });
    }

    // 2. Box Plot Distribusi Nilai per Segmen
    const boxRows = segRows.filter((r) => Array.isArray(r.boxplot) && r.boxplot.length === 5);
    if (boxChartRef.current && boxRows.length > 0) {
      const ch = initChart(boxChartRef.current)!;
      ch.setOption(
        {
          tooltip: {
            trigger: 'item',
            ...tooltipStyle,
            formatter: (p: any) => {
              const v = p.value || [];
              return `<b>${p.name}</b><br/>Max: ${v[5]}<br/>Q3: ${v[4]}<br/>Median: ${v[3]}<br/>Q1: ${v[2]}<br/>Min: ${v[1]}`;
            },
          },
          grid: { left: 46, right: 18, top: 20, bottom: 52 },
          xAxis: {
            type: 'category',
            data: boxRows.map((r) => r.segment),
            axisLabel: { color: subTextCol, fontSize: 10, rotate: 16, width: 92, overflow: 'truncate' },
            axisLine: { lineStyle: { color: axisLineCol } },
          },
          yAxis: {
            type: 'value',
            axisLabel: { color: subTextCol, fontSize: 10 },
            splitLine: { lineStyle: { type: 'dashed', color: gridLineCol } },
          },
          series: [
            {
              name: stats.segment_breakdown?.metric || 'Distribusi',
              type: 'boxplot',
              data: boxRows.map((r, i) => ({
                value: r.boxplot,
                fids: r.fids,
                itemStyle: {
                  color: isDark ? 'rgba(15,118,110,0.24)' : 'rgba(15,118,110,0.14)',
                  borderColor: i % 2 === 0 ? '#14b8a6' : '#f97316',
                  borderWidth: 1.5,
                },
              })),
            },
          ],
        },
        true
      );
      ch.off('click');
      ch.on('click', (params: any) => {
        const fids: number[] = params.data?.fids || boxRows[params.dataIndex]?.fids || [];
        if (fids.length > 0) setLayerSelection(activeLayer.id, fids, 'chart');
      });
    }

    // 3. 2D Spatial Distribution Map Plot (Long x Lat colored by Segment, sized by Metric + Mean Center)
    const spPts: any[] = stats.spatial_scatter?.points || [];
    const spSegs: string[] = stats.spatial_scatter?.segments || [];
    if (spatialMapRef.current && spPts.length > 0) {
      const ch = initChart(spatialMapRef.current)!;
      const vals = spPts.map((p) => p.value);
      const vmin = Math.min(...vals);
      const vmax = Math.max(...vals);
      const seriesList: any[] = spSegs.map((seg, idx) => ({
        name: seg,
        type: 'scatter',
        symbolSize: (d: any) => {
          const val = d[2] ?? vmin;
          if (vmax <= vmin) return 9;
          return 7 + ((val - vmin) / (vmax - vmin)) * 13;
        },
        itemStyle: {
          color: COLOR_PALETTES.categorical[idx % COLOR_PALETTES.categorical.length],
          opacity: 0.85,
          borderColor: isDark ? '#0b1214' : '#ffffff',
          borderWidth: 1,
        },
        data: spPts
          .filter((p) => p.segment === seg)
          .map((p) => ({
            value: [p.lon, p.lat, p.value],
            fid: p.fid,
            label: p.label,
            itemStyle: p.selected ? { color: '#f97316', borderColor: '#0b1214', borderWidth: 2 } : undefined,
          })),
      }));
      if (stats.spatial_scatter?.mean_center) {
        seriesList.push({
          name: 'Pusat Sebaran (Mean Center)',
          type: 'scatter',
          symbol: 'diamond',
          symbolSize: 15,
          itemStyle: { color: '#ea580c', borderColor: '#ffffff', borderWidth: 1.5 },
          data: [{ value: [...stats.spatial_scatter.mean_center, 0], label: 'Mean Center' }],
        });
      }
      ch.setOption(
        {
          tooltip: {
            trigger: 'item',
            ...tooltipStyle,
            formatter: (p: any) =>
              `<b>${p.seriesName}</b><br/>${p.data?.label || ''}<br/>Long: ${p.value[0]} · Lat: ${p.value[1]}<br/>${numCol || 'Nilai'}: ${p.value[2]}`,
          },
          legend: {
            type: 'scroll',
            top: 0,
            textStyle: { color: textCol, fontSize: 10 },
            pageTextStyle: { color: subTextCol },
          },
          grid: { left: 54, right: 18, top: 34, bottom: 34 },
          xAxis: {
            type: 'value',
            name: 'Bujur (Long)',
            nameLocation: 'middle',
            nameGap: 20,
            nameTextStyle: { color: subTextCol, fontSize: 10 },
            scale: true,
            axisLabel: { color: subTextCol, fontSize: 10 },
            splitLine: { lineStyle: { type: 'dashed', color: gridLineCol } },
          },
          yAxis: {
            type: 'value',
            name: 'Lintang (Lat)',
            nameTextStyle: { color: subTextCol, fontSize: 10 },
            scale: true,
            axisLabel: { color: subTextCol, fontSize: 10 },
            splitLine: { lineStyle: { type: 'dashed', color: gridLineCol } },
          },
          series: seriesList,
        },
        true
      );
      ch.off('click');
      ch.on('click', (params: any) => {
        const fid = params.data?.fid;
        if (fid) {
          const next = selectedFids.includes(fid) ? selectedFids.filter((x) => x !== fid) : [...selectedFids, fid];
          setLayerSelection(activeLayer.id, next, 'chart');
        }
      });
    }

    // 4. Pearson Correlation Matrix Heatmap
    const corrCols: string[] = stats.correlation_matrix?.columns || [];
    const corrCells: any[] = stats.correlation_matrix?.cells || [];
    if (corrMatrixRef.current && corrCols.length >= 2) {
      const ch = initChart(corrMatrixRef.current)!;
      ch.setOption(
        {
          tooltip: {
            position: 'top',
            ...tooltipStyle,
            formatter: (p: any) =>
              `${corrCols[p.value[0]]} × ${corrCols[p.value[1]]}<br/>Korelasi Pearson r = <b>${p.value[2]}</b>`,
          },
          grid: { left: 76, right: 44, top: 14, bottom: 58 },
          xAxis: {
            type: 'category',
            data: corrCols,
            axisLabel: { color: subTextCol, fontSize: 10, rotate: 28, width: 70, overflow: 'truncate' },
            splitArea: { show: true },
          },
          yAxis: {
            type: 'category',
            data: corrCols,
            axisLabel: { color: subTextCol, fontSize: 10, width: 70, overflow: 'truncate' },
            splitArea: { show: true },
          },
          visualMap: {
            min: -1,
            max: 1,
            calculable: false,
            orient: 'vertical',
            right: 2,
            top: 'middle',
            itemWidth: 10,
            itemHeight: 110,
            textStyle: { color: subTextCol, fontSize: 10 },
            inRange: { color: ['#0f766e', '#5eead4', isDark ? '#131d20' : '#f4f7f7', '#fdba74', '#ea580c'] },
          },
          series: [
            {
              type: 'heatmap',
              data: corrCells,
              label: { show: true, fontSize: 10, color: isDark ? '#f4f7f7' : '#0b1214' },
            },
          ],
        },
        true
      );
    }

    // 5. Top-10 / Bottom-5 Bar Chart
    const rankList = rankMode === 'top' ? stats.top_n || [] : stats.bottom_n || [];
    if (barChartRef.current && rankList.length > 0) {
      const ch = initChart(barChartRef.current)!;
      const items = [...rankList].reverse();
      ch.setOption(
        {
          tooltip: { trigger: 'axis', ...tooltipStyle },
          grid: { left: 112, right: 24, top: 14, bottom: 24 },
          xAxis: {
            type: 'value',
            axisLabel: { color: subTextCol, fontSize: 10 },
            splitLine: { lineStyle: { type: 'dashed', color: gridLineCol } },
          },
          yAxis: {
            type: 'category',
            data: items.map((d: any) => d.label),
            axisLabel: { color: textCol, width: 100, overflow: 'truncate', fontSize: 10 },
            axisLine: { lineStyle: { color: axisLineCol } },
          },
          series: [
            {
              type: 'bar',
              data: items.map((d: any) => ({
                value: d.value,
                fid: d.fid,
                itemStyle: {
                  color: d.selected ? '#f97316' : rankMode === 'top' ? '#0f766e' : '#ea580c',
                  borderRadius: [0, 2, 2, 0],
                },
              })),
            },
          ],
        },
        true
      );
      ch.off('click');
      ch.on('click', (params: any) => {
        const fid = params.data?.fid;
        if (fid) {
          const next = selectedFids.includes(fid) ? selectedFids.filter((x) => x !== fid) : [...selectedFids, fid];
          setLayerSelection(activeLayer.id, next, 'chart');
        }
      });
    }

    // 6. Histogram Sebaran (Clean blue bars + amber overlay ONLY when features are selected!)
    if (histChartRef.current && stats.histogram?.bins?.length > 0) {
      const ch = initChart(histChartRef.current)!;
      const hasSelection = selectedFids.length > 0;
      ch.setOption(
        {
          tooltip: { trigger: 'axis', ...tooltipStyle },
          legend: {
            data: hasSelection ? ['Semua Fitur', 'Fitur Terpilih'] : ['Semua Fitur'],
            top: 0,
            textStyle: { color: textCol, fontSize: 11 },
          },
          grid: { left: 40, right: 16, top: 30, bottom: 48 },
          xAxis: {
            type: 'category',
            data: stats.histogram.bins,
            axisLabel: { rotate: 28, fontSize: 10, color: subTextCol },
            axisLine: { lineStyle: { color: axisLineCol } },
          },
          yAxis: {
            type: 'value',
            axisLabel: { color: subTextCol, fontSize: 10 },
            splitLine: { lineStyle: { type: 'dashed', color: gridLineCol } },
          },
          series: [
            {
              name: 'Semua Fitur',
              type: 'bar',
              data: stats.histogram.counts_all,
              itemStyle: { color: hasSelection ? '#3f565a' : '#0d9488', borderRadius: [2, 2, 0, 0] },
            },
            ...(hasSelection
              ? [
                  {
                    name: 'Fitur Terpilih',
                    type: 'bar',
                    barGap: '-100%',
                    data: stats.histogram.counts_selected,
                    itemStyle: { color: '#f97316', borderRadius: [2, 2, 0, 0] },
                  },
                ]
              : []),
          ],
        },
        true
      );
    }

    // 7. Pie / Donut Proporsi Kategori
    if (pieChartRef.current && stats.pie?.data?.length > 0) {
      const ch = initChart(pieChartRef.current)!;
      ch.setOption(
        {
          tooltip: { trigger: 'item', ...tooltipStyle, formatter: '{b}: {c} ({d}%)' },
          color: COLOR_PALETTES.categorical,
          series: [
            {
              type: 'pie',
              radius: ['42%', '72%'],
              itemStyle: { borderRadius: 3, borderColor: isDark ? '#131d20' : '#ffffff', borderWidth: 2 },
              label: { fontSize: 11, color: textCol },
              data: stats.pie.data,
            },
          ],
        },
        true
      );
      ch.off('click');
      ch.on('click', (params: any) => {
        const fids: number[] = params.data?.fids || [];
        if (fids.length > 0) setLayerSelection(activeLayer.id, fids, 'chart');
      });
    }

    // 8. Scatter Plot X vs Y + Trendline Regresi
    if (scatterChartRef.current && stats.scatter?.points?.length > 0) {
      const ch = initChart(scatterChartRef.current)!;
      ch.setOption(
        {
          tooltip: {
            trigger: 'item',
            ...tooltipStyle,
            formatter: (p: any) => `${p.data?.label || ''}<br/>X: ${p.value[0]}<br/>Y: ${p.value[1]}`,
          },
          grid: { left: 48, right: 20, top: 18, bottom: 34 },
          xAxis: {
            type: 'value',
            name: stats.scatter.x_col,
            nameLocation: 'middle',
            nameGap: 20,
            nameTextStyle: { color: subTextCol, fontSize: 10 },
            axisLabel: { color: subTextCol, fontSize: 10 },
            splitLine: { lineStyle: { type: 'dashed', color: gridLineCol } },
            scale: true,
          },
          yAxis: {
            type: 'value',
            name: stats.scatter.y_col,
            nameTextStyle: { color: subTextCol, fontSize: 10 },
            axisLabel: { color: subTextCol, fontSize: 10 },
            splitLine: { lineStyle: { type: 'dashed', color: gridLineCol } },
            scale: true,
          },
          series: [
            {
              type: 'scatter',
              symbolSize: 9,
              data: stats.scatter.points.map((pt: any) => ({
                value: [pt.x, pt.y],
                fid: pt.fid,
                label: pt.label,
                itemStyle: { color: pt.selected ? '#f97316' : '#14b8a6' },
              })),
            },
            ...(stats.scatter.trendline?.length === 2
              ? [
                  {
                    type: 'line',
                    data: stats.scatter.trendline,
                    showSymbol: false,
                    lineStyle: { color: '#ea580c', width: 2, type: 'dashed' },
                  },
                ]
              : []),
          ],
        },
        true
      );
      ch.off('click');
      ch.on('click', (params: any) => {
        const fid = params.data?.fid;
        if (fid) {
          const next = selectedFids.includes(fid) ? selectedFids.filter((x) => x !== fid) : [...selectedFids, fid];
          setLayerSelection(activeLayer.id, next, 'chart');
        }
      });
    }

    const handleResize = () => instances.forEach((inst) => inst.resize());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [stats, activeLayer?.id, selectedFids.join(','), theme, rankMode]);

  if (!activeLayer) {
    return <div className="p-8 text-sm text-slate-500">Belum ada layer untuk ditampilkan di Dashboard.</div>;
  }

  const kpi = stats?.kpi || {};
  const sp = stats?.spatial_metrics || {};
  const hStats = stats?.histogram?.stats || {};
  const numCols: string[] = stats?.numeric_columns || [];
  const strCols: string[] = stats?.string_columns || [];
  const segRows: any[] = stats?.segment_breakdown?.rows || [];
  const insights: string[] = stats?.insights || [];
  const isPointLike = sp.geom_kind === 'point';

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5 max-w-7xl mx-auto text-xs">
      {/* Header Bar with Global Metric & Segment Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-700" />
            <h1 className="text-base font-medium tracking-tight">Dashboard Analitik Spasial</h1>
          </div>

          <select
            value={activeLayer.id}
            onChange={(e) => setActiveLayerId(e.target.value)}
            className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-normal"
          >
            {layers
              .filter((l) => l.kind !== 'raster')
              .map((l) => (
                <option key={l.id} value={l.id} className="dark:bg-slate-800">
                  Layer: {l.name} ({l.feature_count})
                </option>
              ))}
          </select>

          {numCols.length > 0 && (
            <select
              value={numCol}
              onChange={(e) => setNumCol(e.target.value)}
              className="px-2.5 py-1.5 rounded border border-teal-300 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300"
              title="Kolom angka utama yang dianalisis di seluruh Dashboard"
            >
              {numCols.map((c) => (
                <option key={c} value={c} className="dark:bg-slate-800">
                  Metrik: {c}
                </option>
              ))}
            </select>
          )}

          {(strCols.length > 0 || numCols.length > 0) && (
            <select
              value={catCol}
              onChange={(e) => setCatCol(e.target.value)}
              className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
              title="Kolom segmen / kategori pengelompokan"
            >
              {[...strCols, ...numCols].map((c) => (
                <option key={c} value={c} className="dark:bg-slate-800">
                  Segmen: {c}
                </option>
              ))}
            </select>
          )}

          {selectedFids.length > 0 && (
            <button
              onClick={() => clearLayerSelection(activeLayer.id)}
              className="px-2.5 py-1 rounded-sm bg-orange-100 dark:bg-orange-950/60 text-orange-900 dark:text-orange-300 font-normal hover:bg-orange-200 dark:hover:bg-orange-900/60"
            >
              {selectedFids.length} Terpilih (Reset)
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hStats.outlier_count > 0 && (
            <button
              onClick={() => setLayerSelection(activeLayer.id, hStats.outlier_fids || [], 'chart')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-orange-50 dark:bg-orange-950/50 border border-orange-300 dark:border-orange-800 text-orange-800 dark:text-orange-300"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Pilih {hStats.outlier_count} Outlier</span>
            </button>
          )}
          <button
            onClick={async () => {
              const res = await api.exportResource({
                project_id: projectId,
                export_type: 'layer',
                layer_id: activeLayer.id,
                format: 'xlsx',
                only_selected_fids: selectedFids.length > 0 ? selectedFids : undefined,
              });
              window.open(res.download_url, '_blank');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-teal-600/50 dark:border-teal-700 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/30"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel (.xlsx)</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-normal"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* 6 Context-Aware Spatial & Statistical KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Jumlah Fitur</span>
          <div className="text-xl font-medium tracking-tight text-slate-900 dark:text-white mt-1 tabular-nums">
            {formatNumber(kpi.feature_count)}
          </div>
          <div className="text-[11px] text-orange-500 mt-1 tabular-nums">
            {kpi.selected_count || 0} dipilih ({formatNumber(((kpi.selected_count || 0) / Math.max(1, kpi.feature_count || 1)) * 100, 1)}%)
          </div>
        </div>

        <div className="p-3.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider truncate block">
            Rata-Rata ({numCol || '—'})
          </span>
          <div className="text-xl font-medium tracking-tight text-teal-700 dark:text-teal-400 mt-1 tabular-nums">
            {hStats.mean !== undefined ? formatNumber(hStats.mean, 2) : '—'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            Total: {hStats.sum !== undefined ? formatNumber(hStats.sum, 1) : '—'} · Med: {hStats.median !== undefined ? formatNumber(hStats.median, 1) : '—'}
          </div>
        </div>

        <div className="p-3.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Sebaran &amp; Outlier</span>
          <div className="text-xl font-medium tracking-tight text-teal-700 dark:text-teal-400 mt-1 tabular-nums">
            σ {hStats.std !== undefined ? formatNumber(hStats.std, 2) : '—'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            CV {hStats.cv_pct ?? 0}% · {hStats.outlier_count ?? 0} outlier IQR
          </div>
        </div>

        <div className="p-3.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">
            {isPointLike ? 'Luas Cakupan Hull' : 'Luas Cakupan UTM'}
          </span>
          <div className="text-xl font-medium tracking-tight text-orange-600 dark:text-orange-400 mt-1 tabular-nums">
            {formatNumber(isPointLike ? sp.hull_area_km2 : kpi.area_km2 || sp.hull_area_km2, 1)}{' '}
            <span className="text-xs font-normal">km²</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {sp.span_width_km ?? 0} × {sp.span_height_km ?? 0} km · {sp.density_per_km2 ?? 0}/km²
          </div>
        </div>

        <div className="p-3.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Compass className="w-3 h-3 text-teal-600" /> Pola Spasial (NNI)
          </span>
          <div className="text-sm font-medium text-teal-700 dark:text-teal-400 mt-1.5 truncate" title={sp.spatial_pattern}>
            {sp.spatial_pattern || 'N/A'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {sp.nni_ratio !== null && sp.nni_ratio !== undefined
              ? `R = ${sp.nni_ratio} · NND ${formatNumber(sp.avg_nnd_m, 0)} m`
              : `Radius σ: ${sp.std_distance_km ?? 0} km`}
          </div>
        </div>

        <div className="p-3.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Kualitas &amp; CRS</span>
          <div className="text-xl font-medium tracking-tight text-slate-900 dark:text-white mt-1 tabular-nums">
            {formatNumber(kpi.missing_pct)}% <span className="text-xs font-normal text-slate-400">kosong</span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 truncate">
            <CheckCircle2 className="w-3 h-3 shrink-0" /> {kpi.invalid_geom_count || 0} rusak · {sp.utm_crs || '—'}
          </div>
        </div>
      </div>

      {/* Automatic Executive Insights Banner */}
      {insights.length > 0 && (
        <div className="p-4 rounded-md bg-teal-50/70 dark:bg-slate-800/90 border border-teal-200/80 dark:border-teal-900/70 space-y-1.5">
          <div className="flex items-center gap-1.5 text-teal-800 dark:text-teal-400 text-xs font-medium">
            <Sparkles className="w-4 h-4" />
            <span>Ringkasan Insight Otomatis ({activeLayer.name})</span>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-slate-700 dark:text-slate-300 list-disc list-inside leading-relaxed">
            {insights.map((ins, i) => (
              <li key={i}>{ins}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Row 1: Segment Comparison + Box Plot Distribution */}
      {segRows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="font-normal text-sm">Perbandingan Antar Segmen: {catCol}</h3>
                <p className="text-[11px] text-slate-400">
                  Batang = jumlah fitur · Garis oranye = rata-rata {numCol} (klik batang untuk memilih segmen)
                </p>
              </div>
              <Layers className="w-4 h-4 text-teal-600 shrink-0" />
            </div>
            <div ref={segBarChartRef} className="w-full h-64" />
          </div>

          <div className="p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="font-normal text-sm">Box Plot Distribusi {numCol} per {catCol}</h3>
                <p className="text-[11px] text-slate-400">
                  Membandingkan Min, Kuartil 1 (Q1), Median, Kuartil 3 (Q3), dan Maksimum tiap segmen
                </p>
              </div>
              <Activity className="w-4 h-4 text-teal-600 shrink-0" />
            </div>
            <div ref={boxChartRef} className="w-full h-64" />
          </div>
        </div>
      )}

      {/* Row 2: 2D Spatial Distribution Map + Pearson Correlation Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="font-normal text-sm">Peta Sebaran Spasial (Long × Lat) &amp; Mean Center</h3>
              <p className="text-[11px] text-slate-400">
                Warna = {catCol || 'Segmen'} · Ukuran titik = {numCol || 'Seragam'} · Wajik oranye = Pusat Sebaran
              </p>
            </div>
            <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
          </div>
          {stats?.spatial_scatter?.points?.length > 0 ? (
            <div ref={spatialMapRef} className="w-full h-72" />
          ) : (
            <div className="h-72 flex items-center justify-center text-slate-400">
              Layer ini belum memiliki geometri spasial.
            </div>
          )}
        </div>

        <div className="p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="mb-1">
            <h3 className="font-normal text-sm">Matriks Korelasi Pearson (r) Antar Kolom Numerik</h3>
            <p className="text-[11px] text-slate-400">
              Oranye = korelasi positif (+1) · Tosca = korelasi negatif (-1) · Cepat deteksi variabel berpengaruh
            </p>
          </div>
          {(stats?.correlation_matrix?.columns?.length || 0) >= 2 ? (
            <div ref={corrMatrixRef} className="w-full h-72" />
          ) : (
            <div className="h-72 flex items-center justify-center text-slate-400">
              Butuh minimal 2 kolom numerik untuk menghitung matriks korelasi.
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Histogram + Top 10 / Bottom 5 Ranking */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
          <div className="mb-2">
            <h3 className="font-normal text-sm">Histogram Distribusi: {numCol}</h3>
            {hStats.min !== undefined && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                Min: <b>{formatNumber(hStats.min)}</b> · Q1: <b>{formatNumber(hStats.q1)}</b> · Med:{' '}
                <b>{formatNumber(hStats.median)}</b> · Q3: <b>{formatNumber(hStats.q3)}</b> · Max:{' '}
                <b>{formatNumber(hStats.max)}</b> · Skew: <b>{hStats.skewness}</b>
              </p>
            )}
          </div>
          <div ref={histChartRef} className="w-full h-64" />
        </div>

        <div className="p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <h3 className="font-normal text-sm">
                {rankMode === 'top' ? 'Top 10 Nilai Tertinggi' : 'Bottom 5 Nilai Terendah'}
              </h3>
              <div className="flex rounded bg-slate-100 dark:bg-slate-700 p-0.5 text-[10px]">
                <button
                  onClick={() => setRankMode('top')}
                  className={`px-2 py-0.5 rounded ${rankMode === 'top' ? 'bg-teal-700 text-white' : 'text-slate-500 dark:text-slate-300'}`}
                >
                  Top 10
                </button>
                <button
                  onClick={() => setRankMode('bottom')}
                  className={`px-2 py-0.5 rounded ${rankMode === 'bottom' ? 'bg-orange-600 text-white' : 'text-slate-500 dark:text-slate-300'}`}
                >
                  Bottom 5
                </button>
              </div>
            </div>
            <select
              value={labelCol}
              onChange={(e) => setLabelCol(e.target.value)}
              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-transparent text-[11px]"
            >
              {strCols.map((c) => (
                <option key={c} value={c} className="dark:bg-slate-800">
                  Label: {c}
                </option>
              ))}
            </select>
          </div>
          <div ref={barChartRef} className="w-full h-64" />
        </div>
      </div>

      {/* Row 4: Pie Proportion + Scatter Plot X vs Y */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div>
              <h3 className="font-normal text-sm">Proporsi Segmen / Kategori ({catCol})</h3>
              <p className="text-[11px] text-slate-400">Klik irisan untuk langsung memilih seluruh fitur di segmen</p>
            </div>
          </div>
          <div ref={pieChartRef} className="w-full h-64" />
        </div>

        <div className="p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div>
              <h3 className="font-normal text-sm">
                Regresi Bivariat (r = <span className="text-teal-600 dark:text-teal-400 tabular-nums">{stats?.scatter?.r ?? 0}</span> · R² ={' '}
                <span className="text-orange-500 tabular-nums">{stats?.scatter?.r2 ?? 0}</span>)
              </h3>
              <p className="text-[11px] text-slate-400">Garis putus-putus oranye menunjukkan tren linear OLS</p>
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={scatterX}
                onChange={(e) => setScatterX(e.target.value)}
                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-transparent text-[11px]"
              >
                {numCols.map((c) => (
                  <option key={c} value={c} className="dark:bg-slate-800">
                    X: {c}
                  </option>
                ))}
              </select>
              <select
                value={scatterY}
                onChange={(e) => setScatterY(e.target.value)}
                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-transparent text-[11px]"
              >
                {numCols.map((c) => (
                  <option key={c} value={c} className="dark:bg-slate-800">
                    Y: {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div ref={scatterChartRef} className="w-full h-64" />
        </div>
      </div>

      {/* Row 5: Segment Comparative Summary Table (Interactive Cross-Filter per Segment) */}
      {segRows.length > 0 && (
        <div className="p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-normal text-sm">
                Tabel Ringkasan Statistik per Segmen ({catCol} × {numCol || 'Jumlah'})
              </h3>
              <p className="text-[11px] text-slate-400">
                Perbandingan lengkap jumlah, proporsi, total, rata-rata, median, rentang, dan simpangan baku tiap segmen
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse tabular-nums">
              <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-400 text-[11px]">
                <tr>
                  <th className="py-2 px-2.5">Segmen / Kategori</th>
                  <th className="py-2 px-2.5 text-right">Jumlah</th>
                  <th className="py-2 px-2.5 text-right">Proporsi</th>
                  <th className="py-2 px-2.5 text-right">Total</th>
                  <th className="py-2 px-2.5 text-right">Rata-rata</th>
                  <th className="py-2 px-2.5 text-right">Median</th>
                  <th className="py-2 px-2.5 text-right">Min – Max</th>
                  <th className="py-2 px-2.5 text-right">Std Dev (σ)</th>
                  <th className="py-2 px-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {segRows.map((row, idx) => (
                  <tr key={row.segment} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td className="py-2 px-2.5 flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: COLOR_PALETTES.categorical[idx % COLOR_PALETTES.categorical.length] }}
                      />
                      <span className="font-normal">{row.segment}</span>
                    </td>
                    <td className="py-2 px-2.5 text-right">{formatNumber(row.count)}</td>
                    <td className="py-2 px-2.5 text-right text-slate-500">{row.pct}%</td>
                    <td className="py-2 px-2.5 text-right">{row.sum !== undefined ? formatNumber(row.sum, 1) : '—'}</td>
                    <td className="py-2 px-2.5 text-right text-teal-700 dark:text-teal-400">
                      {row.mean !== undefined ? formatNumber(row.mean, 2) : '—'}
                    </td>
                    <td className="py-2 px-2.5 text-right">{row.median !== undefined ? formatNumber(row.median, 2) : '—'}</td>
                    <td className="py-2 px-2.5 text-right text-slate-500">
                      {row.min !== undefined ? `${formatNumber(row.min, 1)} – ${formatNumber(row.max, 1)}` : '—'}
                    </td>
                    <td className="py-2 px-2.5 text-right">{row.std !== undefined ? formatNumber(row.std, 2) : '—'}</td>
                    <td className="py-2 px-2.5 text-right">
                      <button
                        onClick={() => setLayerSelection(activeLayer.id, row.fids || [], 'chart')}
                        className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 hover:bg-teal-700 hover:text-white hover:border-teal-700 text-[10px] transition"
                      >
                        Pilih di Peta
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Row 6: Data Quality Audit & Latest Model Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="font-normal text-sm mb-2">Audit Kualitas Data per Kolom</h3>
          <div className="overflow-x-auto max-h-48">
            <table className="w-full text-left border-collapse">
              <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-400">
                <tr>
                  <th className="py-1.5 px-2">Kolom</th>
                  <th className="py-1.5 px-2">Tipe</th>
                  <th className="py-1.5 px-2 text-right">Nilai Unik</th>
                  <th className="py-1.5 px-2 text-right">Nilai Kosong</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {(stats?.quality?.columns || []).map((qc: any) => (
                  <tr key={qc.column}>
                    <td className="py-1.5 px-2 font-normal">{qc.column}</td>
                    <td className="py-1.5 px-2 text-slate-500">{qc.type}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{qc.unique_count}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {qc.null_count} ({qc.null_pct}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 font-normal text-sm mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Status Model Machine Learning</span>
            </div>
            {models.length > 0 ? (
              <div className="space-y-2">
                <div className="p-3 rounded bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800">
                  <div className="font-normal text-slate-900 dark:text-white">{models[0].name}</div>
                  <div className="text-[11px] text-teal-800 dark:text-teal-300 font-medium">
                    {models[0].algorithm} · Tugas: {models[0].task}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {models[0].metrics?.narrative}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                Belum ada model yang dilatih di proyek ini. Buka menu <b>Model ML</b> untuk membuat prediksi spasial.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
